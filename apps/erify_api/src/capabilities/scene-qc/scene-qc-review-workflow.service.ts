import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma } from '@prisma/client';

import type { AuditMetadata } from '@eridu/api-types/audits';
import { UID_PREFIXES } from '@eridu/api-types/constants';

import type {
  CreateSceneQcReviewPayload,
  EligibleShowRow,
  PinnedEvidenceInput,
  SceneQcReviewMutationContext,
  SceneQcReviewRecord,
  UpdateSceneQcReviewPayload,
} from './schemas/scene-qc-review.schema';
import { SceneProfileService } from './scene-profile.service';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { isShowEligibleForSceneQc } from './scene-qc-eligibility-policy';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from './scene-qc-operational-window.util';
import { isReviewEditable, normalizeFeedback, validateResultFindings } from './scene-qc-result.policy';
import { SceneQcRepository } from './scene-qc-review.repository';
import { SceneQcTaxonomyService } from './scene-qc-taxonomy.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';

const NO_EVIDENCE_MESSAGE = 'This Show has no Scene QC evidence and cannot be reviewed.';
const CONFIRMED_MESSAGE = 'This review has been confirmed and can no longer be edited.';

type ExpectedSnapshot = {
  expectedObjectKey: string | null;
  expectedFileUrl: string | null;
  expectedSceneType: SceneQcReviewRecord['expectedSceneType'];
};

/**
 * `createReview` / `updateReview` -- the `@Transactional()` command owning
 * the review save transaction end to end. The transaction boundary is
 * this workflow method (skill §3 -- transaction ownership at the application
 * workflow). Never writes Task, TaskTarget, Show, ShowStatus, or Manager
 * Review data -- the constructor injects only Scene QC's own collaborators.
 *
 * EXPORTED (capability API). See "Transaction Semantics" in
 * apps/erify_api/docs/SCENE_QC.md.
 */
@Injectable()
export class SceneQcWorkflowService {
  constructor(
    private readonly sceneQcRepository: SceneQcRepository,
    private readonly evidenceResolver: SceneQcEvidenceResolver,
    private readonly sceneProfileService: SceneProfileService,
    private readonly taxonomyService: SceneQcTaxonomyService,
    private readonly auditWriter: SceneQcAuditWriter,
    private readonly uidGenerator: UidGeneratorService,
    private readonly userService: UserService,
  ) {}

  @Transactional()
  async createReview(
    studioUid: string,
    payload: CreateSceneQcReviewPayload,
    context: SceneQcReviewMutationContext,
  ): Promise<SceneQcReviewRecord> {
    const actor = await this.resolveActor(context.actorExtId);

    const show = await this.sceneQcRepository.findShowForReview({
      studioUid,
      showUid: payload.showId,
    });
    if (!show) {
      throw HttpError.notFound('Show');
    }

    const window = resolveOperationalWindow(payload.operationalDate, OPERATIONAL_TIMEZONE);
    this.assertShowInWindow(show, window);

    const pins = await this.resolvePinnedEvidence(show.id);
    const expected = await this.resolveExpectedSnapshot(show);
    const findings = await this.taxonomyService.resolveFindings(
      payload.findings ?? [],
      expected.expectedSceneType,
    );
    this.assertResultFindings(payload.result, findings.length);

    const now = new Date();
    let created: SceneQcReviewRecord;
    try {
      created = await this.sceneQcRepository.createReviewWithEvidence({
        uid: this.uidGenerator.generateBrandedId(UID_PREFIXES.SCENE_QC_REVIEW),
        showId: show.id,
        operationalDate: this.operationalDateToUtcMidnight(window.operationalDate),
        windowStart: window.windowStart,
        windowEnd: window.windowEnd,
        timezone: window.timezone,
        result: payload.result,
        feedback: normalizeFeedback(payload.feedback),
        reviewedById: actor.id,
        reviewedAt: now,
        ...expected,
        evidence: pins,
        findings,
      });
    } catch (error) {
      if (this.isReviewUniqueConstraintError(error)) {
        throw HttpError.conflict(
          'A Scene QC review already exists for this Show and operational date. Refresh and try again.',
        );
      }
      throw error;
    }

    await this.auditWriter.recordSceneQcReviewChange({
      action: 'CREATE',
      actorId: actor.id,
      sceneQcReviewId: created.id,
      metadata: this.buildAuditMetadata({
        review: created,
        showUid: show.uid,
        studioUid,
        actorUid: actor.uid,
        evidenceCount: pins.length,
        previous: null,
      }),
    });

    return created;
  }

  @Transactional()
  async updateReview(
    studioUid: string,
    reviewUid: string,
    payload: UpdateSceneQcReviewPayload,
    context: SceneQcReviewMutationContext,
  ): Promise<SceneQcReviewRecord> {
    const actor = await this.resolveActor(context.actorExtId);

    const existing = await this.sceneQcRepository.findReviewForUpdate({ studioUid, reviewUid });
    if (!existing) {
      throw HttpError.notFound('Scene QC review');
    }
    if (!isReviewEditable(existing)) {
      throw HttpError.conflict(CONFIRMED_MESSAGE);
    }

    const show = await this.sceneQcRepository.findShowForReview({
      studioUid,
      showUid: existing.show.uid,
    });
    if (!show) {
      throw HttpError.notFound('Show');
    }
    // The Show must still fall in the review's originally pinned window --
    // OQ-15: if it has since moved to a different operational date, PATCH is
    // rejected and the client must POST a new head.
    if (!isShowEligibleForSceneQc(show, { windowStart: existing.windowStart, windowEnd: existing.windowEnd })) {
      throw HttpError.conflict(
        'This Show has moved to a different operational date. Create a new review for the current date.',
      );
    }

    const pins = await this.resolvePinnedEvidence(show.id);
    const expected = await this.resolveExpectedSnapshot(show);
    const findings = await this.taxonomyService.resolveFindings(
      payload.findings ?? [],
      expected.expectedSceneType,
    );
    this.assertResultFindings(payload.result, findings.length);

    const updated = await this.sceneQcRepository.replaceReviewWithEvidence({
      reviewId: existing.id,
      expectedVersion: payload.version,
      data: {
        result: payload.result,
        feedback: normalizeFeedback(payload.feedback),
        reviewedById: actor.id,
        reviewedAt: new Date(),
        ...expected,
      },
      evidence: pins,
      findings,
    });

    if (!updated) {
      // count === 0: either a stale expectedVersion or a since-confirmed
      // review (a race between the editability check above and this write).
      // Re-read to tell the caller which.
      const reread = await this.sceneQcRepository.findReviewForUpdate({ studioUid, reviewUid });
      if (reread && !isReviewEditable(reread)) {
        throw HttpError.conflict(CONFIRMED_MESSAGE);
      }
      throw HttpError.conflict('This review is out of date. Refresh and try again.');
    }

    await this.auditWriter.recordSceneQcReviewChange({
      action: 'UPDATE',
      actorId: actor.id,
      sceneQcReviewId: updated.id,
      metadata: this.buildAuditMetadata({
        review: updated,
        showUid: show.uid,
        studioUid,
        actorUid: actor.uid,
        evidenceCount: pins.length,
        previous: { result: existing.result, feedback_present: Boolean(existing.feedback) },
      }),
    });

    return updated;
  }

  private async resolveActor(actorExtId: string): Promise<{ id: bigint; uid: string }> {
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }
    return { id: actor.id, uid: actor.uid };
  }

  private assertShowInWindow(show: EligibleShowRow, window: { windowStart: Date; windowEnd: Date }): void {
    if (!isShowEligibleForSceneQc(show, window)) {
      throw HttpError.conflict('This Show is not eligible for Scene QC on the selected operational date.');
    }
  }

  private assertResultFindings(result: CreateSceneQcReviewPayload['result'], findingCount: number): void {
    if (!validateResultFindings(result, findingCount)) {
      throw HttpError.badRequest(
        result === 'PASS'
          ? 'Pass results cannot contain structured issues'
          : 'At least one structured issue is required for Minor and Fail results',
      );
    }
  }

  private async resolvePinnedEvidence(showId: bigint): Promise<PinnedEvidenceInput[]> {
    const resolved = await this.evidenceResolver.resolveForShows([showId]);
    const evidence = resolved.get(showId) ?? [];
    if (evidence.length === 0) {
      throw HttpError.unprocessableEntity(NO_EVIDENCE_MESSAGE);
    }
    return evidence.map((item, index) => ({
      sortOrder: index,
      sourceTaskId: item.sourceTaskId,
      sourceTaskUid: item.sourceTaskUid,
      sourceTaskVersion: item.sourceTaskVersion,
      sourceFieldKey: item.sourceFieldKey,
      sourceLabel: item.sourceLabel,
      objectKey: item.objectKey,
      fileUrl: item.fileUrl,
    }));
  }

  private async resolveExpectedSnapshot(show: EligibleShowRow): Promise<ExpectedSnapshot> {
    const clientUid = show.client?.uid;
    const profile = clientUid ? await this.sceneProfileService.getActiveProfileForClient(clientUid) : null;
    return {
      expectedObjectKey: profile?.objectKey ?? null,
      expectedFileUrl: profile?.fileUrl ?? null,
      expectedSceneType: profile?.sceneType ?? null,
    };
  }

  private operationalDateToUtcMidnight(operationalDate: string): Date {
    return new Date(`${operationalDate}T00:00:00.000Z`);
  }

  private isReviewUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === PRISMA_ERROR.UniqueConstraint
    );
  }

  private buildAuditMetadata(input: {
    review: SceneQcReviewRecord;
    showUid: string;
    studioUid: string;
    actorUid: string;
    evidenceCount: number;
    previous: { result: SceneQcReviewRecord['result']; feedback_present: boolean } | null;
  }): AuditMetadata {
    return {
      event: 'scene_qc_review_saved',
      scene_qc_review_uid: input.review.uid,
      show_uid: input.showUid,
      studio_uid: input.studioUid,
      actor_uid: input.actorUid,
      operational_date: input.review.operationalDate.toISOString().slice(0, 10),
      old_value: input.previous,
      new_value: {
        result: input.review.result,
        feedback_present: Boolean(input.review.feedback),
        evidence_count: input.evidenceCount,
      },
    };
  }
}
