import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { AuditMetadata } from '@eridu/api-types/audits';
import { UID_PREFIXES } from '@eridu/api-types/constants';
import type { SceneQcReviewAmendment } from '@eridu/api-types/scene-qc';

import type { CreateSceneQcReviewAmendmentPayload } from './schemas/scene-qc-amendment.schema';
import { toSceneQcAmendmentDto } from './schemas/scene-qc-amendment.schema';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { validateResultFindings } from './scene-qc-result.policy';
import { SceneQcRepository } from './scene-qc-review.repository';
import { SceneQcTaxonomyService } from './scene-qc-taxonomy.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';

/**
 * Append-only comments and corrections for confirmed Scene QC records.
 * Normal draft PATCH remains locked after confirmation; this command never
 * mutates the original review, its evidence, or its findings.
 */
@Injectable()
export class SceneQcAmendmentService {
  constructor(
    private readonly repository: SceneQcRepository,
    private readonly taxonomyService: SceneQcTaxonomyService,
    private readonly auditWriter: SceneQcAuditWriter,
    private readonly uidGenerator: UidGeneratorService,
    private readonly userService: UserService,
  ) {}

  @Transactional()
  async append(
    studioUid: string,
    reviewUid: string,
    payload: CreateSceneQcReviewAmendmentPayload,
    actorExtId: string,
  ): Promise<SceneQcReviewAmendment> {
    const [review, actor] = await Promise.all([
      this.repository.findReviewForUpdate({ studioUid, reviewUid }),
      this.userService.getUserByExtId(actorExtId),
    ]);
    if (!review) {
      throw HttpError.notFound('Scene QC review');
    }
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }
    if (!review.confirmedAt) {
      throw HttpError.conflict('Comments and corrections can be appended only after the review is confirmed.');
    }

    const findings = payload.result
      ? await this.taxonomyService.resolveFindings(payload.findings, review.expectedSceneType)
      : [];
    if (payload.result && !validateResultFindings(payload.result, findings.length)) {
      throw HttpError.badRequest(
        payload.result === 'PASS'
          ? 'Pass corrections cannot contain structured issues'
          : 'At least one structured issue is required for Minor and Fail corrections',
      );
    }

    const amendment = await this.repository.appendReviewAmendment({
      uid: this.uidGenerator.generateBrandedId(UID_PREFIXES.SCENE_QC_AMENDMENT),
      reviewId: review.id,
      result: payload.result,
      note: payload.note.trim(),
      createdById: actor.id,
      findings,
    });

    await this.auditWriter.recordSceneQcReviewChange({
      action: 'UPDATE',
      actorId: actor.id,
      sceneQcReviewId: review.id,
      metadata: this.buildAuditMetadata({
        reviewUid,
        studioUid,
        actorUid: actor.uid,
        revision: amendment.revision,
        result: amendment.result,
      }),
    });

    return toSceneQcAmendmentDto(amendment);
  }

  private buildAuditMetadata(input: {
    reviewUid: string;
    studioUid: string;
    actorUid: string;
    revision: number;
    result: 'PASS' | 'MINOR' | 'FAIL' | null;
  }): AuditMetadata {
    return {
      event: 'scene_qc_review_amendment_appended',
      scene_qc_review_uid: input.reviewUid,
      studio_uid: input.studioUid,
      actor_uid: input.actorUid,
      amendment_revision: input.revision,
      correction_result: input.result,
    };
  }
}
