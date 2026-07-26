import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { SceneMaterialRepository } from './persistence/scene-material.repository';
import {
  sceneProfileDefaultInclude,
  SceneProfileRepository,
} from './persistence/scene-profile.repository';
import {
  resolveSceneProfile,
  selectApplicableMaterials,
} from './policies/scene-profile-resolution.policy';
import type {
  CreateSceneProfilePayload,
  ListSceneProfilesParams,
  SaveSceneProfileCompositionPayload,
  UpdateSceneProfilePayload,
} from './schemas/scene-profile.schema';
import { SCENE_PROFILE_REVISION_UID_PREFIX, SCENE_PROFILE_UID_PREFIX } from './scene-qc-uid.util';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

type ProfileScope = {
  profileUid: string;
  clientUid: string;
};

const VERSION_CONFLICT_MESSAGE = 'Scene profile is out of date. Please refresh and try again.';

/**
 * Service for Client-owned Scene Profiles: their composition revisions,
 * default resolution, and deterministic Show resolution. See
 * SCENE_QC_IMPLEMENTATION_PLAN.md §5.2.
 */
@Injectable()
export class SceneProfileService extends BaseModelService {
  static readonly UID_PREFIX = SCENE_PROFILE_UID_PREFIX;
  protected readonly uidPrefix = SceneProfileService.UID_PREFIX;

  constructor(
    private readonly sceneProfileRepository: SceneProfileRepository,
    private readonly sceneMaterialRepository: SceneMaterialRepository,
    protected readonly uidGenerator: UidGeneratorService,
  ) {
    super(uidGenerator);
  }

  /** Creates a profile for a Client. The owning Client is assumed validated by the caller. */
  async createProfile(clientUid: string, payload: CreateSceneProfilePayload) {
    return this.sceneProfileRepository.create(
      {
        uid: this.generateUid(),
        name: payload.name,
        description: payload.description,
        sceneType: payload.sceneType,
        client: { connect: { uid: clientUid } },
      },
      sceneProfileDefaultInclude,
    );
  }

  /** Reads a Client-scoped profile by UID. Returns `null` for not-found. */
  getProfile(scope: ProfileScope) {
    return this.sceneProfileRepository.findByUidForClient({
      uid: scope.profileUid,
      clientUid: scope.clientUid,
    });
  }

  /** Lists a Client's profiles with pagination, status filter, and search. */
  listProfiles(params: ListSceneProfilesParams) {
    return this.sceneProfileRepository.findPaginated(params);
  }

  /**
   * Updates a profile's name/description/scene_type/status. Bumps the
   * optimistic-lock `version` on every change. Deliberately does not accept
   * `is_default` — setting the Client default requires the advisory-lock
   * sequence in `setClientDefault` so two concurrent calls cannot leave two
   * active defaults; a caller-supplied `is_default` here is silently ignored.
   */
  async updateProfile(scope: ProfileScope, payload: UpdateSceneProfilePayload) {
    const existing = await this.sceneProfileRepository.findByUidForClient({
      uid: scope.profileUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }

    try {
      return await this.sceneProfileRepository.updateWithVersionCheck(
        { uid: scope.profileUid, clientUid: scope.clientUid, version: payload.version },
        {
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.description !== undefined && { description: payload.description }),
          ...(payload.sceneType !== undefined && { sceneType: payload.sceneType }),
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
   * Sets this profile as its Client's active default, clearing any prior
   * default under a Client-scoped advisory lock so concurrent calls cannot
   * leave two active defaults. `@Transactional()` because the lock, the
   * clear, and the set must commit (or roll back) together.
   */
  @Transactional()
  async setClientDefault(scope: ProfileScope) {
    const existing = await this.sceneProfileRepository.findByUidForClient({
      uid: scope.profileUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }

    await this.sceneProfileRepository.acquireClientDefaultLock(existing.clientId);
    await this.sceneProfileRepository.clearActiveDefaultForClient(existing.clientId, existing.id);

    try {
      return await this.sceneProfileRepository.updateWithVersionCheck(
        { uid: scope.profileUid, clientUid: scope.clientUid, version: existing.version },
        { isDefault: true, version: existing.version + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Retires a profile (soft, reversible lifecycle). Idempotent. Returns
   * `null` for not-found; throws 409 when a concurrent edit raced the retire.
   */
  async retireProfile(scope: ProfileScope) {
    const existing = await this.sceneProfileRepository.findByUidForClient({
      uid: scope.profileUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }
    if (existing.status === 'RETIRED') {
      return existing;
    }

    try {
      return await this.sceneProfileRepository.updateWithVersionCheck(
        { uid: scope.profileUid, clientUid: scope.clientUid, version: existing.version },
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
   * Saves a new composition: resolves each material-revision UID scoped to
   * the profile's own Client (a resolved-count mismatch means at least one
   * UID belongs to another Client or does not exist), appends an immutable
   * revision plus its ordered links, and bumps the profile's semantic
   * `version`. `@Transactional()` because the revision insert, the bulk link
   * insert, and the version bump must commit together.
   */
  @Transactional()
  async saveComposition(
    scope: ProfileScope,
    payload: SaveSceneProfileCompositionPayload,
    actorUserUid?: string,
  ) {
    const existing = await this.sceneProfileRepository.findByUidForClient({
      uid: scope.profileUid,
      clientUid: scope.clientUid,
    });
    if (!existing) {
      return null;
    }

    const requestedRevisionUids = [...new Set(payload.materials.map((m) => m.materialRevisionUid))];
    const resolvedRevisions = await this.sceneMaterialRepository.findRevisionsForClient({
      clientId: existing.clientId,
      revisionUids: requestedRevisionUids,
    });
    if (resolvedRevisions.length !== requestedRevisionUids.length) {
      throw HttpError.badRequest('SCENE_PROFILE_CROSS_CLIENT_MATERIAL');
    }
    const revisionByUid = new Map(resolvedRevisions.map((revision) => [revision.uid, revision]));

    const studioUids = [
      ...new Set(payload.materials.map((m) => m.studioUid).filter((v): v is string => v !== undefined)),
    ];
    const platformUids = [
      ...new Set(payload.materials.map((m) => m.platformUid).filter((v): v is string => v !== undefined)),
    ];
    const [studioIds, platformIds] = await Promise.all([
      this.sceneProfileRepository.resolveStudioIds(studioUids),
      this.sceneProfileRepository.resolvePlatformIds(platformUids),
    ]);

    const materials = payload.materials.map((material) => {
      // Already validated above; non-null by construction.
      const revision = revisionByUid.get(material.materialRevisionUid)!;
      return {
        materialRevisionId: revision.id,
        sortOrder: material.sortOrder,
        studioId: material.studioUid ? studioIds.get(material.studioUid) : undefined,
        platformId: material.platformUid ? platformIds.get(material.platformUid) : undefined,
        // "use an explicit override or copy the material name at
        // composition time" — SCENE_QC_IMPLEMENTATION_PLAN.md §5.2.
        label: material.label ?? revision.materialName,
      };
    });

    const createdById = actorUserUid
      ? await this.sceneProfileRepository.resolveUserId(actorUserUid)
      : undefined;

    await this.sceneProfileRepository.appendRevision({
      uid: this.uidGenerator.generateBrandedId(SCENE_PROFILE_REVISION_UID_PREFIX),
      profileId: existing.id,
      profileName: existing.name,
      profileDescription: existing.description,
      sceneType: existing.sceneType,
      ...(createdById !== undefined && { createdById }),
      materials,
    });

    try {
      return await this.sceneProfileRepository.updateWithVersionCheck(
        { uid: scope.profileUid, clientUid: scope.clientUid, version: payload.version },
        { version: payload.version + 1 },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Deterministically resolves the expected Scene Profile for a Show: an
   * explicit Show assignment wins, otherwise the Client's active default,
   * otherwise `NONE` (a warning, not a blocker — see
   * `policies/scene-profile-resolution.policy.ts`). Filters the resolved
   * profile's current-revision materials to those applicable to the Show's
   * studio/platforms.
   */
  async resolveProfileForShow(input: {
    showId: bigint;
    clientId: bigint;
    studioId: bigint;
    platformIds: bigint[];
  }) {
    const [assignedProfile, clientDefaultProfile] = await Promise.all([
      this.sceneProfileRepository.findActiveAssignedProfileForShow(input.showId),
      this.sceneProfileRepository.findActiveDefaultForClient(input.clientId),
    ]);

    const resolution = resolveSceneProfile({ assignedProfile, clientDefaultProfile });
    if (!resolution.profile) {
      return resolution;
    }

    const currentRevision = resolution.profile.revisions[0];
    if (!currentRevision) {
      return resolution;
    }

    const scopedMaterials = currentRevision.materials.map((material) => ({
      ...material,
      studioId: material.studio?.id ?? null,
      platformId: material.platform?.id ?? null,
    }));
    const applicableMaterials = selectApplicableMaterials(scopedMaterials, {
      studioId: input.studioId,
      platformIds: input.platformIds,
    });

    return {
      ...resolution,
      profile: {
        ...resolution.profile,
        revisions: [{ ...currentRevision, materials: applicableMaterials }],
      },
    };
  }
}
