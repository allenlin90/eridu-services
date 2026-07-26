import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { SCENE_MATERIAL_ALLOWED_MIME_TYPES } from '@eridu/api-types/scene-qc';

import {
  sceneMaterialDefaultInclude,
  SceneMaterialRepository,
} from './persistence/scene-material.repository';
import type {
  CreateSceneMaterialPayload,
  CreateSceneMaterialRevisionPayload,
  ListSceneMaterialsParams,
  UpdateSceneMaterialPayload,
} from './schemas/scene-material.schema';
import { SCENE_MATERIAL_REVISION_UID_PREFIX, SCENE_MATERIAL_UID_PREFIX } from './scene-qc-uid.util';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

type MaterialScope = {
  materialUid: string;
  clientUid: string;
};

const VERSION_CONFLICT_MESSAGE = 'Scene material is out of date. Please refresh and try again.';

/**
 * Service for Client-owned reusable Scene Material identities and their
 * immutable image revisions. See SCENE_QC_IMPLEMENTATION_PLAN.md §5.1.
 */
@Injectable()
export class SceneMaterialService extends BaseModelService {
  static readonly UID_PREFIX = SCENE_MATERIAL_UID_PREFIX;
  protected readonly uidPrefix = SceneMaterialService.UID_PREFIX;

  constructor(
    private readonly sceneMaterialRepository: SceneMaterialRepository,
    protected readonly uidGenerator: UidGeneratorService,
  ) {
    super(uidGenerator);
  }

  /**
   * Creates a material for a Client. The owning Client is assumed validated
   * by the caller (studio/Client-mechanic linkage checks happen upstream,
   * mirroring `ClientMechanicService.createMechanic`).
   */
  async createMaterial(clientUid: string, payload: CreateSceneMaterialPayload) {
    return this.sceneMaterialRepository.create(
      {
        uid: this.generateUid(),
        name: payload.name,
        client: { connect: { uid: clientUid } },
      },
      sceneMaterialDefaultInclude,
    );
  }

  /** Reads a Client-scoped material by UID. Returns `null` for not-found. */
  getMaterial(scope: MaterialScope) {
    return this.sceneMaterialRepository.findByUidForClient({
      uid: scope.materialUid,
      clientUid: scope.clientUid,
    });
  }

  /** Lists a Client's materials with pagination, status filter, and search. */
  listMaterials(params: ListSceneMaterialsParams) {
    return this.sceneMaterialRepository.findPaginated(params);
  }

  /**
   * Updates a material's name/status. Bumps the optimistic-lock `version` on
   * every change. Returns `null` for not-found; throws 409 on stale
   * `version`.
   */
  async updateMaterial(scope: MaterialScope, payload: UpdateSceneMaterialPayload) {
    const existing = await this.sceneMaterialRepository.findByUidForClient({
      uid: scope.materialUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }

    try {
      return await this.sceneMaterialRepository.updateWithVersionCheck(
        { uid: scope.materialUid, clientUid: scope.clientUid, version: payload.version },
        {
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.status !== undefined && { status: payload.status }),
          version: payload.version + 1,
        },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Retires a material (soft, reversible lifecycle). Idempotent: retiring an
   * already-retired material is a no-op that still returns the row. Returns
   * `null` for not-found; throws 409 when a concurrent edit raced the retire.
   */
  async retireMaterial(scope: MaterialScope) {
    const existing = await this.sceneMaterialRepository.findByUidForClient({
      uid: scope.materialUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }
    if (existing.status === 'RETIRED') {
      return existing;
    }

    try {
      return await this.sceneMaterialRepository.updateWithVersionCheck(
        { uid: scope.materialUid, clientUid: scope.clientUid, version: existing.version },
        { status: 'RETIRED', version: existing.version + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Soft-deletes a material. Returns `null` when it does not exist or is not
   * under the Client; throws 409 when a concurrent edit raced the delete.
   */
  async deleteMaterial(scope: MaterialScope) {
    const existing = await this.sceneMaterialRepository.findByUidForClient({
      uid: scope.materialUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }

    try {
      return await this.sceneMaterialRepository.updateWithVersionCheck(
        { uid: scope.materialUid, clientUid: scope.clientUid, version: existing.version },
        { deletedAt: new Date(), version: existing.version + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Appends an immutable image revision and bumps the material's semantic
   * `version` (a replace is a user-visible mutation, unlike upload
   * bookkeeping — see `database-patterns` §6). Never overwrites an earlier
   * object reference. `@Transactional()` because it writes two rows
   * (revision insert + material version bump) that must commit together.
   *
   * `actorUserUid` is optional and resolved to the revision's nullable
   * `created_by_id` — Child PR 1 has no controller to supply an authenticated
   * actor yet; Child PR 2 passes it from the request context.
   */
  @Transactional()
  async appendMaterialRevision(
    scope: MaterialScope,
    payload: CreateSceneMaterialRevisionPayload,
    actorUserUid?: string,
  ) {
    if (!(SCENE_MATERIAL_ALLOWED_MIME_TYPES as readonly string[]).includes(payload.mimeType)) {
      throw HttpError.badRequest(`Unsupported Scene Material MIME type: ${payload.mimeType}`);
    }

    const existing = await this.sceneMaterialRepository.findByUidForClient({
      uid: scope.materialUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }

    const createdById = actorUserUid
      ? await this.sceneMaterialRepository.resolveUserId(actorUserUid)
      : undefined;

    await this.sceneMaterialRepository.appendRevision({
      uid: this.uidGenerator.generateBrandedId(SCENE_MATERIAL_REVISION_UID_PREFIX),
      materialId: existing.id,
      objectKey: payload.objectKey,
      fileUrl: payload.fileUrl,
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
      ...(createdById !== undefined && { createdById }),
    });

    try {
      return await this.sceneMaterialRepository.updateWithVersionCheck(
        { uid: scope.materialUid, clientUid: scope.clientUid, version: payload.version },
        { version: payload.version + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }
}
