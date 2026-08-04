import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import { SCENE_PROFILE_ALLOWED_MIME_TYPES, SCENE_PROFILE_MAX_FILE_SIZE_BYTES } from '@eridu/api-types/scene-qc';

import type {
  SaveSceneProfilePayload,
  SceneProfileMutationContext,
  SceneProfileRecord,
} from './schemas/scene-profile.schema';
import { sceneProfileDefaultInclude } from './schemas/scene-profile.schema';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { checkSceneReferenceUpload, SCENE_REFERENCE_OBJECT_KEY_PREFIX } from './scene-reference-upload.policy';

import { HttpError } from '@/lib/errors/http-error.util';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { BaseModelService } from '@/lib/services/base-model.service';
import { StorageService } from '@/lib/storage/storage.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';

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
    private readonly storageService: StorageService,
    private readonly userService: UserService,
    private readonly auditWriter: SceneQcAuditWriter,
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
   *
   * Actor resolution and upload verification both run before the
   * `@Transactional()` boundary: the `headObject` probe is a network round
   * trip to R2, and holding a pool connection open across it turns R2
   * slowness into a transaction-timeout 500 where a clean 400/404 was meant.
   * The transaction covers only the profile write and its audit row.
   */
  async saveProfileForClient(
    clientUid: string,
    payload: SaveSceneProfilePayload,
    context: SceneProfileMutationContext,
  ): Promise<SceneProfileRecord> {
    const actor = await this.resolveActor(context.actorExtId);
    const verified = await this.assertSceneReferenceUpload(payload, context.actorExtId);
    const verifiedPayload: SaveSceneProfilePayload = {
      ...payload,
      mimeType: verified.mimeType,
      fileSize: verified.fileSize,
    };

    return this.saveProfileForClientInTx(clientUid, verifiedPayload, context, actor);
  }

  @Transactional()
  private async saveProfileForClientInTx(
    clientUid: string,
    verifiedPayload: SaveSceneProfilePayload,
    context: SceneProfileMutationContext,
    actor: { id: bigint; uid: string },
  ): Promise<SceneProfileRecord> {
    const existing = await this.getActiveProfileForClient(clientUid);

    if (!existing) {
      if (verifiedPayload.version !== undefined) {
        throw HttpError.conflict(
          'Scene profile no longer exists. Please refresh your record and try again.',
        );
      }
      const created = await this.createProfile(clientUid, verifiedPayload);
      await this.writeAudit('CREATE', created, null, actor, context.studioUid);
      return created;
    }

    if (verifiedPayload.version === undefined) {
      throw HttpError.conflict(
        'Scene profile already exists. Please refresh your record and try again.',
      );
    }

    const replaced = await this.replaceProfile(clientUid, existing, verifiedPayload, verifiedPayload.version);
    await this.writeAudit('UPDATE', replaced, existing, actor, context.studioUid);
    return replaced;
  }

  /**
   * Retires (soft-deletes) the Client's current Scene Profile. Returns `null`
   * when there is nothing to retire. There is no restore path — recreate is
   * the way back (see plan section 0). `version` is guarded but not
   * incremented: retire is a terminal write with no reader that would need to
   * detect a subsequent change.
   *
   * `expectedVersion` is required, not optional: unlike PUT (where an omitted
   * version has a real meaning, "I believe there is no profile"), DELETE has
   * no alternate meaning for omission -- an optional guard here would make
   * retire last-writer-wins for any caller that simply doesn't pass one.
   */
  @Transactional()
  async retireProfileForClient(
    clientUid: string,
    context: SceneProfileMutationContext,
    expectedVersion: number,
  ): Promise<SceneProfileRecord | null> {
    const actor = await this.resolveActor(context.actorExtId);
    const existing = await this.getActiveProfileForClient(clientUid);
    if (!existing) {
      return null;
    }

    if (expectedVersion !== existing.version) {
      throw HttpError.conflict(
        'Scene profile is out of date. Please refresh your record and try again.',
      );
    }

    try {
      const retired = await this.txHost.tx.sceneProfile.update({
        where: {
          uid: existing.uid,
          version: existing.version,
          deletedAt: null,
          client: { uid: clientUid, deletedAt: null },
        },
        data: { deletedAt: new Date() },
        include: sceneProfileDefaultInclude,
      });
      await this.writeAudit('DELETE', retired, existing, actor, context.studioUid);
      return retired;
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw HttpError.conflict(
          'Scene profile is out of date. Please refresh your record and try again.',
        );
      }
      throw error;
    }
  }

  private async resolveActor(actorExtId: string): Promise<{ id: bigint; uid: string }> {
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }
    return { id: actor.id, uid: actor.uid };
  }

  /**
   * Validates the object-key/URL shape and ownership, then confirms the
   * object actually exists in R2 and returns its real, server-observed
   * content type and size. The caller must persist these returned values,
   * never `payload.mimeType`/`payload.fileSize` -- those are only the
   * client's claim, and a forged or mismatched claim must not reach storage.
   */
  private async assertSceneReferenceUpload(
    payload: SaveSceneProfilePayload,
    actorExtId: string,
  ): Promise<{ mimeType: string; fileSize: number }> {
    const violation = checkSceneReferenceUpload({
      objectKey: payload.objectKey,
      fileUrl: payload.fileUrl,
      expectedFileUrl: this.storageService.resolvePublicFileUrl(payload.objectKey),
      expectedActorSegment: this.storageService.sanitizeActorIdForObjectKey(actorExtId),
    });
    if (violation === 'file_url_does_not_match_object_key') {
      throw HttpError.badRequest('file_url does not match object_key');
    }
    if (violation === 'object_key_actor_mismatch') {
      throw HttpError.forbidden('object_key was not issued to the current actor');
    }
    if (violation !== null) {
      throw HttpError.badRequest(
        `object_key must be a ${SCENE_REFERENCE_OBJECT_KEY_PREFIX} upload created through the presign flow`,
      );
    }

    const uploaded = await this.storageService.headObject(payload.objectKey);
    if (!uploaded) {
      throw HttpError.badRequest('The uploaded file could not be found. Please upload again.');
    }
    if (!(SCENE_PROFILE_ALLOWED_MIME_TYPES as readonly string[]).includes(uploaded.contentType)) {
      throw HttpError.badRequest('The uploaded file is not one of the accepted image types.');
    }
    if (uploaded.contentLength <= 0 || uploaded.contentLength > SCENE_PROFILE_MAX_FILE_SIZE_BYTES) {
      throw HttpError.badRequest('The uploaded file size is invalid.');
    }

    return { mimeType: uploaded.contentType, fileSize: uploaded.contentLength };
  }

  private async writeAudit(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    profile: SceneProfileRecord,
    previous: SceneProfileRecord | null,
    actor: { id: bigint; uid: string },
    studioUid: string,
  ): Promise<void> {
    await this.auditWriter.recordSceneProfileChange({
      action,
      actorId: actor.id,
      sceneProfileId: profile.id,
      metadata: {
        event: action === 'DELETE' ? 'scene_profile_retired' : 'scene_profile_saved',
        scene_profile_uid: profile.uid,
        client_uid: profile.client.uid,
        studio_uid: studioUid,
        actor_uid: actor.uid,
        // Only the two semantic fields. file_url is a derived locator and file
        // size/mime are upload metadata -- neither is a business decision.
        // Old values are recorded because an in-place replace is the ONLY place
        // the prior reference survives.
        old_value: previous
          ? { object_key: previous.objectKey, scene_type: previous.sceneType }
          : null,
        new_value: action === 'DELETE'
          ? null
          : { object_key: profile.objectKey, scene_type: profile.sceneType },
      },
    });
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
