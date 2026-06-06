import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ShowPlatform } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type ShowPlatformWithIncludes<T extends Prisma.ShowPlatformInclude> =
  Prisma.ShowPlatformGetPayload<{
    include: T;
  }>;

// Custom model wrapper that implements IBaseModel with ShowPlatformWhereInput

@Injectable()
export class ShowPlatformRepository extends BaseRepository<
  ShowPlatform,
  Prisma.ShowPlatformCreateInput,
  Prisma.ShowPlatformUpdateInput,
  Prisma.ShowPlatformWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.showPlatform));
  }

  private get delegate() {
    return this.txHost.tx.showPlatform;
  }

  async findByUid<T extends Prisma.ShowPlatformInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T> | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    });
  }

  // Engineering decision: compound (showId, platformId) lookup uses findFirst rather than
  // findMany to return a single nullable result directly. The composite index semantics
  // (one active assignment per show+platform pair) make a named method clearer than
  // passing a where clause from the service for every caller.
  async findByShowAndPlatform(
    showId: bigint,
    platformId: bigint,
  ): Promise<ShowPlatform | null> {
    return this.delegate.findFirst({
      where: { showId, platformId, deletedAt: null },
    });
  }

  async findPaginated(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowPlatformOrderByWithRelationInput;
    include?: Prisma.ShowPlatformInclude;
    where?: Prisma.ShowPlatformWhereInput;
  }): Promise<{ data: ShowPlatform[]; total: number }> {
    const { skip, take, orderBy, include, where } = params;
    const delegate = this.delegate;

    const queryWhere: Prisma.ShowPlatformWhereInput = {
      ...where,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      delegate.findMany({
        where: queryWhere,
        skip,
        take,
        orderBy,
        ...(include && { include }),
      }),
      delegate.count({ where: queryWhere }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.ShowPlatformCreateInput, include?: Record<string, any>): Promise<ShowPlatform> {
    return this.delegate.create({ data, ...(include && { include }) });
  }

  async update(where: Prisma.ShowPlatformWhereUniqueInput, data: Prisma.ShowPlatformUpdateInput, include?: Record<string, any>): Promise<ShowPlatform> {
    return this.delegate.update({ where, data, ...(include && { include }) });
  }

  async updateMany(where: Prisma.ShowPlatformWhereInput, data: Prisma.ShowPlatformUpdateManyMutationInput): Promise<Prisma.BatchPayload> {
    return this.delegate.updateMany({ where, data });
  }

  /**
   * Atomically write a single performance metric column AND merge its
   * provenance entry into `metadata.performance_templates` in one UPDATE.
   *
   * The metadata merge uses a JSON concat (`||`) evaluated against the row's
   * CURRENT value, so it only ever touches the one `factKey` it owns. This
   * avoids the read-modify-write lost-update where two concurrent task
   * submissions writing DIFFERENT metrics each replace the whole metadata
   * blob and drop the other's provenance — which could leave a protected
   * post-production value overwriteable by a loop-8 task (Codex P1 on PR #132).
   *
   * `column` is a fixed snake_case identifier from a closed union, never user
   * input, so interpolating it via `Prisma.raw` is injection-safe; all values
   * are parameterised. Returns the affected row count (0 when the
   * `{ uid, showId, deletedAt: null }` predicate matches nothing — a stale
   * target the caller converts to `target_stale`).
   */
  async updatePerformanceMetric(params: {
    uid: string;
    showId: bigint;
    column: 'gmv' | 'viewer_count' | 'ctr' | 'cto';
    value: Prisma.Decimal | number;
    factKey: string;
    templateUid: string;
  }): Promise<number> {
    const { uid, showId, column, value, factKey, templateUid } = params;
    return this.txHost.tx.$executeRaw(Prisma.sql`
      UPDATE "show_platform"
      SET ${Prisma.raw(`"${column}"`)} = ${value},
          "metadata" = jsonb_set(
            COALESCE("metadata", '{}'::jsonb),
            '{performance_templates}',
            COALESCE("metadata" #> '{performance_templates}', '{}'::jsonb)
              || jsonb_build_object(${factKey}::text, ${templateUid}::text),
            true
          )
      WHERE "uid" = ${uid} AND "show_id" = ${showId} AND "deleted_at" IS NULL
    `);
  }

  async softDelete(where: Prisma.ShowPlatformWhereUniqueInput): Promise<ShowPlatform> {
    return this.delegate.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async restore(where: Prisma.ShowPlatformWhereUniqueInput): Promise<ShowPlatform> {
    return this.delegate.update({
      where,
      data: { deletedAt: null },
    });
  }

  // Override: intentionally does NOT auto-apply deletedAt: null (unlike BaseRepository.findMany).
  // Both callers (replaceShowPlatforms, replacePlatformsForShow) need soft-deleted records
  // to implement restore-on-add semantics. Callers that need only active records must include
  // deletedAt: null in their where clause explicitly.
  async findMany(params: {
    where?: Prisma.ShowPlatformWhereInput;
    include?: Prisma.ShowPlatformInclude;
  }): Promise<ShowPlatform[]> {
    return this.delegate.findMany(params);
  }

  /**
   * Batch-creates ShowPlatform assignments by internal IDs (domain-level).
   * Uses createMany for a single DB round-trip.
   */
  async createManyAssignments(items: Array<{
    uid: string;
    showId: bigint;
    platformId: bigint;
    metadata?: object;
  }>): Promise<Prisma.BatchPayload> {
    return this.delegate.createMany({
      data: items.map((item) => ({
        uid: item.uid,
        showId: item.showId,
        platformId: item.platformId,
        liveStreamLink: null,
        platformShowId: null,
        viewerCount: 0,
        metadata: item.metadata ?? {},
      })),
    });
  }

  /**
   * Creates a ShowPlatform assignment by internal IDs (domain-level).
   * Builds Prisma relation syntax internally.
   */
  async createAssignment(params: {
    uid: string;
    showId: bigint;
    platformId: bigint;
    liveStreamLink?: string | null;
    platformShowId?: string | null;
    viewerCount?: number;
    metadata?: object;
  }): Promise<ShowPlatform> {
    return this.delegate.create({
      data: {
        uid: params.uid,
        show: { connect: { id: params.showId } },
        platform: { connect: { id: params.platformId } },
        liveStreamLink: params.liveStreamLink ?? null,
        platformShowId: params.platformShowId ?? null,
        viewerCount: params.viewerCount ?? 0,
        metadata: params.metadata ?? {},
      },
    });
  }

  /**
   * Restores a soft-deleted ShowPlatform assignment and updates its fields, identified by internal ID.
   */
  async restoreAndUpdateAssignment(id: bigint, params: {
    liveStreamLink?: string | null;
    platformShowId?: string | null;
    viewerCount?: number;
    metadata?: object;
  }): Promise<ShowPlatform> {
    return this.delegate.update({
      where: { id },
      data: {
        liveStreamLink: params.liveStreamLink,
        platformShowId: params.platformShowId,
        viewerCount: params.viewerCount,
        metadata: params.metadata,
        deletedAt: null,
      },
    });
  }

  /**
   * Soft-deletes all ShowPlatform records for a given show (domain-level).
   */
  async softDeleteAllByShowId(showId: bigint): Promise<void> {
    await this.delegate.updateMany({
      where: { showId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft-deletes ShowPlatform records by internal Platform IDs for a given show (domain-level).
   */
  async softDeleteByPlatformIds(showId: bigint, platformIds: bigint[]): Promise<void> {
    await this.delegate.updateMany({
      where: { showId, platformId: { in: platformIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
