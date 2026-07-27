import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import { UID_PREFIXES } from '@eridu/api-types/constants';

import type {
  SaveSceneProfilePayload,
  SceneProfileRecord,
} from './schemas/scene-profile.schema';
import { sceneProfileDefaultInclude } from './schemas/scene-profile.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

/**
 * Manages a Client's single mutable Scene Profile (Stage 1 Scene QC). This is
 * shallow, single-model CRUD under the `erify-api-capability-refactoring`
 * persistence matrix — no repository: a version-checked update against one row
 * per Client does not earn a private persistence seam.
 *
 * The caller (Child PR 2's controller) owns Client-existence and
 * Studio<->Client linkage validation; every method here trusts `clientUid` and
 * scopes strictly by it.
 */
@Injectable()
export class SceneProfileService extends BaseModelService {
  static readonly UID_PREFIX = UID_PREFIXES.SCENE_PROFILE;
  protected readonly uidPrefix = SceneProfileService.UID_PREFIX;

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    protected readonly uidGenerator: UidGeneratorService,
  ) {
    super(uidGenerator);
  }

  /**
   * Reads the Client's current (non-deleted) Scene Profile. Returns `null`
   * when the Client has none — a missing Scene Profile is a warning state in
   * the product, not an error.
   */
  async getActiveProfileForClient(clientUid: string): Promise<SceneProfileRecord | null> {
    return this.txHost.tx.sceneProfile.findFirst({
      where: {
        client: { uid: clientUid, deletedAt: null },
        deletedAt: null,
      },
      include: sceneProfileDefaultInclude,
    });
  }

  /**
   * Creates or replaces the Client's single Scene Profile in one
   * version-checked call. `payload.version` omitted means "I believe this
   * Client has no profile" (create); present means "I am replacing at exactly
   * this version" (replace). Throws 409 on every mismatch between the
   * caller's belief and the current state — never silently creates a second
   * row or silently overwrites an unrelated version.
   */
  async saveProfileForClient(
    clientUid: string,
    payload: SaveSceneProfilePayload,
  ): Promise<SceneProfileRecord> {
    const existing = await this.getActiveProfileForClient(clientUid);

    if (!existing) {
      if (payload.version !== undefined) {
        throw HttpError.conflict(
          'Scene profile no longer exists. Please refresh your record and try again.',
        );
      }
      return this.createProfile(clientUid, payload);
    }

    if (payload.version === undefined) {
      throw HttpError.conflict(
        'Scene profile already exists. Please refresh your record and try again.',
      );
    }

    return this.replaceProfile(clientUid, existing, payload, payload.version);
  }

  /**
   * Retires (soft-deletes) the Client's current Scene Profile. Returns `null`
   * when there is nothing to retire. There is no restore path — recreate is
   * the way back (see plan section 0). `version` is guarded but not
   * incremented: retire is a terminal write with no reader that would need to
   * detect a subsequent change.
   */
  async retireProfileForClient(clientUid: string): Promise<SceneProfileRecord | null> {
    const existing = await this.getActiveProfileForClient(clientUid);
    if (!existing) {
      return null;
    }

    try {
      return await this.txHost.tx.sceneProfile.update({
        where: {
          uid: existing.uid,
          version: existing.version,
          deletedAt: null,
          client: { uid: clientUid, deletedAt: null },
        },
        data: { deletedAt: new Date() },
        include: sceneProfileDefaultInclude,
      });
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw HttpError.conflict(
          'Scene profile is out of date. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  private async createProfile(
    clientUid: string,
    payload: SaveSceneProfilePayload,
  ): Promise<SceneProfileRecord> {
    try {
      return await this.txHost.tx.sceneProfile.create({
        data: {
          uid: this.generateUid(),
          objectKey: payload.objectKey,
          fileUrl: payload.fileUrl,
          mimeType: payload.mimeType,
          fileSize: payload.fileSize,
          sceneType: payload.sceneType,
          client: { connect: { uid: clientUid } },
        },
        include: sceneProfileDefaultInclude,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        // The real concurrency guard: two concurrent "no profile yet" creates
        // race the DB-only partial unique index, not this read-then-write.
        throw HttpError.conflict(
          'Scene profile already exists. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  private async replaceProfile(
    clientUid: string,
    existing: SceneProfileRecord,
    payload: SaveSceneProfilePayload,
    version: number,
  ): Promise<SceneProfileRecord> {
    try {
      return await this.txHost.tx.sceneProfile.update({
        where: {
          uid: existing.uid,
          version,
          deletedAt: null,
          client: { uid: clientUid, deletedAt: null },
        },
        data: {
          objectKey: payload.objectKey,
          fileUrl: payload.fileUrl,
          mimeType: payload.mimeType,
          fileSize: payload.fileSize,
          sceneType: payload.sceneType,
          version: { increment: 1 },
        },
        include: sceneProfileDefaultInclude,
      });
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw HttpError.conflict(
          'Scene profile is out of date. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === PRISMA_ERROR.UniqueConstraint
    );
  }

  private isRecordNotFoundError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === PRISMA_ERROR.RecordNotFound
    );
  }
}
