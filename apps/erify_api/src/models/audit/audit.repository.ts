import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import type {
  AuditTargetFilter,
  AuditWithTargets,
  CreateAuditPayload,
  CreateAuditTargetPayload,
} from './schemas/audit.schema';

import { PrismaService } from '@/prisma/prisma.service';

const AUDIT_WITH_TARGETS_INCLUDE = {
  targets: {
    include: {
      show: { select: { uid: true } },
      showCreator: { select: { uid: true } },
      showPlatform: { select: { uid: true } },
      studioShift: { select: { uid: true } },
    },
  },
  actor: {
    select: {
      uid: true,
    },
  },
} as const satisfies Prisma.AuditInclude;

const SCHEDULE_PUBLISH_IMPACT_INCLUDE = {
  audit: true,
  show: {
    select: {
      uid: true,
      externalId: true,
      name: true,
      startTime: true,
      endTime: true,
      client: {
        select: {
          uid: true,
          name: true,
        },
      },
      showStatus: {
        select: {
          name: true,
          systemKey: true,
        },
      },
    },
  },
} as const satisfies Prisma.AuditTargetInclude;

export type SchedulePublishImpactAuditTarget = Prisma.AuditTargetGetPayload<{
  include: typeof SCHEDULE_PUBLISH_IMPACT_INCLUDE;
}>;

/**
 * Shared filter set for the schedule-publish-impacts review queries. The list
 * rows and the KPI summary counts must both derive from these builders so the
 * two can never drift.
 */
export type SchedulePublishImpactQueryFilters = {
  /** Show-time range (`Show.startTime`). */
  startDateFrom?: Date;
  startDateTo?: Date;
  /** Change-time range (`Audit.createdAt`). */
  changedFrom?: Date;
  changedTo?: Date;
  /**
   * Non-stale impact kinds to include; omit for every non-stale kind.
   * `stale_conflict` is never served by the confirmed-future query — it is
   * owned by the pending-stale query.
   */
  impactKinds?: string[];
  /** Internal `PublishRun.id` to scope to one publish batch. */
  publishRunId?: bigint;
};

/**
 * Engineering decision: `AuditRepository` does NOT extend `BaseRepository`.
 *
 * `BaseRepository<T extends WithSoftDelete>` requires a `deletedAt` column,
 * but the `Audit` envelope is intentionally append-only per
 * TASK_INPUT_FACT_BINDING.md §2.B — deletes on target entities
 * cascade only into the `AuditTarget` junction, never the parent envelope.
 * Adding a dead `deletedAt` column purely to satisfy a generic constraint
 * would mis-signal the lifecycle, so this repo is a thin Prisma wrapper.
 */
@Injectable()
export class AuditRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  private get delegate() {
    return this.txHost.tx.audit;
  }

  async create(payload: CreateAuditPayload): Promise<AuditWithTargets> {
    const data: Prisma.AuditCreateInput = {
      uid: payload.uid,
      action: payload.action,
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent ?? null,
      reason: payload.reason ?? null,
      metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue,
      ...(payload.actorId != null && {
        actor: { connect: { id: payload.actorId } },
      }),
      ...(payload.publishRunId != null && {
        publishRun: { connect: { id: payload.publishRunId } },
      }),
      targets: {
        create: payload.targets.map((t) => this.toTargetCreateInput(t)),
      },
    };

    return this.delegate.create({
      data,
      include: AUDIT_WITH_TARGETS_INCLUDE,
    });
  }

  async findByUid(uid: string): Promise<AuditWithTargets | null> {
    return this.delegate.findUnique({
      where: { uid },
      include: AUDIT_WITH_TARGETS_INCLUDE,
    });
  }

  /**
   * Returns audits attached to any of the given target tuples, newest first.
   *
   * Each tuple is matched against the typed FK column corresponding to its
   * `targetType` so the query uses the per-FK indexes (`audit_targets_show_id_idx`,
   * etc.) instead of a polymorphic `(target_type, target_id)` scan.
   */
  async findForTargets(
    filters: AuditTargetFilter[],
    opts?: { take?: number; skip?: number },
  ): Promise<AuditWithTargets[]> {
    if (filters.length === 0) {
      return [];
    }

    const orConditions: Prisma.AuditTargetWhereInput[] = filters.map((f) =>
      this.toTargetWhereInput(f));

    return this.delegate.findMany({
      where: {
        targets: {
          some: { OR: orConditions },
        },
      },
      include: AUDIT_WITH_TARGETS_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: opts?.skip,
      take: opts?.take,
    });
  }

  async countForTargets(filters: AuditTargetFilter[]): Promise<number> {
    // Engineering decision: this abstracts the polymorphic target filtering mapping
    // to Prisma where inputs, encapsulating database schema details within the repository.
    if (filters.length === 0) {
      return 0;
    }

    const orConditions: Prisma.AuditTargetWhereInput[] = filters.map((f) =>
      this.toTargetWhereInput(f));

    return this.txHost.tx.audit.count({
      where: {
        targets: {
          some: { OR: orConditions },
        },
      },
    });
  }

  async findSchedulePublishImpactsForStudio(
    studioUid: string,
    opts: SchedulePublishImpactQueryFilters & {
      take: number;
      skip: number;
    },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    const where = this.buildConfirmedFutureImpactWhere(studioUid, opts);

    const [total, items] = await Promise.all([
      this.txHost.tx.auditTarget.count({ where }),
      this.txHost.tx.auditTarget.findMany({
        where,
        include: SCHEDULE_PUBLISH_IMPACT_INCLUDE,
        orderBy: {
          audit: {
            createdAt: 'desc',
          },
        },
        skip: opts.skip,
        take: opts.take,
      }),
    ]);

    return { items, total };
  }

  /** Count-only variant sharing `buildConfirmedFutureImpactWhere` with the list. */
  async countSchedulePublishImpactsForStudio(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters,
  ): Promise<number> {
    return this.txHost.tx.auditTarget.count({
      where: this.buildConfirmedFutureImpactWhere(studioUid, filters),
    });
  }

  /**
   * Engineering decision: this is a purpose-built review queue query, not a
   * generic `findMany`, because it must page AuditTarget rows joined through
   * studio-scoped Shows while filtering Audit metadata by event.
   * `impact_kind: 'stale_conflict'` rows share the same `event` value by
   * design but are served exclusively by `findPendingStaleConflictsForStudio`
   * — excluded here via `NOT` so a stale_conflict show's audit rows never
   * double up across the two sources or leak resolved rows into this queue.
   *
   * Show-time bounds are optional here; the caller (service layer) decides
   * whether the implicit "upcoming only" default applies — an explicit
   * impact-kind, publish-run, or change-time filter must be able to reach
   * past-show rows (e.g. `past_show_creator_backfilled`).
   */
  private buildConfirmedFutureImpactWhere(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters,
  ): Prisma.AuditTargetWhereInput {
    return {
      targetType: 'SHOW',
      show: {
        studio: { uid: studioUid },
        ...(filters.startDateFrom || filters.startDateTo
          ? {
              startTime: {
                ...(filters.startDateFrom ? { gte: filters.startDateFrom } : {}),
                ...(filters.startDateTo ? { lte: filters.startDateTo } : {}),
              },
            }
          : {}),
        deletedAt: null,
      },
      audit: {
        metadata: {
          path: ['event'],
          equals: 'schedule_publish_impact',
        },
        ...(filters.changedFrom || filters.changedTo
          ? {
              createdAt: {
                ...(filters.changedFrom ? { gte: filters.changedFrom } : {}),
                ...(filters.changedTo ? { lte: filters.changedTo } : {}),
              },
            }
          : {}),
        ...(filters.publishRunId !== undefined
          ? { publishRunId: filters.publishRunId }
          : {}),
      },
      ...(filters.impactKinds?.length
        ? {
            OR: filters.impactKinds.map((kind) => ({
              audit: {
                metadata: {
                  path: ['impact_kind'],
                  equals: kind,
                },
              },
            })),
          }
        : {}),
      NOT: {
        audit: {
          metadata: {
            path: ['impact_kind'],
            equals: 'stale_conflict',
          },
        },
      },
    };
  }

  /**
   * Engineering decision: needs `orderBy`, not expressible as a plain
   * `findMany({ where })`. The most recent `impact_kind: 'stale_conflict'`
   * Audit row for a show. Since only one conflict can be unresolved per show
   * at a time (enforced by the showId advisory lock in
   * `ScheduleConflictService`), the newest stale_conflict row alone tells the
   * caller whether a conflict is currently pending: `lifecycle: 'opened'`
   * means pending, `lifecycle: 'resolved'` or no row at all means not
   * pending.
   *
   * Filters on `impact_kind: 'stale_conflict'` directly in the `where`
   * clause, not `event: 'schedule_publish_impact'` filtered after the fact —
   * a show can have both stale_conflict rows and unrelated
   * confirmed_future_* event rows in its audit history (e.g. a scalar field
   * change written outside any actuals-gated diff), and picking the single
   * newest event of any kind could return a non-stale row and mask a
   * genuinely pending conflict opened earlier.
   *
   * `createdAt` ties: `reconcileShowConflict` can write a resolved row and
   * its replacement opened row in the same transaction, and Postgres'
   * `now()` (backing `@default(now())`) returns the same value for every
   * statement in one transaction — so `createdAt` alone can't tell those two
   * rows apart. `audit.id` (autoincrement, insertion-ordered) breaks the tie.
   */
  async findLatestScheduleConflictForShow(showId: bigint): Promise<AuditWithTargets | null> {
    const target = await this.txHost.tx.auditTarget.findFirst({
      where: {
        targetType: 'SHOW',
        showId,
        audit: {
          metadata: {
            path: ['impact_kind'],
            equals: 'stale_conflict',
          },
        },
      },
      include: { audit: { include: AUDIT_WITH_TARGETS_INCLUDE } },
      orderBy: [{ audit: { createdAt: 'desc' } }, { audit: { id: 'desc' } }],
    });

    return target?.audit ?? null;
  }

  /**
   * Engineering decision: purpose-built review-queue query, not a generic
   * `findMany`. All shows in a studio with a currently-pending `stale_conflict`
   * — no date filter, since past-dated shows are the entire point of this kind
   * (spec: "the default (no explicit filters) view returns unresolved
   * stale_conflict rows regardless of the show's date"). Uses Prisma's
   * `distinct` + `orderBy` to get one row per show (the newest), then filters
   * to `lifecycle: 'opened'` in application code — Prisma can't express
   * "opened with no later resolved row for the same conflict_uid" as a plain
   * relational `where`.
   *
   * `createdAt` ties: `reconcileShowConflict` can write a resolved row and its
   * replacement opened row in the same transaction, and Postgres' `now()`
   * (backing `@default(now())`) returns the same value for every statement in
   * one transaction — `distinct` with only `createdAt desc` could then pick
   * the resolved row over its replacement for a given show. `audit.id desc`
   * as a secondary sort key breaks the tie, same as `findLatestScheduleConflictForShow`.
   */
  async findPendingStaleConflictsForStudio(
    studioUid: string,
    opts: SchedulePublishImpactQueryFilters & { take: number; skip: number },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    const pending = await this.pendingStaleConflictsForStudio(studioUid, opts);

    return {
      items: pending.slice(opts.skip, opts.skip + opts.take),
      total: pending.length,
    };
  }

  /** Count-only variant sharing `pendingStaleConflictsForStudio` with the list. */
  async countPendingStaleConflictsForStudio(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters,
  ): Promise<number> {
    return (await this.pendingStaleConflictsForStudio(studioUid, filters)).length;
  }

  /**
   * Resolved stale-conflict history for the studio: the `lifecycle: 'resolved'`
   * Audit rows written by `ScheduleConflictService.writeResolved`, optionally
   * narrowed to specific outcomes.
   *
   * Unlike the pending queue there is no latest-per-show computation —
   * resolution rows are append-only history where each row is one resolved
   * conflict episode — so every filter (including change-time and publish-run,
   * which the pending queue must apply post-distinct) is safe directly in the
   * DB `where`, and skip/take paginate in the database.
   */
  async findResolvedStaleConflictsForStudio(
    studioUid: string,
    opts: SchedulePublishImpactQueryFilters & {
      outcomes?: string[];
      take: number;
      skip: number;
    },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    const where = this.buildResolvedStaleConflictWhere(studioUid, opts);

    const [total, items] = await Promise.all([
      this.txHost.tx.auditTarget.count({ where }),
      this.txHost.tx.auditTarget.findMany({
        where,
        include: SCHEDULE_PUBLISH_IMPACT_INCLUDE,
        orderBy: [{ audit: { createdAt: 'desc' } }, { audit: { id: 'desc' } }],
        skip: opts.skip,
        take: opts.take,
      }),
    ]);

    return { items, total };
  }

  /** Count-only variant sharing `buildResolvedStaleConflictWhere` with the list. */
  async countResolvedStaleConflictsForStudio(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters & { outcomes?: string[] },
  ): Promise<number> {
    return this.txHost.tx.auditTarget.count({
      where: this.buildResolvedStaleConflictWhere(studioUid, filters),
    });
  }

  private buildResolvedStaleConflictWhere(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters & { outcomes?: string[] },
  ): Prisma.AuditTargetWhereInput {
    return {
      targetType: 'SHOW',
      show: {
        studio: { uid: studioUid },
        ...(filters.startDateFrom || filters.startDateTo
          ? {
              startTime: {
                ...(filters.startDateFrom ? { gte: filters.startDateFrom } : {}),
                ...(filters.startDateTo ? { lte: filters.startDateTo } : {}),
              },
            }
          : {}),
        deletedAt: null,
      },
      audit: {
        AND: [
          { metadata: { path: ['impact_kind'], equals: 'stale_conflict' } },
          { metadata: { path: ['lifecycle'], equals: 'resolved' } },
          ...(filters.outcomes?.length
            ? [{
                OR: filters.outcomes.map((outcome) => ({
                  metadata: { path: ['outcome'], equals: outcome },
                })),
              }]
            : []),
        ],
        ...(filters.changedFrom || filters.changedTo
          ? {
              createdAt: {
                ...(filters.changedFrom ? { gte: filters.changedFrom } : {}),
                ...(filters.changedTo ? { lte: filters.changedTo } : {}),
              },
            }
          : {}),
        ...(filters.publishRunId !== undefined
          ? { publishRunId: filters.publishRunId }
          : {}),
      },
    };
  }

  /**
   * Change-time and publish-run filters are applied AFTER the latest-per-show
   * + `lifecycle: 'opened'` computation, never inside the DB `where`: filtering
   * before `distinct` could pick an older 'opened' row as a show's "latest"
   * when the true latest row (a 'resolved' one from a later publish) falls
   * outside the filter — misreporting an already-resolved conflict as pending.
   * Show-scoped filters (studio, start-time) are safe in the `where` because
   * they never change which audit row is a given show's latest.
   */
  private async pendingStaleConflictsForStudio(
    studioUid: string,
    filters: SchedulePublishImpactQueryFilters,
  ): Promise<SchedulePublishImpactAuditTarget[]> {
    const latestPerShow = await this.txHost.tx.auditTarget.findMany({
      where: {
        targetType: 'SHOW',
        show: {
          studio: { uid: studioUid },
          ...(filters.startDateFrom || filters.startDateTo
            ? {
                startTime: {
                  ...(filters.startDateFrom ? { gte: filters.startDateFrom } : {}),
                  ...(filters.startDateTo ? { lte: filters.startDateTo } : {}),
                },
              }
            : {}),
          deletedAt: null,
        },
        audit: {
          metadata: {
            path: ['impact_kind'],
            equals: 'stale_conflict',
          },
        },
      },
      distinct: ['showId'],
      include: SCHEDULE_PUBLISH_IMPACT_INCLUDE,
      orderBy: [{ audit: { createdAt: 'desc' } }, { audit: { id: 'desc' } }],
    });

    return latestPerShow.filter((target) => {
      const metadata = target.audit.metadata as { lifecycle?: string } | null;
      if (metadata?.lifecycle !== 'opened') {
        return false;
      }
      if (filters.changedFrom && target.audit.createdAt < filters.changedFrom) {
        return false;
      }
      if (filters.changedTo && target.audit.createdAt > filters.changedTo) {
        return false;
      }
      if (filters.publishRunId !== undefined && target.audit.publishRunId !== filters.publishRunId) {
        return false;
      }
      return true;
    });
  }

  private toTargetCreateInput(
    target: CreateAuditTargetPayload,
  ): Prisma.AuditTargetCreateWithoutAuditInput {
    const base = {
      targetType: target.targetType,
      targetId: target.targetId,
    };

    switch (target.targetType) {
      case 'SHOW':
        return { ...base, show: { connect: { id: target.targetId } } };
      case 'SHOW_CREATOR':
        return { ...base, showCreator: { connect: { id: target.targetId } } };
      case 'SHOW_PLATFORM':
        return { ...base, showPlatform: { connect: { id: target.targetId } } };
      case 'STUDIO_SHIFT':
        return { ...base, studioShift: { connect: { id: target.targetId } } };
      default: {
        const exhaustive: never = target.targetType;
        throw new Error(`Unknown audit target type: ${exhaustive}`);
      }
    }
  }

  private toTargetWhereInput(
    filter: AuditTargetFilter,
  ): Prisma.AuditTargetWhereInput {
    switch (filter.targetType) {
      case 'SHOW':
        return { showId: filter.targetId };
      case 'SHOW_CREATOR':
        return { showCreatorId: filter.targetId };
      case 'SHOW_PLATFORM':
        return { showPlatformId: filter.targetId };
      case 'STUDIO_SHIFT':
        return { studioShiftId: filter.targetId };
      default: {
        const exhaustive: never = filter.targetType;
        throw new Error(`Unknown audit target type: ${exhaustive}`);
      }
    }
  }
}
