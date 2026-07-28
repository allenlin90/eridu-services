import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Prisma } from '@prisma/client';

import type {
  AppendConfirmationInput,
  ConfirmationRef,
  ConfirmationReportRow,
  ConfirmationWithScope,
  PinnedScopeItem,
} from './schemas/scene-qc-confirmation.schema';

import { HttpError } from '@/lib/errors/http-error.util';

const CONFIRMATION_REPORT_INCLUDE = {
  // Live Studio name -- a Studio rename is NOT a report-rewriting event
  // (OQ-33). Every other dimension below reads the pinned item snapshot.
  studio: { select: { uid: true, name: true } },
  confirmedBy: { select: { uid: true, name: true } },
  items: {
    select: {
      showId: true,
      reviewId: true,
      reviewVersion: true,
      showUid: true,
      showName: true,
      scheduledStartTime: true,
      clientUid: true,
      clientName: true,
      platforms: { select: { platformUid: true, platformName: true } },
      review: {
        select: {
          result: true,
          feedback: true,
          reviewedBy: { select: { uid: true, name: true } },
          reviewedAt: true,
          expectedSceneType: true,
          _count: { select: { evidence: true } },
        },
      },
    },
  },
} as const satisfies Prisma.SceneQcDailyConfirmationInclude;

/**
 * Advisory lock acquisition, confirmation reads, the append-only
 * confirmation+item+platform write, the bulk `confirmedAt` stamp, and the
 * report's item<->review join. All through `txHost.tx`. PRIVATE to
 * SceneQcModule -- providers only, never `exports`. See
 * SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.6.1/1.7.
 */
@Injectable()
export class SceneQcConfirmationRepository {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  // --- Lock --------------------------------------------------------------

  /**
   * MUST run inside an ambient CLS transaction. `pg_advisory_xact_lock` is
   * transaction-scoped: outside a transaction `txHost.tx` is the base
   * PrismaClient and the lock would be taken and released inside its own
   * implicit transaction -- silently providing NO protection. That is the
   * single most dangerous failure mode of this whole feature, so it is an
   * assertion, not a comment. Must be the FIRST statement in the transaction,
   * before any read (breakdown section 1.6.1).
   */
  async acquireDayLock(input: { studioUid: string; operationalDate: string }): Promise<void> {
    if (!this.txHost.isTransactionActive()) {
      throw HttpError.internalServerError('Scene QC confirmation lock requires an active transaction');
    }
    const lockKey = `scene-qc-confirmation:${input.studioUid}:${input.operationalDate}`;
    await this.txHost.tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
  }

  // --- Reads ---------------------------------------------------------------

  /** Latest revision + its pinned scope. Backs the summary's CURRENT/STALE state. */
  async findLatestConfirmationWithScope(input: {
    studioUid: string;
    operationalDate: Date;
  }): Promise<ConfirmationWithScope | null> {
    const confirmation = await this.txHost.tx.sceneQcDailyConfirmation.findFirst({
      where: { studio: { uid: input.studioUid }, operationalDate: input.operationalDate },
      orderBy: { revision: 'desc' },
      select: {
        id: true,
        uid: true,
        revision: true,
        confirmedAt: true,
        confirmedBy: { select: { uid: true, name: true } },
        items: { select: { showId: true, reviewId: true, reviewVersion: true } },
      },
    });
    return confirmation
      ? {
          id: confirmation.id,
          uid: confirmation.uid,
          revision: confirmation.revision,
          confirmedAt: confirmation.confirmedAt,
          confirmedBy: confirmation.confirmedBy,
          items: confirmation.items,
        }
      : null;
  }

  /** Highest revision recorded for this (studio, operational date), or 0 if none. */
  async findMaxRevision(input: { studioUid: string; operationalDate: Date }): Promise<number> {
    const result = await this.txHost.tx.sceneQcDailyConfirmation.aggregate({
      where: { studio: { uid: input.studioUid }, operationalDate: input.operationalDate },
      _max: { revision: true },
    });
    return result._max.revision ?? 0;
  }

  /**
   * A confirmation's own pinned scope + window, by internal id. Backs
   * Records detail's CURRENT/STALE resolution for a non-superseded revision
   * (OQ-42) -- the report reads the equivalent shape via
   * `findConfirmationForReport`, which already carries the full item join.
   */
  async findConfirmationScopeById(confirmationId: bigint): Promise<{
    studioId: bigint;
    operationalDate: Date;
    windowStart: Date;
    windowEnd: Date;
    timezone: string;
    items: PinnedScopeItem[];
  } | null> {
    const confirmation = await this.txHost.tx.sceneQcDailyConfirmation.findUnique({
      where: { id: confirmationId },
      select: {
        studioId: true,
        operationalDate: true,
        windowStart: true,
        windowEnd: true,
        timezone: true,
        items: { select: { showId: true, reviewId: true, reviewVersion: true } },
      },
    });
    return confirmation;
  }

  /** True when a higher revision exists for the same (studio, operational date). */
  async hasLaterRevision(input: { studioId: bigint; operationalDate: Date; revision: number }): Promise<boolean> {
    const count = await this.txHost.tx.sceneQcDailyConfirmation.count({
      where: { studioId: input.studioId, operationalDate: input.operationalDate, revision: { gt: input.revision } },
    });
    return count > 0;
  }

  /** Full report payload source: confirmation + items + platforms + each item's pinned review. */
  async findConfirmationForReport(input: {
    studioUid: string;
    confirmationUid: string;
  }): Promise<ConfirmationReportRow | null> {
    const confirmation = await this.txHost.tx.sceneQcDailyConfirmation.findFirst({
      where: { uid: input.confirmationUid, studio: { uid: input.studioUid } },
      include: CONFIRMATION_REPORT_INCLUDE,
    });
    if (!confirmation) {
      return null;
    }

    return {
      id: confirmation.id,
      uid: confirmation.uid,
      studioId: confirmation.studioId,
      studio: confirmation.studio,
      revision: confirmation.revision,
      operationalDate: confirmation.operationalDate,
      windowStart: confirmation.windowStart,
      windowEnd: confirmation.windowEnd,
      timezone: confirmation.timezone,
      confirmedBy: confirmation.confirmedBy,
      confirmedAt: confirmation.confirmedAt,
      items: confirmation.items.map((item) => ({
        showId: item.showId,
        reviewId: item.reviewId,
        reviewVersion: item.reviewVersion,
        showUid: item.showUid,
        showName: item.showName,
        scheduledStartTime: item.scheduledStartTime,
        clientUid: item.clientUid,
        clientName: item.clientName,
        platforms: item.platforms,
        review: {
          result: item.review.result,
          feedback: item.review.feedback,
          reviewedBy: item.review.reviewedBy,
          reviewedAt: item.review.reviewedAt,
          evidenceCount: item.review._count.evidence,
          expectedSceneType: item.review.expectedSceneType,
        },
      })),
    };
  }

  /**
   * Latest (max-revision) confirmation item pinning each review, plus
   * whether that revision is still the day's latest -- Records list/detail
   * (OQ-30). Two queries: the per-review latest item, then a single grouped
   * max-revision lookup for the distinct (studio, operational date) pairs
   * touched, so the "is this the day's latest" check stays batched rather
   * than one lookup per row.
   */
  async findConfirmationRefsForReviews(reviewIds: bigint[]): Promise<Map<bigint, ConfirmationRef>> {
    if (reviewIds.length === 0) {
      return new Map();
    }

    const items = await this.txHost.tx.sceneQcDailyConfirmationItem.findMany({
      where: { reviewId: { in: reviewIds } },
      select: {
        reviewId: true,
        confirmation: {
          select: {
            id: true,
            uid: true,
            revision: true,
            studioId: true,
            operationalDate: true,
            confirmedBy: { select: { uid: true, name: true } },
            confirmedAt: true,
          },
        },
      },
    });
    if (items.length === 0) {
      return new Map();
    }

    const latestByReview = new Map<bigint, (typeof items)[number]>();
    for (const item of items) {
      const existing = latestByReview.get(item.reviewId);
      if (!existing || item.confirmation.revision > existing.confirmation.revision) {
        latestByReview.set(item.reviewId, item);
      }
    }

    const dayPairs = new Map<string, { studioId: bigint; operationalDate: Date }>();
    for (const item of latestByReview.values()) {
      const key = `${item.confirmation.studioId}|${item.confirmation.operationalDate.toISOString()}`;
      dayPairs.set(key, { studioId: item.confirmation.studioId, operationalDate: item.confirmation.operationalDate });
    }

    const maxRevisions = await this.txHost.tx.sceneQcDailyConfirmation.groupBy({
      by: ['studioId', 'operationalDate'],
      where: { OR: [...dayPairs.values()] },
      _max: { revision: true },
    });
    const maxRevisionByDay = new Map<string, number>();
    for (const row of maxRevisions) {
      maxRevisionByDay.set(`${row.studioId}|${row.operationalDate.toISOString()}`, row._max.revision ?? 0);
    }

    const refs = new Map<bigint, ConfirmationRef>();
    for (const [reviewId, item] of latestByReview) {
      const dayKey = `${item.confirmation.studioId}|${item.confirmation.operationalDate.toISOString()}`;
      const maxRevisionForDay = maxRevisionByDay.get(dayKey) ?? item.confirmation.revision;
      refs.set(reviewId, {
        confirmationId: item.confirmation.id,
        confirmationUid: item.confirmation.uid,
        revision: item.confirmation.revision,
        confirmedBy: item.confirmation.confirmedBy,
        confirmedAt: item.confirmation.confirmedAt,
        isLatestRevisionForDay: item.confirmation.revision === maxRevisionForDay,
      });
    }
    return refs;
  }

  /**
   * Bulk `uid -> id` resolution for the confirmation-item platform snapshot
   * write. `EligibleShowRow.platforms` (Child PR 3, reused unmodified) only
   * carries `{ uid, name }`, so the confirmation write resolves the FK bigint
   * id itself here rather than widening that shipped read-model shape.
   * Platform is shared reference data, read directly like the capability's
   * other capability-local projections (OQ-9).
   */
  async findPlatformIdsByUid(platformUids: string[]): Promise<Map<string, bigint>> {
    if (platformUids.length === 0) {
      return new Map();
    }
    const platforms = await this.txHost.tx.platform.findMany({
      where: { uid: { in: platformUids } },
      select: { id: true, uid: true },
    });
    return new Map(platforms.map((platform) => [platform.uid, platform.id]));
  }

  // --- Writes ----------------------------------------------------------------

  /**
   * Append-only: `revision` is caller-supplied (read inside the lock via
   * `findMaxRevision` + 1). One nested statement -- confirmation, items, and
   * each item's platforms -- so no id round-trip is needed for the platform
   * children.
   */
  async appendConfirmation(
    input: AppendConfirmationInput & { uid: string },
  ): Promise<{ id: bigint; uid: string; revision: number; confirmedAt: Date; confirmedBy: { uid: string; name: string } }> {
    const confirmation = await this.txHost.tx.sceneQcDailyConfirmation.create({
      data: {
        uid: input.uid,
        studio: { connect: { uid: input.studioUid } },
        operationalDate: input.operationalDate,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        timezone: input.timezone,
        revision: input.revision,
        confirmedBy: { connect: { id: input.confirmedById } },
        confirmedAt: input.confirmedAt,
        items: {
          create: input.items.map((item) => ({
            show: { connect: { id: item.showId } },
            review: { connect: { id: item.reviewId } },
            reviewVersion: item.reviewVersion,
            showUid: item.showUid,
            showName: item.showName,
            scheduledStartTime: item.scheduledStartTime,
            client: { connect: { id: item.clientId } },
            clientUid: item.clientUid,
            clientName: item.clientName,
            platforms: {
              create: item.platforms.map((platform) => ({
                platformId: platform.platformId,
                platformUid: platform.platformUid,
                platformName: platform.platformName,
              })),
            },
          })),
        },
      },
      select: { id: true, uid: true, revision: true, confirmedAt: true, confirmedBy: { select: { uid: true, name: true } } },
    });
    return confirmation;
  }

  /**
   * `confirmedAt: null` in the predicate so a reconfirm never rewrites an
   * earlier confirmation's stamp (OQ-22). Does NOT bump `version` and does
   * NOT touch `reviewedAt`.
   */
  async markReviewsConfirmed(input: { reviewIds: bigint[]; confirmedAt: Date }): Promise<number> {
    if (input.reviewIds.length === 0) {
      return 0;
    }
    const { count } = await this.txHost.tx.sceneQcReview.updateMany({
      where: { id: { in: input.reviewIds }, confirmedAt: null },
      data: { confirmedAt: input.confirmedAt },
    });
    return count;
  }
}
