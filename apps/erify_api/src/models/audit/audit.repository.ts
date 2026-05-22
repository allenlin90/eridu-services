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
} as const satisfies Prisma.AuditInclude;

/**
 * Engineering decision: `AuditRepository` does NOT extend `BaseRepository`.
 *
 * `BaseRepository<T extends WithSoftDelete>` requires a `deletedAt` column,
 * but the `Audit` envelope is intentionally append-only per
 * `TASK_INPUT_FACT_BINDING_DESIGN.md` §2.B — deletes on target entities
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

    const orConditions: Prisma.AuditTargetWhereInput[] = filters.map((f) => {
      switch (f.targetType) {
        case 'SHOW':
          return { showId: f.targetId };
        case 'SHOW_CREATOR':
          return { showCreatorId: f.targetId };
        case 'SHOW_PLATFORM':
          return { showPlatformId: f.targetId };
        case 'STUDIO_SHIFT':
          return { studioShiftId: f.targetId };
        default: {
          const exhaustive: never = f.targetType;
          throw new Error(`Unknown audit target type: ${exhaustive}`);
        }
      }
    });

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
}
