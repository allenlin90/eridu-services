import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, ShowIssue } from '@prisma/client';

import type { ShowIssueSeverity } from '@eridu/api-types/show-issues';

import type {
  ListShowIssuesFilters,
  ShowIssueWithRelations,
} from './schemas/show-issue.schema';
import { showIssueDetailInclude } from './schemas/show-issue.schema';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';

@Injectable()
export class ShowIssueRepository extends BaseRepository<
  ShowIssue,
  Prisma.ShowIssueCreateInput,
  Prisma.ShowIssueUpdateInput,
  Prisma.ShowIssueWhereInput
> {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(() => txHost.tx.showIssue));
  }

  private get delegate() {
    return this.txHost.tx.showIssue;
  }

  async create(data: Prisma.ShowIssueCreateInput): Promise<ShowIssueWithRelations> {
    return this.delegate.create({
      data,
      include: showIssueDetailInclude,
    }) as Promise<ShowIssueWithRelations>;
  }

  async findByUid(uid: string): Promise<ShowIssueWithRelations | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      include: showIssueDetailInclude,
    }) as Promise<ShowIssueWithRelations | null>;
  }

  // Reconciliation identity lookups. Both map 1:1 onto the model's unique
  // constraints (`(showCreatorId, category, origin)` and
  // `showPlatformViolationId`), so at most one active row can ever match —
  // used by ShowIssueReconciliationService to find the automated issue that
  // already owns a given source before deciding create/reopen/refresh/resolve.
  async findActiveByShowCreatorCategoryOrigin(
    showCreatorId: bigint,
    category: string,
    origin: string,
  ): Promise<ShowIssueWithRelations | null> {
    return this.delegate.findFirst({
      where: { showCreatorId, category, origin, deletedAt: null },
      include: showIssueDetailInclude,
    }) as Promise<ShowIssueWithRelations | null>;
  }

  async findActiveByShowPlatformViolationId(
    showPlatformViolationId: bigint,
  ): Promise<ShowIssueWithRelations | null> {
    return this.delegate.findFirst({
      where: { showPlatformViolationId, deletedAt: null },
      include: showIssueDetailInclude,
    }) as Promise<ShowIssueWithRelations | null>;
  }

  // Engineering decision: studio-scoped lookup joins through Show.studio,
  // since ShowIssue itself carries no direct studio FK — mirrors
  // ShowRepository.findByUidAndStudioUid. IDOR safety (a studio member must
  // not read/mutate another studio's issue by guessing a UID) depends on
  // this join staying in the WHERE clause, not applied after the fact.
  async findByUidAndStudio(uid: string, studioUid: string): Promise<ShowIssueWithRelations | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null, show: { studio: { uid: studioUid } } },
      include: showIssueDetailInclude,
    }) as Promise<ShowIssueWithRelations | null>;
  }

  // Engineering decision: the canonical studio-scoped issue list needs
  // AND-composed multi-filter where building (owner/show/category/origin/
  // severity/status equality, title search, and show-start-time range)
  // shared verbatim by the future Show Run Review summary counts per the
  // design doc ("both use the same repository `where` builder ... so the
  // summary badge and rows cannot drift"). Cannot be expressed as a
  // caller-supplied flat where clause without leaking Prisma relation
  // semantics into the service layer.
  async findPaginated(
    filters: ListShowIssuesFilters,
    opts: { skip?: number; take?: number },
  ): Promise<{ data: ShowIssueWithRelations[]; total: number }> {
    const where = this.buildWhere(filters);

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: opts.skip,
        take: opts.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: showIssueDetailInclude,
      }) as Promise<ShowIssueWithRelations[]>,
      this.delegate.count({ where }),
    ]);

    return { data, total };
  }

  /** Shared by `findPaginated` and (later) the Show Run Review issue counts. */
  buildWhere(filters: ListShowIssuesFilters): Prisma.ShowIssueWhereInput {
    const where: Prisma.ShowIssueWhereInput = {
      deletedAt: null,
      show: {
        studio: { uid: filters.studioUid },
        deletedAt: null,
        ...(filters.showUid && { uid: filters.showUid }),
        ...((filters.dateFrom || filters.dateTo) && {
          startTime: {
            ...(filters.dateFrom && { gte: filters.dateFrom }),
            ...(filters.dateTo && { lte: filters.dateTo }),
          },
        }),
      },
    };

    if (filters.ownerUid) {
      where.owner = { uid: filters.ownerUid };
    }
    // `statusIn` is checked before the exact-match `status` filter so that,
    // if a caller ever passed both, `status` (the more specific single-value
    // predicate) wins by overwriting `where.status` below. Callers should
    // only ever pass one.
    if (filters.statusIn) {
      where.status = { in: filters.statusIn };
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.severity) {
      where.severity = filters.severity;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.origin) {
      where.origin = filters.origin;
    }
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    return where;
  }

  // Engineering decision: aggregation, not simple CRUD — earns a dedicated
  // repository method per the persistence matrix (RT-05 / repository-pattern
  // -nestjs). Reuses `buildWhere` with a forced `statusIn: ['OPEN',
  // 'IN_PROGRESS']` so the unresolved-count definition can never drift from
  // the paginated issue list's own filtering. Prisma's `groupBy` omits
  // severities with zero matching rows, so every key is backfilled to 0
  // before merging in the query results — callers always get a stable shape.
  async countUnresolvedBySeverity(
    filters: ListShowIssuesFilters,
  ): Promise<Record<ShowIssueSeverity, number>> {
    const where = this.buildWhere({ ...filters, statusIn: ['OPEN', 'IN_PROGRESS'] });

    const grouped = await this.delegate.groupBy({
      by: ['severity'],
      where,
      _count: true,
    });

    const counts: Record<ShowIssueSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const row of grouped) {
      counts[row.severity as ShowIssueSeverity] = row._count;
    }
    return counts;
  }

  // Engineering decision: optimistic-lock update mirrors
  // TaskRepository.updateWithVersionCheck — the WHERE clause re-checks the
  // expected version atomically with the write (Prisma's extended
  // where-unique-input support), so a stale caller gets P2025 instead of
  // silently clobbering a concurrent edit.
  async updateWithVersionCheck(
    where: Prisma.ShowIssueWhereUniqueInput & { version?: number },
    data: Prisma.ShowIssueUpdateInput,
  ): Promise<ShowIssueWithRelations> {
    try {
      return await this.delegate.update({
        where: { ...where, deletedAt: null },
        data,
        include: showIssueDetailInclude,
      }) as ShowIssueWithRelations;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR.RecordNotFound && where.version !== undefined) {
          const existing = await this.delegate.findFirst({
            where: { uid: where.uid, deletedAt: null },
            select: { version: true },
          });

          if (!existing) {
            throw error; // Actually not found (or soft-deleted)
          }

          throw new VersionConflictError(
            'ShowIssue version is outdated',
            where.version,
            existing.version,
          );
        }
      }
      throw error;
    }
  }
}
