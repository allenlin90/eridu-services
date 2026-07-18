import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, PublishRun } from '@prisma/client';

const PUBLISH_RUN_LIST_INCLUDE = {
  schedule: { select: { uid: true } },
  triggeredBy: { select: { uid: true, name: true } },
} as const satisfies Prisma.PublishRunInclude;

export type PublishRunListRow = Prisma.PublishRunGetPayload<{
  include: typeof PUBLISH_RUN_LIST_INCLUDE;
}>;

/**
 * Engineering decision: `PublishRunRepository` does NOT extend `BaseRepository`.
 *
 * `BaseRepository<T extends WithSoftDelete>` requires a `deletedAt` column, but
 * `PublishRun` is an append-only audit-grade record like `Audit` — impact Audit
 * rows reference it via `Audit.publishRunId`, so it is never deleted. Adding a
 * dead `deletedAt` column purely to satisfy the generic constraint would
 * mis-signal the lifecycle, so this repo is a thin Prisma wrapper.
 */
@Injectable()
export class PublishRunRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  private get delegate() {
    return this.txHost.tx.publishRun;
  }

  async create(data: {
    uid: string;
    source: string;
    scheduleId: bigint;
    studioId: bigint | null;
    triggeredById: bigint | null;
  }): Promise<PublishRun> {
    return this.delegate.create({
      data: {
        uid: data.uid,
        source: data.source,
        schedule: { connect: { id: data.scheduleId } },
        ...(data.studioId != null && { studio: { connect: { id: data.studioId } } }),
        ...(data.triggeredById != null && { triggeredBy: { connect: { id: data.triggeredById } } }),
      },
    });
  }

  async updateSummary(id: bigint, summary: Record<string, unknown>): Promise<PublishRun> {
    return this.delegate.update({
      where: { id },
      data: { summary: summary as Prisma.InputJsonValue },
    });
  }

  async findByUid(uid: string): Promise<PublishRun | null> {
    return this.delegate.findUnique({ where: { uid } });
  }

  /**
   * Lean paginated run list for the studio-scoped Runs tab — no nested audit
   * rows by design; impact rows are fetched through the impacts list filtered
   * by `publish_run_id`. `id desc` tie-break mirrors the audit queries: two
   * runs created in the same transaction share `createdAt`.
   */
  async findPaginatedForStudio(
    studioUid: string,
    opts: { skip: number; take: number },
  ): Promise<{ items: PublishRunListRow[]; total: number }> {
    const where: Prisma.PublishRunWhereInput = { studio: { uid: studioUid } };

    const [total, items] = await Promise.all([
      this.delegate.count({ where }),
      this.delegate.findMany({
        where,
        include: PUBLISH_RUN_LIST_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: opts.skip,
        take: opts.take,
      }),
    ]);

    return { items, total };
  }
}
