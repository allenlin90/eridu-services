import { Injectable } from '@nestjs/common';
import { Prisma, StudioShiftStatus } from '@prisma/client';

import type { CostsQuery } from '@eridu/api-types/costs';

import {
  deriveClientOffsetMs,
  toOperationalDayKey,
} from '@/lib/utils/operational-day.util';
import { PrismaService } from '@/prisma/prisma.service';

// Deep relation tree the cost calculators consume. Filters (`deletedAt`/
// `lineItem.deletedAt`) are part of the query, not the payload shape, so the
// derived `*WithCostRelations` payload types below stay in sync with this
// constant automatically.
const SHOW_COST_INCLUDE = {
  client: true,
  showType: true,
  showStandard: true,
  showCreators: {
    where: { deletedAt: null },
    include: {
      creator: true,
      compensationLineItemTargets: {
        where: {
          lineItem: { deletedAt: null },
        },
        include: {
          lineItem: true,
        },
      },
    },
  },
  compensationLineItemTargets: {
    where: {
      lineItem: { deletedAt: null },
    },
    include: {
      lineItem: true,
    },
  },
} satisfies Prisma.ShowInclude;

// Unlike the show include, the shift include filters `studioMemberships` to the
// requested studio so the displayed `member_role` is read from the correct
// membership when a user belongs to multiple studios — hence a builder, not a
// static constant.
function buildShiftCostInclude(studioUid: string) {
  return {
    user: {
      include: {
        studioMemberships: {
          where: {
            studio: { uid: studioUid },
            deletedAt: null,
          },
        },
      },
    },
    blocks: {
      where: { deletedAt: null },
      include: {
        compensationLineItemTargets: {
          where: {
            lineItem: { deletedAt: null },
          },
          include: {
            lineItem: true,
          },
        },
      },
    },
    compensationLineItemTargets: {
      where: {
        lineItem: { deletedAt: null },
      },
      include: {
        lineItem: true,
      },
    },
  } satisfies Prisma.StudioShiftInclude;
}

export type ShowWithCostRelations = Prisma.ShowGetPayload<{
  include: typeof SHOW_COST_INCLUDE;
}>;

export type ShiftWithCostRelations = Prisma.StudioShiftGetPayload<{
  include: ReturnType<typeof buildShiftCostInclude>;
}>;

export type CostsShowFilters = CostsQuery & { name?: string };

export type CostsShiftFilters = CostsQuery & {
  member_name?: string;
  role?: string;
  is_duty_manager?: boolean;
  status?: StudioShiftStatus;
};

@Injectable()
export class StudioCostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private buildShowWhere(
    studioUid: string,
    query: CostsShowFilters,
  ): Prisma.ShowWhereInput {
    const clientUids = this.toArray(query.client_id);
    const showTypeUids = this.toArray(query.show_type_id);
    const showStandardUids = this.toArray(query.show_standard_id);
    const name = query.name?.trim();

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
    };
  }

  private buildShiftWhere(
    studioUid: string,
    query: CostsShiftFilters,
  ): Prisma.StudioShiftWhereInput {
    const andConditions: Prisma.StudioShiftWhereInput[] = [];

    const memberName = query.member_name?.trim();
    if (memberName) {
      andConditions.push({
        user: {
          name: {
            contains: memberName,
            mode: 'insensitive',
          },
        },
      });
    }

    // `role` is the operator's persisted studio-membership role — the caller must
    // send the lowercase `STUDIO_ROLE` value (e.g. `member`/`manager`) so it
    // matches `studioMemberships.role`, which stores lowercase constants.
    if (query.role) {
      andConditions.push({
        user: {
          studioMemberships: {
            some: {
              studio: { uid: studioUid },
              role: query.role,
              deletedAt: null,
            },
          },
        },
      });
    }

    // Duty-manager is a shift-level flag, not a membership role.
    if (query.is_duty_manager !== undefined) {
      andConditions.push({ isDutyManager: query.is_duty_manager });
    }

    if (query.status) {
      andConditions.push({
        status: query.status,
      });
    }

    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    const offsetMs = deriveClientOffsetMs(startDate);
    const localStartDateStr = toOperationalDayKey(startDate, offsetMs);
    const localEndDateStr = toOperationalDayKey(endDate, offsetMs);
    const startLocalDate = new Date(`${localStartDateStr}T00:00:00Z`);
    const endLocalDate = new Date(`${localEndDateStr}T00:00:00Z`);

    return {
      studio: { uid: studioUid },
      deletedAt: null,
      date: {
        gte: startLocalDate,
        lte: endLocalDate,
      },
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
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

  findShowsForCosts(
    studioUid: string,
    query: CostsShowFilters,
    options: {
      orderBy?: Prisma.ShowOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    } = {},
  ): Promise<ShowWithCostRelations[]> {
    return this.prisma.show.findMany({
      where: this.buildShowWhere(studioUid, query),
      include: SHOW_COST_INCLUDE,
      ...options,
    });
  }

  countShows(studioUid: string, query: CostsShowFilters): Promise<number> {
    return this.prisma.show.count({
      where: this.buildShowWhere(studioUid, query),
    });
  }

  findShiftsForCosts(
    studioUid: string,
    query: CostsShiftFilters,
    options: {
      orderBy?: Prisma.StudioShiftOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    } = {},
  ): Promise<ShiftWithCostRelations[]> {
    return this.prisma.studioShift.findMany({
      where: this.buildShiftWhere(studioUid, query),
      include: buildShiftCostInclude(studioUid),
      ...options,
    });
  }

  countShifts(studioUid: string, query: CostsShiftFilters): Promise<number> {
    return this.prisma.studioShift.count({
      where: this.buildShiftWhere(studioUid, query),
    });
  }
}
