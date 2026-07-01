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
  targets: true,
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
      default:
        throw new Error(`Unknown audit target type: ${String(target.targetType)}`);
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
      default:
        throw new Error(`Unknown audit target type: ${String(filter.targetType)}`);
    }
  }
}
