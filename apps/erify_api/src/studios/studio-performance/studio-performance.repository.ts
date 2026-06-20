import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  PerformanceQuery,
  PerformanceShowsQuery,
} from '@eridu/api-types/performance';

import { FINALIZED_LOOP_TASK_STATUSES } from '@/models/task/task-finalized-loop.constants';
import { PrismaService } from '@/prisma/prisma.service';

/** Show row shape returned by the performance-shows list query. */
export type PerformanceListShow = Prisma.ShowGetPayload<{
  include: {
    client: true;
    showType: true;
    showPlatforms: { include: { platform: true } };
  };
}>;

/** Show row shape for the summary / series queries (platforms only). */
export type PerformanceSummaryShow = Prisma.ShowGetPayload<{
  include: { showPlatforms: { include: { platform: true } } };
}>;

/** Show row shape for the single-show loops query (studio metadata + platforms). */
export type PerformanceLoopsShow = Prisma.ShowGetPayload<{
  include: {
    studio: { select: { metadata: true } };
    showPlatforms: { include: { platform: true } };
  };
}>;

/** Finalized task carrying its moderation snapshot (single-show loops). */
export type PerformanceLoopTask = Prisma.TaskGetPayload<{
  include: { snapshot: true };
}>;

/** Finalized task with its snapshot and target show ids (series fan-out). */
export type PerformanceSeriesTask = Prisma.TaskGetPayload<{
  include: { snapshot: true; targets: { select: { showId: true } } };
}>;

@Injectable()
export class StudioPerformanceRepository {
  /**
   * Task statuses whose snapshots are authoritative for loop-level metrics.
   * Fact extraction writes the show-level GMV/view aggregates on transition to
   * COMPLETED (see TaskOrchestrationService), so the loop breakdown must read
   * from the same finalized states — otherwise loop totals would diverge from
   * the show-level figures shown elsewhere on the dashboard. In-progress
   * statuses (incl. REVIEW) are intentionally excluded.
   *
   * Shared with `ClientMechanicRepository` via `FINALIZED_LOOP_TASK_STATUSES`
   * so "latest finalized task with a loop schema wins" stays one rule.
   */
  private static readonly LOOP_METRIC_TASK_STATUSES = FINALIZED_LOOP_TASK_STATUSES;

  /**
   * Predicate matching a single `ShowPlatform` row that carries at least one
   * recorded performance fact (GMV, CTR, CTO, or a view-count template entry).
   * Shared by the presence filter and the summary aggregation so that "has a
   * record" means the same thing in the list filter and the trend totals.
   */
  private static readonly PERFORMANCE_RECORD_OR: Prisma.ShowPlatformWhereInput['OR'] = [
    { gmv: { not: null } },
    { ctr: { not: null } },
    { cto: { not: null } },
    {
      metadata: {
        path: ['performance_templates', 'show_platform_view_count'],
        not: Prisma.JsonNull,
      },
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes an optional single value or array into a flat array.
   * Returns an empty array when the value is absent.
   */
  private toArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  /**
   * Builds the shared `Show` where clause scoping results to a studio, the
   * requested date range, and any optional client / show type / platform filters.
   */
  private buildShowWhere(
    studioUid: string,
    query: PerformanceQuery & Pick<PerformanceShowsQuery, 'name'>,
  ): Prisma.ShowWhereInput {
    const clientUids = this.toArray(query.client_id);
    const showTypeUids = this.toArray(query.show_type_id);
    const platformUids = this.toArray(query.platform_id);
    const showStandardUids = this.toArray(query.show_standard_id);
    // Trim so a whitespace-only search collapses to "no filter" rather than a
    // `contains: ' '` clause that matches every row with an interior space.
    const name = query.name?.trim();

    // Both the platform filter and the presence filter constrain the
    // `showPlatforms` relation, so they must be composed via `AND` — spreading
    // them as sibling keys would silently let the later one clobber the former.
    const andConditions: Prisma.ShowWhereInput[] = [];

    if (platformUids.length > 0) {
      andConditions.push({
        showPlatforms: {
          some: {
            deletedAt: null,
            platform: { uid: { in: platformUids } },
          },
        },
      });
    }

    // When a platform filter is active, the presence check must be scoped to
    // the same set of platforms — otherwise a show passes "With Records" because
    // a *different* platform has GMV/CTR/etc., even though the selected platform
    // row is empty. Narrowing the `some` predicate to `platformUids` keeps the
    // presence semantics consistent with what the user is actually filtering on.
    const recordedSome: Prisma.ShowWhereInput = {
      showPlatforms: {
        some: {
          deletedAt: null,
          ...(platformUids.length > 0
            ? { platform: { uid: { in: platformUids } } }
            : {}),
          OR: StudioPerformanceRepository.PERFORMANCE_RECORD_OR,
        },
      },
    };
    if (query.has_performance === 'true') {
      andConditions.push(recordedSome);
    } else if (query.has_performance === 'false') {
      andConditions.push({ NOT: recordedSome });
    }

    return {
      studio: { uid: studioUid },
      deletedAt: null,
      startTime: {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      },
      ...(clientUids.length > 0 ? { client: { uid: { in: clientUids } } } : {}),
      ...(showTypeUids.length > 0 ? { showType: { uid: { in: showTypeUids } } } : {}),
      ...(showStandardUids.length > 0 ? { showStandard: { uid: { in: showStandardUids } } } : {}),
      ...(name
        ? {
            name: {
              contains: name,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };
  }

  /**
   * Builds the where clause for the nested `showPlatforms` include, excluding
   * soft-deleted rows and narrowing to the requested platforms when filtered.
   */
  private buildShowPlatformsWhere(
    query: PerformanceQuery,
  ): Prisma.ShowPlatformWhereInput {
    const platformUids = this.toArray(query.platform_id);

    return {
      deletedAt: null,
      ...(platformUids.length > 0 ? { platform: { uid: { in: platformUids } } } : {}),
    };
  }

  findStudioLocalizationMetadata(
    studioUid: string,
  ): Promise<{ metadata: Prisma.JsonValue } | null> {
    return this.prisma.studio.findUnique({
      where: { uid: studioUid },
      select: { metadata: true },
    });
  }

  /**
   * Shows for the summary aggregation. The presence filter (`has_performance`)
   * is a list-only concern — applying it here would make the summary
   * self-referential — so it is always cleared before building the where.
   */
  findShowsForSummary(
    studioUid: string,
    query: PerformanceQuery,
  ): Promise<PerformanceSummaryShow[]> {
    return this.prisma.show.findMany({
      where: this.buildShowWhere(studioUid, { ...query, has_performance: undefined }),
      include: {
        showPlatforms: {
          where: this.buildShowPlatformsWhere(query),
          include: { platform: true },
        },
      },
    });
  }

  findShowsForList(
    studioUid: string,
    query: PerformanceShowsQuery,
    options: {
      orderBy?: Prisma.ShowOrderByWithRelationInput | Prisma.ShowOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    } = {},
  ): Promise<PerformanceListShow[]> {
    return this.prisma.show.findMany({
      where: this.buildShowWhere(studioUid, query),
      include: {
        client: true,
        showType: true,
        showPlatforms: {
          where: this.buildShowPlatformsWhere(query),
          include: { platform: true },
        },
      },
      ...options,
    });
  }

  countShows(studioUid: string, query: PerformanceShowsQuery): Promise<number> {
    return this.prisma.show.count({
      where: this.buildShowWhere(studioUid, query),
    });
  }

  findShowForLoops(
    studioUid: string,
    showUid: string,
  ): Promise<PerformanceLoopsShow | null> {
    return this.prisma.show.findFirst({
      where: {
        uid: showUid,
        studio: { uid: studioUid },
        deletedAt: null,
      },
      include: {
        studio: {
          select: {
            metadata: true,
          },
        },
        showPlatforms: {
          where: { deletedAt: null },
          include: {
            platform: true,
          },
        },
      },
    });
  }

  findFinalizedLoopTasksForShow(showId: bigint): Promise<PerformanceLoopTask[]> {
    return this.prisma.task.findMany({
      where: {
        targets: {
          some: {
            showId,
            deletedAt: null,
          },
        },
        status: {
          in: [...StudioPerformanceRepository.LOOP_METRIC_TASK_STATUSES],
        },
        deletedAt: null,
      },
      include: {
        snapshot: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Shows for the "By Show" series graph: every show matching the query (no
   * pagination), ordered by `start_time` ascending.
   */
  findShowsForSeries(
    studioUid: string,
    query: PerformanceQuery,
  ): Promise<PerformanceSummaryShow[]> {
    return this.prisma.show.findMany({
      where: this.buildShowWhere(studioUid, query),
      include: {
        showPlatforms: {
          where: this.buildShowPlatformsWhere(query),
          include: { platform: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  findFinalizedLoopTasksForShows(
    showIds: bigint[],
  ): Promise<PerformanceSeriesTask[]> {
    return this.prisma.task.findMany({
      where: {
        targets: { some: { showId: { in: showIds }, deletedAt: null } },
        status: { in: [...StudioPerformanceRepository.LOOP_METRIC_TASK_STATUSES] },
        deletedAt: null,
      },
      include: {
        snapshot: true,
        targets: { where: { deletedAt: null }, select: { showId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
