import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ShowPlatformViolation } from '@prisma/client';

export type ShowPlatformViolationTaskFieldScope = {
  showPlatformId: bigint;
  sourceTaskId: bigint;
  sourceFieldId: string;
};

export type CreateShowPlatformViolationRecord = {
  uid: string;
  showPlatformId: bigint;
  violationType: string;
  severity: string;
  reason: string;
  observedAt: Date;
  sourceTaskId: bigint;
  sourceFieldId: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class ShowPlatformViolationRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  private get delegate() {
    return this.txHost.tx.showPlatformViolation;
  }

  /**
   * Scope check used by `replaceForTaskField` to close the read-then-write
   * race: a ShowPlatform that was active when the extractor prefetched it
   * may have been soft-deleted before the supersede + create runs. The FK
   * still points to a row, so writes would otherwise silently land on a
   * deleted target. Returns `true` only when the platform is active under
   * the expected show.
   */
  async existsActiveInShow(showPlatformId: bigint, showId: bigint): Promise<boolean> {
    const row = await this.txHost.tx.showPlatform.findFirst({
      where: { id: showPlatformId, showId, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }

  async findActiveByTaskField(
    scope: ShowPlatformViolationTaskFieldScope,
  ): Promise<Array<Pick<ShowPlatformViolation, 'uid' | 'violationType' | 'severity'>>> {
    return this.delegate.findMany({
      where: {
        showPlatformId: scope.showPlatformId,
        sourceTaskId: scope.sourceTaskId,
        sourceFieldId: scope.sourceFieldId,
        supersededAt: null,
      },
      select: {
        uid: true,
        violationType: true,
        severity: true,
      },
    });
  }

  async supersedeActiveByTaskField(
    scope: ShowPlatformViolationTaskFieldScope,
    supersededAt: Date,
  ): Promise<Prisma.BatchPayload> {
    return this.delegate.updateMany({
      where: {
        showPlatformId: scope.showPlatformId,
        sourceTaskId: scope.sourceTaskId,
        sourceFieldId: scope.sourceFieldId,
        supersededAt: null,
      },
      data: { supersededAt },
    });
  }

  async createMany(records: CreateShowPlatformViolationRecord[]): Promise<Prisma.BatchPayload> {
    if (records.length === 0) {
      return { count: 0 };
    }

    return this.delegate.createMany({
      data: records.map((record) => ({
        uid: record.uid,
        showPlatformId: record.showPlatformId,
        violationType: record.violationType,
        severity: record.severity,
        reason: record.reason,
        observedAt: record.observedAt,
        sourceTaskId: record.sourceTaskId,
        sourceFieldId: record.sourceFieldId,
        metadata: record.metadata as Prisma.InputJsonValue,
      })),
    });
  }
}
