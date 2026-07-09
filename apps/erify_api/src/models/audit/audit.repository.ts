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
    opts: {
      startDateFrom: Date;
      startDateTo?: Date;
      take: number;
      skip: number;
    },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    // Engineering decision: this is a purpose-built review queue query, not a
    // generic `findMany`, because it must page AuditTarget rows joined through
    // upcoming studio-scoped Shows while filtering Audit metadata by event.
    // `impact_kind: 'stale_conflict'` rows share the same `event` value by
    // design but are served exclusively by `findPendingStaleConflictsForStudio`
    // — excluded here via `NOT` so a stale_conflict show's audit rows never
    // double up across the two sources or leak resolved rows into this queue.
    const where: Prisma.AuditTargetWhereInput = {
      targetType: 'SHOW',
      show: {
        studio: { uid: studioUid },
        startTime: {
          gte: opts.startDateFrom,
          ...(opts.startDateTo ? { lte: opts.startDateTo } : {}),
        },
        deletedAt: null,
      },
      audit: {
        metadata: {
          path: ['event'],
          equals: 'schedule_publish_impact',
        },
      },
      NOT: {
        audit: {
          metadata: {
            path: ['impact_kind'],
            equals: 'stale_conflict',
          },
        },
      },
    };

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

  /**
   * Engineering decision: needs `orderBy` + a post-query metadata filter, not
   * expressible as a plain `findMany({ where })`. The most recent
   * schedule-publish-impact Audit row for a show, filtered to
   * `impact_kind: 'stale_conflict'`. Since only one conflict can be
   * unresolved per show at a time (enforced by the showId advisory lock in
   * `ScheduleConflictService`), the newest row alone tells the caller whether
   * a conflict is currently pending: `lifecycle: 'opened'` means pending,
   * `lifecycle: 'resolved'` or no row at all means not pending.
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
            path: ['event'],
            equals: 'schedule_publish_impact',
          },
        },
      },
      include: { audit: { include: AUDIT_WITH_TARGETS_INCLUDE } },
      orderBy: [{ audit: { createdAt: 'desc' } }, { audit: { id: 'desc' } }],
    });

    if (!target) {
      return null;
    }

    const metadata = target.audit.metadata as { impact_kind?: string } | null;
    if (metadata?.impact_kind !== 'stale_conflict') {
      return null;
    }

    return target.audit;
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
   */
  async findPendingStaleConflictsForStudio(
    studioUid: string,
    opts: { take: number; skip: number },
  ): Promise<{ items: SchedulePublishImpactAuditTarget[]; total: number }> {
    const latestPerShow = await this.txHost.tx.auditTarget.findMany({
      where: {
        targetType: 'SHOW',
        show: { studio: { uid: studioUid }, deletedAt: null },
        audit: {
          metadata: {
            path: ['impact_kind'],
            equals: 'stale_conflict',
          },
        },
      },
      distinct: ['showId'],
      include: SCHEDULE_PUBLISH_IMPACT_INCLUDE,
      orderBy: { audit: { createdAt: 'desc' } },
    });

    const pending = latestPerShow.filter((target) => {
      const metadata = target.audit.metadata as { lifecycle?: string } | null;
      return metadata?.lifecycle === 'opened';
    });

    return {
      items: pending.slice(opts.skip, opts.skip + opts.take),
      total: pending.length,
    };
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
