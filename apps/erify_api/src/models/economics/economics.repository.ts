import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import type { GroupedEconomicsFilters } from './schemas/economics.schema';

import { StudioShiftWithRelations } from '@/models/studio-shift/studio-shift.repository';

// ============================================================================
// Typed result shapes for ShowCreator with creator + show
// ============================================================================

const showCreatorWithCreatorInclude = {
  creator: true,
} as const;

export type ShowCreatorWithCreator = Prisma.ShowCreatorGetPayload<{
  include: typeof showCreatorWithCreatorInclude;
}>;

// ============================================================================
// Typed result shapes for Show with grouped query relations
// ============================================================================

const showForGroupedQueryInclude = {
  client: true,
  Schedule: true,
  showCreators: {
    where: { deletedAt: null },
    include: { creator: true },
  },
} as const;

export type ShowWithGroupedRelations = Prisma.ShowGetPayload<{
  include: typeof showForGroupedQueryInclude;
}>;

@Injectable()
export class EconomicsRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  private get tx() {
    return this.txHost.tx;
  }

  /**
   * Find all ShowCreators for the given shows, including their Creator defaults.
   * Returns in one query to avoid N+1.
   */
  async findShowCreatorsWithDefaults(showIds: bigint[]): Promise<ShowCreatorWithCreator[]> {
    return this.tx.showCreator.findMany({
      where: {
        showId: { in: showIds },
        deletedAt: null,
      },
      include: showCreatorWithCreatorInclude,
    }) as Promise<ShowCreatorWithCreator[]>;
  }

  /**
   * Find all shifts with blocks overlapping the given time window for a studio.
   * Reuses the same overlap logic as StudioShiftRepository.findByStudioAndBlockWindow().
   */
  async findOverlappingShifts(
    studioUid: string,
    start: Date,
    end: Date,
  ): Promise<StudioShiftWithRelations[]> {
    return this.tx.studioShift.findMany({
      where: {
        studio: { uid: studioUid, deletedAt: null },
        deletedAt: null,
        status: { not: 'CANCELLED' },
        blocks: {
          some: {
            deletedAt: null,
            startTime: { lt: end },
            endTime: { gt: start },
          },
        },
      },
      include: {
        user: true,
        studio: true,
        blocks: {
          where: {
            deletedAt: null,
            startTime: { lt: end },
            endTime: { gt: start },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    }) as Promise<StudioShiftWithRelations[]>;
  }

  /**
   * Find shows within a studio matching the given filters for grouped economics.
   */
  async findShowsForGroupedQuery(
    studioUid: string,
    filters: GroupedEconomicsFilters,
  ): Promise<ShowWithGroupedRelations[]> {
    const where: Prisma.ShowWhereInput = {
      studio: { uid: studioUid, deletedAt: null },
      deletedAt: null,
      startTime: { gte: filters.dateFrom },
      endTime: { lte: filters.dateTo },
    };

    if (filters.clientUid) {
      where.client = { uid: filters.clientUid };
    }

    if (filters.scheduleUid) {
      where.Schedule = { uid: filters.scheduleUid };
    }

    return this.tx.show.findMany({
      where,
      include: showForGroupedQueryInclude,
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Find a single show by UID with client and showCreators (including their creators).
   */
  async findShowWithEconomicsRelations(showUid: string): Promise<ShowWithGroupedRelations | null> {
    return this.tx.show.findFirst({
      where: { uid: showUid, deletedAt: null },
      include: showForGroupedQueryInclude,
    });
  }
}
