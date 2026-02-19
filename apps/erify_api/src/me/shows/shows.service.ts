import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { McService } from '@/models/mc/mc.service';
import { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';

@Injectable()
export class ShowsService {
  constructor(
    private readonly mcService: McService,
    private readonly showService: ShowService,
  ) {}

  /**
   * Gets shows assigned to the MC linked to the given user identifier.
   * @param userIdentifier - The user identifier (uid or extId string) from JWT to find the associated MC
   * @param query - Query parameters including pagination, filters, and sorting
   * @returns Object containing shows array and total count
   */
  async getShowsForMcUser(
    userIdentifier: string,
    query: ListShowsQueryDto,
  ) {
    const mc = await this.findMcByUserIdentifier(userIdentifier);

    const where = this.buildShowWhereClause(mc.id, query);
    const orderBy = this.buildOrderByClause(query);
    const include = this.buildShowInclude();

    // Fetch shows directly with pagination and includes
    const [shows, total] = await Promise.all([
      this.showService.getShows(
        {
          where,
          skip: query.skip,
          take: query.take,
          orderBy,
        },
        include,
      ),
      this.showService.countShows(where),
    ]);

    return { shows, total };
  }

  /**
   * Gets a specific show assigned to the MC linked to the given user identifier.
   * @param userIdentifier - The user identifier (uid or extId string) from JWT to find the associated MC
   * @param showId - The show UID to retrieve
   * @returns Show details with related entities
   */
  async getShowForMcUser(userIdentifier: string, showId: string) {
    const mc = await this.findMcByUserIdentifier(userIdentifier);

    // Build where clause with MC filter and specific show ID
    const where = {
      uid: showId,
      deletedAt: null,
      showMCs: {
        some: {
          mcId: mc.id,
          deletedAt: null,
        },
      },
    };

    const include = this.buildShowInclude();

    // Query show directly with MC filter to ensure it's assigned to this MC
    const shows = await this.showService.getShows(
      {
        where,
        take: 1,
      },
      include,
    );

    if (!shows || shows.length === 0) {
      throw HttpError.notFound('Show', showId);
    }

    return shows[0];
  }

  /**
   * Finds MC by user identifier (uid or extId) and throws error if not found.
   * @param userIdentifier - The user identifier (uid or extId string) from JWT
   * @returns MC entity
   * @throws HttpError.notFound if MC is not found
   */
  private async findMcByUserIdentifier(userIdentifier: string) {
    // The JWT guard sets request.user.id as a string (uid or extId), not the bigint id
    const mc = await this.mcService.getMcByUserIdentifier(userIdentifier);

    if (!mc) {
      throw HttpError.notFound('MC', `for user ${userIdentifier}`);
    }

    return mc;
  }

  /**
   * Builds the where clause for querying shows assigned to a specific MC.
   * @param mcId - The MC's bigint ID
   * @param query - Query parameters with filters
   */
  private buildShowWhereClause(
    mcId: bigint,
    query: Pick<
      ListShowsQueryDto,
      'name' | 'start_date_from' | 'start_date_to' | 'end_date_from' | 'end_date_to' | 'include_deleted'
    >,
  ) {
    const where: Parameters<ShowService['getShows']>[0]['where'] = {
      showMCs: {
        some: {
          mcId,
          deletedAt: null,
        },
      },
    };

    // Filter out soft deleted records by default
    if (!query.include_deleted) {
      where!.deletedAt = null;
    }

    // Name filtering (case-insensitive partial match)
    if (query.name) {
      where!.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    // Date range filtering for start time
    if (query.start_date_from || query.start_date_to) {
      where!.startTime = {};
      if (query.start_date_from) {
        (where!.startTime as Record<string, Date>).gte = new Date(query.start_date_from);
      }
      if (query.start_date_to) {
        (where!.startTime as Record<string, Date>).lte = new Date(query.start_date_to);
      }
    }

    // Date range filtering for end time
    if (query.end_date_from || query.end_date_to) {
      where!.endTime = {};
      if (query.end_date_from) {
        (where!.endTime as Record<string, Date>).gte = new Date(query.end_date_from);
      }
      if (query.end_date_to) {
        (where!.endTime as Record<string, Date>).lte = new Date(query.end_date_to);
      }
    }

    return where!;
  }

  /**
   * Builds the order by clause for sorting shows.
   * @param query - Query parameters with sorting options
   */
  private buildOrderByClause(
    query: Pick<ListShowsQueryDto, 'order_by' | 'order_direction'>,
  ) {
    const fieldMap: Record<string, string> = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      start_time: 'startTime',
      end_time: 'endTime',
    };
    // Use DTO defaults if not provided
    const field = fieldMap[query.order_by || 'created_at'] || 'createdAt';
    const direction = query.order_direction || 'desc';
    return { [field]: direction };
  }

  /**
   * Builds the include clause for show queries with all related entities.
   */
  private buildShowInclude() {
    return {
      client: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
      showPlatforms: {
        include: {
          platform: true,
        },
        where: {
          deletedAt: null,
        },
      },
    } as const;
  }
}
