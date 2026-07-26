import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { SceneProfileRepository } from './persistence/scene-profile.repository';
import { SceneProfileAssignmentRepository } from './persistence/scene-profile-assignment.repository';
import type {
  AssignSceneProfilePayload,
  UnassignSceneProfilePayload,
} from './schemas/scene-profile-assignment.schema';
import { SCENE_PROFILE_ASSIGNMENT_UID_PREFIX } from './scene-qc-uid.util';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

const VERSION_CONFLICT_MESSAGE = 'Scene profile assignment is out of date. Please refresh and try again.';

/**
 * Service for the optional explicit Show -> Scene Profile override. See
 * SCENE_QC_IMPLEMENTATION_PLAN.md §5.2.
 */
@Injectable()
export class SceneProfileAssignmentService extends BaseModelService {
  static readonly UID_PREFIX = SCENE_PROFILE_ASSIGNMENT_UID_PREFIX;
  protected readonly uidPrefix = SceneProfileAssignmentService.UID_PREFIX;

  constructor(
    private readonly sceneProfileAssignmentRepository: SceneProfileAssignmentRepository,
    private readonly sceneProfileRepository: SceneProfileRepository,
    protected readonly uidGenerator: UidGeneratorService,
  ) {
    super(uidGenerator);
  }

  /** Reads the Show's active assignment, if any. Returns `null` when unassigned. */
  getAssignmentForShow(showUid: string) {
    return this.sceneProfileAssignmentRepository.findActiveByShowUid(showUid);
  }

  /**
   * Assigns a Scene Profile to a Show. Rejects a profile that does not
   * belong to the Show's Client or is not `ACTIVE`. `@Transactional()`
   * because the existence/ownership checks and the upsert must observe a
   * consistent snapshot.
   */
  @Transactional()
  async assignProfileToShow(payload: AssignSceneProfilePayload & { showUid: string }) {
    const show = await this.sceneProfileAssignmentRepository.findShowForAssignment(payload.showUid);
    if (!show) {
      return null;
    }

    const profile = await this.sceneProfileRepository.findByUidForClient({
      uid: payload.profileUid,
      clientUid: show.clientUid,
    });
    if (!profile) {
      throw HttpError.badRequest('SCENE_PROFILE_CLIENT_MISMATCH');
    }
    if (profile.status !== 'ACTIVE') {
      throw HttpError.badRequest('SCENE_PROFILE_NOT_ACTIVE');
    }

    const existingAssignment = await this.sceneProfileAssignmentRepository.findActiveByShowId(show.id);

    try {
      return await this.sceneProfileAssignmentRepository.upsertActiveAssignment({
        uid: this.generateUid(),
        showId: show.id,
        profileId: profile.id,
        ...(existingAssignment && payload.version !== undefined && { expectedVersion: payload.version }),
      });
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Removes the Show's explicit assignment (soft delete), returning it to
   * Client-default resolution. Returns `null` when the Show does not exist
   * or has no active assignment; throws 409 on stale `version`.
   */
  async unassignProfileFromShow(payload: UnassignSceneProfilePayload & { showUid: string }) {
    const show = await this.sceneProfileAssignmentRepository.findShowForAssignment(payload.showUid);
    if (!show) {
      return null;
    }

    try {
      return await this.sceneProfileAssignmentRepository.softDeleteWithVersionCheck({
        showId: show.id,
        version: payload.version,
      });
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(VERSION_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }
}
