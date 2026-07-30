import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Prisma } from '@prisma/client';

import type { ReviewAuditEntry, ReviewRecordRow } from './schemas/scene-qc-records.schema';
import type {
  CreateReviewPersistenceInput,
  EligibleShowRow,
  PinnedEvidenceInput,
  ReviewHeadRow,
  ReviewMutablePersistenceFields,
  SceneQcReviewRecord,
} from './schemas/scene-qc-review.schema';
import { sceneQcReviewDefaultInclude } from './schemas/scene-qc-review.schema';
import { SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS } from './scene-qc-eligibility-policy';

import { HttpError } from '@/lib/errors/http-error.util';

/** Loud, not silent: OQ-11 caps the eligible-Show-per-operational-day projection. */
const MAX_ELIGIBLE_SHOWS_PER_WINDOW = 500;

const ELIGIBLE_SHOW_SELECT = {
  id: true,
  uid: true,
  name: true,
  startTime: true,
  showStatus: { select: { systemKey: true } },
  client: { select: { id: true, uid: true, name: true } },
  showPlatforms: {
    where: { deletedAt: null },
    select: { platform: { select: { uid: true, name: true } } },
  },
} as const satisfies Prisma.ShowSelect;

type RawEligibleShow = Prisma.ShowGetPayload<{ select: typeof ELIGIBLE_SHOW_SELECT }>;

function toEligibleShowRow(show: RawEligibleShow): EligibleShowRow {
  return {
    id: show.id,
    uid: show.uid,
    name: show.name,
    startTime: show.startTime,
    deletedAt: null,
    statusSystemKey: show.showStatus?.systemKey ?? null,
    client: show.client ? { id: show.client.id, uid: show.client.uid, name: show.client.name } : null,
    platforms: show.showPlatforms.map((entry) => entry.platform),
  };
}

/**
 * Every Scene QC read projection and multi-row write for review outcomes.
 * All access through `txHost.tx`. PRIVATE to SceneQcModule -- providers only,
 * never `exports`.
 *
 * `findEligibleShowsInWindow` and `findShowForReview` read
 * `txHost.tx.show` directly -- a deliberate, capability-local, read-only,
 * purpose-shaped projection (OQ-9), the same pattern Child PR 1 used for the
 * audit side table. Scene QC never writes the Show table.
 */
@Injectable()
export class SceneQcRepository {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  // --- Reads -----------------------------------------------------------------

  async findEligibleShowsInWindow(input: {
    studioUid: string;
    windowStart: Date;
    windowEnd: Date;
    clientUid?: string;
    platformUid?: string;
    search?: string;
  }): Promise<EligibleShowRow[]> {
    const where: Prisma.ShowWhereInput = {
      deletedAt: null,
      studio: { uid: input.studioUid },
      startTime: { gte: input.windowStart, lt: input.windowEnd },
      // A bare `notIn` silently drops NULL rows in SQL -- systemKey is
      // nullable and the policy treats null as eligible, so this must be an
      // explicit OR.
      OR: [
        { showStatus: { systemKey: null } },
        { showStatus: { systemKey: { notIn: [...SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS] } } },
      ],
      ...(input.clientUid ? { client: { uid: input.clientUid } } : {}),
      ...(input.platformUid
        ? { showPlatforms: { some: { deletedAt: null, platform: { uid: input.platformUid } } } }
        : {}),
      ...(input.search ? { name: { contains: input.search, mode: 'insensitive' } } : {}),
    };

    const shows = await this.txHost.tx.show.findMany({
      where,
      select: ELIGIBLE_SHOW_SELECT,
      orderBy: { startTime: 'asc' },
      take: MAX_ELIGIBLE_SHOWS_PER_WINDOW + 1,
    });

    if (shows.length > MAX_ELIGIBLE_SHOWS_PER_WINDOW) {
      throw HttpError.unprocessableEntity(
        `Scene QC daily scope exceeds ${MAX_ELIGIBLE_SHOWS_PER_WINDOW} Shows for one operational day. Narrow the window.`,
      );
    }

    return shows.map(toEligibleShowRow);
  }

  /**
   * Resolves a Show by UID scoped to the studio, for a caller that still
   * needs its own `isShowEligibleForSceneQc(show, window)` check. This
   * method deliberately does NOT enforce status or operational-window
   * eligibility itself -- it only confirms the Show exists, is not
   * soft-deleted, and belongs to the studio. `SceneQcWorkflowService` and
   * `SceneQcQueryService.getDailyItemDetail` both call
   * `isShowEligibleForSceneQc` separately afterward; a future caller (e.g.
   * Child PR 4's Records surface) must do the same rather than assuming this
   * method already gates eligibility.
   */
  async findShowForReview(input: {
    studioUid: string;
    showUid: string;
  }): Promise<EligibleShowRow | null> {
    const show = await this.txHost.tx.show.findFirst({
      where: {
        uid: input.showUid,
        deletedAt: null,
        studio: { uid: input.studioUid },
      },
      select: ELIGIBLE_SHOW_SELECT,
    });
    return show ? toEligibleShowRow(show) : null;
  }

  /**
   * Bulk existence check backing the daily item list's `has_scene_profile`
   * field. `SceneProfile` is Scene QC's own table (owned by this module, not
   * a cross-capability read like `show`/`task`), so a direct bulk
   * `txHost.tx.sceneProfile` read here avoids an N+1 loop over
   * `SceneProfileService.getActiveProfileForClient` per row -- that
   * per-Client method exists for the single-Client detail/profile-editor
   * path, not bulk list projections.
   */
  async findClientIdsWithActiveProfile(clientIds: bigint[]): Promise<Set<bigint>> {
    if (clientIds.length === 0) {
      return new Set();
    }
    const profiles = await this.txHost.tx.sceneProfile.findMany({
      where: { clientId: { in: clientIds }, deletedAt: null },
      select: { clientId: true },
    });
    return new Set(profiles.map((profile) => profile.clientId));
  }

  async findReviewHeadsForShows(input: {
    showIds: bigint[];
    operationalDate: Date;
  }): Promise<ReviewHeadRow[]> {
    if (input.showIds.length === 0) {
      return [];
    }

    const reviews = await this.txHost.tx.sceneQcReview.findMany({
      where: {
        showId: { in: input.showIds },
        operationalDate: input.operationalDate,
      },
      select: {
        id: true,
        uid: true,
        showId: true,
        result: true,
        feedback: true,
        version: true,
        confirmedAt: true,
        reviewedAt: true,
        reviewedBy: { select: { uid: true, name: true } },
        _count: { select: { evidence: true } },
      },
    });

    return reviews.map((review) => ({
      id: review.id,
      uid: review.uid,
      showId: review.showId,
      result: review.result,
      feedback: review.feedback,
      version: review.version,
      confirmedAt: review.confirmedAt,
      reviewedBy: review.reviewedBy,
      reviewedAt: review.reviewedAt,
      evidenceCount: review._count.evidence,
    }));
  }

  /**
   * `includeEvidence` is accepted for call-site clarity (per the breakdown's
   * documented signature) but this is always a single-row read, so the
   * evidence relation is always included -- there is no meaningful cost
   * saving from a second, narrower include shape here.
   */
  async findReviewByShowAndDate(input: {
    showId: bigint;
    operationalDate: Date;
    includeEvidence?: boolean;
  }): Promise<SceneQcReviewRecord | null> {
    void input.includeEvidence;
    return this.txHost.tx.sceneQcReview.findUnique({
      where: { showId_operationalDate: { showId: input.showId, operationalDate: input.operationalDate } },
      include: sceneQcReviewDefaultInclude,
    });
  }

  async findReviewForUpdate(input: {
    studioUid: string;
    reviewUid: string;
  }): Promise<SceneQcReviewRecord | null> {
    return this.txHost.tx.sceneQcReview.findFirst({
      where: {
        uid: input.reviewUid,
        show: { studio: { uid: input.studioUid } },
      },
      include: sceneQcReviewDefaultInclude,
    });
  }

  // --- Records reads (Child PR 4) -----------------------------------------

  private buildRecordsWhere(input: {
    studioUid: string;
    operationalDateFrom: Date;
    operationalDateTo: Date;
    clientUid?: string;
    platformUid?: string;
    result?: Prisma.SceneQcReviewWhereInput['result'];
  }): Prisma.SceneQcReviewWhereInput {
    return {
      operationalDate: { gte: input.operationalDateFrom, lte: input.operationalDateTo },
      show: {
        deletedAt: null,
        studio: { uid: input.studioUid },
        // Records is review-anchored, not confirmation-anchored: it does NOT
        // apply the eligibility deny-list (a review pinned to a Show later
        // cancelled is still a historical record). Client/platform filters
        // match the Show's LIVE relations -- see breakdown section 1.7.
        ...(input.clientUid ? { client: { uid: input.clientUid } } : {}),
        ...(input.platformUid
          ? { showPlatforms: { some: { deletedAt: null, platform: { uid: input.platformUid } } } }
          : {}),
      },
      ...(input.result ? { result: input.result } : {}),
    };
  }

  /** SQL-level `skip`/`take` -- all Records filters are SQL-expressible, unlike listDailyItems' evidence-dependent filter (OQ-28). */
  async findReviewRecords(input: {
    studioUid: string;
    operationalDateFrom: Date;
    operationalDateTo: Date;
    clientUid?: string;
    platformUid?: string;
    result?: Prisma.SceneQcReviewWhereInput['result'];
    skip: number;
    take: number;
  }): Promise<ReviewRecordRow[]> {
    const reviews = await this.txHost.tx.sceneQcReview.findMany({
      where: this.buildRecordsWhere(input),
      select: {
        id: true,
        uid: true,
        operationalDate: true,
        result: true,
        feedback: true,
        version: true,
        reviewedBy: { select: { uid: true, name: true } },
        reviewedAt: true,
        show: {
          select: {
            uid: true,
            name: true,
            startTime: true,
            client: { select: { uid: true, name: true } },
            showPlatforms: { where: { deletedAt: null }, select: { platform: { select: { uid: true, name: true } } } },
          },
        },
        _count: { select: { evidence: true } },
      },
      orderBy: [{ operationalDate: 'desc' }, { reviewedAt: 'desc' }],
      skip: input.skip,
      take: input.take,
    });

    return reviews.map((review) => ({
      id: review.id,
      uid: review.uid,
      operationalDate: review.operationalDate,
      showUid: review.show.uid,
      showName: review.show.name,
      scheduledStartTime: review.show.startTime,
      client: review.show.client,
      platforms: review.show.showPlatforms.map((entry) => entry.platform),
      result: review.result,
      feedback: review.feedback,
      reviewedBy: review.reviewedBy,
      reviewedAt: review.reviewedAt,
      version: review.version,
      evidenceCount: review._count.evidence,
    }));
  }

  async countReviewRecords(input: {
    studioUid: string;
    operationalDateFrom: Date;
    operationalDateTo: Date;
    clientUid?: string;
    platformUid?: string;
    result?: Prisma.SceneQcReviewWhereInput['result'];
  }): Promise<number> {
    return this.txHost.tx.sceneQcReview.count({ where: this.buildRecordsWhere(input) });
  }

  async findReviewRecordDetail(input: {
    studioUid: string;
    reviewUid: string;
  }): Promise<SceneQcReviewRecord & { show: EligibleShowRow } | null> {
    const review = await this.txHost.tx.sceneQcReview.findFirst({
      where: { uid: input.reviewUid, show: { deletedAt: null, studio: { uid: input.studioUid } } },
      include: { ...sceneQcReviewDefaultInclude, show: { select: ELIGIBLE_SHOW_SELECT } },
    });
    return review ? { ...review, show: toEligibleShowRow(review.show) } : null;
  }

  /**
   * Curated audit projection -- see OQ-18. Never selects `ipAddress` /
   * `userAgent`; only `old_value`/`new_value` are extracted from `metadata`
   * in memory and the rest is discarded before mapping to the API response.
   */
  async findReviewAuditHistory(reviewId: bigint): Promise<ReviewAuditEntry[]> {
    const targets = await this.txHost.tx.sceneQcAuditTarget.findMany({
      where: { sceneQcReviewId: reviewId },
      select: {
        audit: {
          select: {
            uid: true,
            action: true,
            actor: { select: { uid: true, name: true } },
            metadata: true,
            createdAt: true,
          },
        },
      },
      orderBy: { audit: { createdAt: 'asc' } },
    });

    return targets.map(({ audit }) => {
      const metadata = audit.metadata as {
        old_value?: { result?: string; feedback_present?: boolean } | null;
        new_value?: { result?: string; feedback_present?: boolean };
      };
      const oldValue = metadata.old_value ?? null;
      const newValue = metadata.new_value ?? null;
      return {
        uid: audit.uid,
        action: audit.action as 'CREATE' | 'UPDATE',
        actor: audit.actor,
        createdAt: audit.createdAt,
        oldResult: (oldValue?.result as SceneQcReviewRecord['result'] | undefined) ?? null,
        newResult: (newValue?.result as SceneQcReviewRecord['result'] | undefined) ?? null,
        feedbackChanged: oldValue !== null && oldValue.feedback_present !== newValue?.feedback_present,
      };
    });
  }

  // --- Writes ------------------------------------------------------------------

  /**
   * Nested `evidence: { create: [...] }` -- the head and its pins are one
   * statement. Propagates a raw `P2002` on `(showId, operationalDate)` to the
   * caller; the workflow maps it to a 409 (concurrent create race).
   */
  async createReviewWithEvidence(
    input: CreateReviewPersistenceInput & { uid: string },
  ): Promise<SceneQcReviewRecord> {
    return this.txHost.tx.sceneQcReview.create({
      data: {
        uid: input.uid,
        show: { connect: { id: input.showId } },
        operationalDate: input.operationalDate,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        timezone: input.timezone,
        result: input.result,
        feedback: input.feedback,
        reviewedBy: { connect: { id: input.reviewedById } },
        reviewedAt: input.reviewedAt,
        expectedObjectKey: input.expectedObjectKey,
        expectedFileUrl: input.expectedFileUrl,
        expectedSceneType: input.expectedSceneType,
        evidence: { create: input.evidence.map(toEvidenceCreateInput) },
      },
      include: sceneQcReviewDefaultInclude,
    });
  }

  /**
   * `updateMany` with the optimistic-lock + `confirmedAt: null` predicate,
   * then evidence delete+recreate, then a fresh read -- all inside the
   * ambient transaction. Returns `null` on `count === 0` (either a stale
   * `expectedVersion` or a since-confirmed review); the workflow decides 409
   * vs 403 by re-reading.
   */
  async replaceReviewWithEvidence(input: {
    reviewId: bigint;
    expectedVersion: number;
    data: ReviewMutablePersistenceFields;
    evidence: PinnedEvidenceInput[];
  }): Promise<SceneQcReviewRecord | null> {
    const { count } = await this.txHost.tx.sceneQcReview.updateMany({
      where: { id: input.reviewId, version: input.expectedVersion, confirmedAt: null },
      data: {
        result: input.data.result,
        feedback: input.data.feedback,
        reviewedById: input.data.reviewedById,
        reviewedAt: input.data.reviewedAt,
        expectedObjectKey: input.data.expectedObjectKey,
        expectedFileUrl: input.data.expectedFileUrl,
        expectedSceneType: input.data.expectedSceneType,
        version: { increment: 1 },
      },
    });
    if (count === 0) {
      return null;
    }

    await this.txHost.tx.sceneQcReviewEvidence.deleteMany({ where: { reviewId: input.reviewId } });
    if (input.evidence.length > 0) {
      await this.txHost.tx.sceneQcReviewEvidence.createMany({
        data: input.evidence.map((evidence) => ({ reviewId: input.reviewId, ...toEvidenceCreateInput(evidence) })),
      });
    }

    return this.txHost.tx.sceneQcReview.findUniqueOrThrow({
      where: { id: input.reviewId },
      include: sceneQcReviewDefaultInclude,
    });
  }
}

/**
 * Plain scalar `sourceTaskId` (not a nested `sourceTask: { connect }`)
 * deliberately -- this shape must work identically inside a nested
 * `evidence: { create: [...] }` (createReviewWithEvidence) AND inside a flat
 * `createMany` (replaceReviewWithEvidence), and `createMany` cannot accept a
 * nested relation `connect` at all.
 */
function toEvidenceCreateInput(evidence: PinnedEvidenceInput) {
  return {
    sortOrder: evidence.sortOrder,
    sourceTaskId: evidence.sourceTaskId,
    sourceTaskUid: evidence.sourceTaskUid,
    sourceTaskVersion: evidence.sourceTaskVersion,
    sourceFieldKey: evidence.sourceFieldKey,
    sourceLabel: evidence.sourceLabel,
    objectKey: evidence.objectKey,
    fileUrl: evidence.fileUrl,
  };
}
