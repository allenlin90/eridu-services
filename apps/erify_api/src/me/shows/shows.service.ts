import { Injectable } from '@nestjs/common';
import { MC, Prisma } from '@prisma/client';

import { HttpError } from '@/common/errors/http-error.util';
import { McService } from '@/models/mc/mc.service';
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
   * @param params - Optional pagination and ordering parameters
   * @returns Object containing shows array and total count
   */
  async getShowsForMcUser(
    userIdentifier: string,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
    },
  ) {
    const mc = await this.findMcByUserIdentifier(userIdentifier);

    const where = this.buildShowWhereClause(mc.id);
    const orderBy = params?.orderBy ?? { startTime: 'asc' };
    const include = this.buildShowInclude();

    // Fetch shows directly with pagination and includes
    const [shows, total] = await Promise.all([
      this.showService.getShows(
        {
          where,
          skip: params?.skip,
          take: params?.take,
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

    const where = this.buildShowWhereClause(mc.id, showId);
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
  private async findMcByUserIdentifier(userIdentifier: string): Promise<MC> {
    // The JWT guard sets request.user.id as a string (uid or extId), not the bigint id
    const [mc] = await this.mcService.getMcs({
      where: {
        deletedAt: null,
        user: {
          OR: [{ uid: userIdentifier }, { extId: userIdentifier }],
          deletedAt: null,
        },
      },
      take: 1,
    });

    if (!mc) {
      throw HttpError.notFound('MC', `for user ${userIdentifier}`);
    }

    return mc;
  }

  /**
   * Builds the where clause for querying shows assigned to a specific MC.
   * @param mcId - The MC's bigint ID
   * @param showId - Optional show UID to filter by specific show
   * @returns Prisma ShowWhereInput
   */
  private buildShowWhereClause(
    mcId: bigint,
    showId?: string,
  ): Prisma.ShowWhereInput {
    const where: Prisma.ShowWhereInput = {
      deletedAt: null,
      showMCs: {
        some: {
          mcId,
          deletedAt: null,
        },
      },
    };

    if (showId) {
      where.uid = showId;
    }

    return where;
  }

  /**
   * Builds the include clause for show queries with all related entities.
   * @returns Prisma ShowInclude with client, studioRoom, showType, showStatus, showStandard, and showPlatforms
   */
  private buildShowInclude(): Prisma.ShowInclude {
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
    };
  }
}
