import { Injectable } from '@nestjs/common';
import { Prisma, Show } from '@prisma/client';

import {
  CreateShowWithAssignmentsDto,
  UpdateShowWithAssignmentsDto,
} from './schemas/show-orchestration.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { PrismaService, TransactionClient } from '@/prisma/prisma.service';

type ShowWithIncludes<T extends Prisma.ShowInclude> = Prisma.ShowGetPayload<{
  include: T;
}>;

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly showMcService: ShowMcService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly prisma: PrismaService,
  ) {}

  async createShowWithAssignments(
    data: CreateShowWithAssignmentsDto,
  ): Promise<Show | ShowWithIncludes<Prisma.ShowInclude>> {
    const payload = this.createShowPayload(data);

    return this.showService.createShow(payload, this.getDefaultIncludes());
  }

  /**
   * Retrieves shows with all relations (MCs, platforms, clients, etc.).
   *
   * @param params - Query parameters
   * @param include - Optional Prisma include for relations
   * @returns Shows with relations
   */
  async getShowsWithRelations<
    T extends Prisma.ShowInclude = Record<string, never>,
  >(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ShowWhereInput;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
    },
    include?: T,
  ): Promise<Show[] | ShowWithIncludes<T>[]> {
    return this.showService.getActiveShows({
      ...params,
      include: include || this.getDefaultIncludes(),
    });
  }

  /**
   * Retrieves paginated shows with filtering and full relations.
   *
   * @param query - Query parameters with filtering
   * @returns Object with shows array and total count
   */
  async getPaginatedShowsWithRelations(query: ListShowsQueryDto): Promise<{
    shows: ShowWithIncludes<Prisma.ShowInclude>[];
    total: number;
  }> {
    const where = this.buildShowWhereClause(query);
    const orderBy = this.buildOrderByClause(query);

    const include = this.getDefaultIncludes();

    const [shows, total] = await Promise.all([
      this.getShowsWithRelations(
        {
          skip: query.skip,
          take: query.take,
          where,
          orderBy,
        },
        include,
      ),
      this.showService.countShows(where),
    ]);

    return { shows: shows as ShowWithIncludes<Prisma.ShowInclude>[], total };
  }

  private buildShowWhereClause(
    filters: Pick<
      ListShowsQueryDto,
      | 'client_id'
      | 'start_date_from'
      | 'start_date_to'
      | 'end_date_from'
      | 'end_date_to'
      | 'include_deleted'
    >,
  ): Prisma.ShowWhereInput {
    const where: Prisma.ShowWhereInput = {};

    // Filter out soft deleted records by default
    if (!filters.include_deleted) {
      where.deletedAt = null;
    }

    // Client filtering
    if (filters.client_id) {
      const clientIds = Array.isArray(filters.client_id)
        ? filters.client_id
        : [filters.client_id];
      where.client = {
        uid: { in: clientIds },
        deletedAt: null,
      };
    }

    // Date range filtering for start time
    if (filters.start_date_from || filters.start_date_to) {
      where.startTime = {};
      if (filters.start_date_from) {
        where.startTime.gte = new Date(filters.start_date_from);
      }
      if (filters.start_date_to) {
        where.startTime.lte = new Date(filters.start_date_to);
      }
    }

    // Date range filtering for end time
    if (filters.end_date_from || filters.end_date_to) {
      where.endTime = {};
      if (filters.end_date_from) {
        where.endTime.gte = new Date(filters.end_date_from);
      }
      if (filters.end_date_to) {
        where.endTime.lte = new Date(filters.end_date_to);
      }
    }

    return where;
  }

  private buildOrderByClause(
    query: Pick<ListShowsQueryDto, 'order_by' | 'order_direction'>,
  ): Record<string, 'asc' | 'desc'> {
    const fieldMap: Record<string, string> = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      start_time: 'startTime',
      end_time: 'endTime',
    };
    const field = fieldMap[query.order_by] || 'createdAt';
    return { [field]: query.order_direction };
  }

  /**
   * Gets a show by ID with all relations.
   *
   * @param uid - Show UID
   * @param include - Optional Prisma include for relations
   * @returns Show with relations
   */
  async getShowWithRelations<
    T extends Prisma.ShowInclude = Record<string, never>,
  >(uid: string,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    return this.showService.getShowById(
      uid,
      include || this.getDefaultIncludes(),
    );
  }

  /**
   * Updates a show with optional MC and platform assignments.
   *
   * @param uid - Show UID
   * @param dto - Update data with optional assignments
   * @param include - Optional Prisma include for relations
   * @returns Updated show with relations
   */
  async updateShowWithAssignments<
    T extends Prisma.ShowInclude = Record<string, never>,
  >(
    uid: string,
    dto: UpdateShowWithAssignmentsDto,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    const defaultInclude = include || this.getDefaultIncludes();

    // Get existing show to check if it exists and get its ID
    const existingShow = await this.showService.getShowById(uid);
    const showId = existingShow.id;

    return this.prisma.executeTransaction(async (tx) => {
      // 1. Update core show attributes
      const showUpdateData = this.buildShowUpdatePayload(dto);
      if (Object.keys(showUpdateData).length > 0) {
        await tx.show.update({
          where: { id: showId },
          data: showUpdateData,
        });
      }

      // 2. Handle MC assignments if provided
      if (dto.showMcs) {
        await this.syncShowMCs(tx, showId, dto.showMcs);
      }

      // 3. Handle platform assignments if provided
      if (dto.showPlatforms) {
        await this.syncShowPlatforms(tx, showId, dto.showPlatforms);
      }

      // 4. Fetch updated show with relations
      return tx.show.findUniqueOrThrow({
        where: { id: showId },
        include: defaultInclude,
      }) as Promise<Show | ShowWithIncludes<T>>;
    });
  }

  /**
   * Soft-deletes a show and all its related MC and platform assignments.
   *
   * @param uid - Show UID
   */
  async deleteShow(uid: string): Promise<void> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;
    const deletedAt = new Date();

    await this.prisma.executeTransaction(async (tx) => {
      // Soft-delete the show
      await tx.show.update({
        where: { id: showId },
        data: { deletedAt },
      });

      // Soft-delete all related ShowMC records
      await tx.showMC.updateMany({
        where: { showId, deletedAt: null },
        data: { deletedAt },
      });

      // Soft-delete all related ShowPlatform records
      await tx.showPlatform.updateMany({
        where: { showId, deletedAt: null },
        data: { deletedAt },
      });
    });
  }

  /**
   * Removes MCs from a show by soft-deleting the ShowMC records.
   *
   * @param uid - Show UID
   * @param mcIds - Array of MC UIDs to remove
   */
  async removeMCsFromShow(uid: string, mcIds: string[]): Promise<void> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    await this.prisma.executeTransaction(async (tx) => {
      // Get MC IDs from UIDs
      const mcRecords = await tx.mC.findMany({
        where: { uid: { in: mcIds } },
        select: { id: true },
      });
      const mcIdsBigInt = mcRecords.map((mc) => mc.id);

      await tx.showMC.updateMany({
        where: {
          showId,
          mcId: { in: mcIdsBigInt },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    });
  }

  /**
   * Removes platforms from a show by soft-deleting the ShowPlatform records.
   *
   * @param uid - Show UID
   * @param platformIds - Array of platform UIDs to remove
   */
  async removePlatformsFromShow(
    uid: string,
    platformIds: string[],
  ): Promise<void> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    await this.prisma.executeTransaction(async (tx) => {
      // Get platform IDs from UIDs
      const platformRecords = await tx.platform.findMany({
        where: { uid: { in: platformIds } },
        select: { id: true },
      });
      const platformIdsBigInt = platformRecords.map((platform) => platform.id);

      await tx.showPlatform.updateMany({
        where: {
          showId,
          platformId: { in: platformIdsBigInt },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    });
  }

  /**
   * Replaces all MCs for a show (removes existing, adds new).
   *
   * @param uid - Show UID
   * @param mcs - Array of MC assignments
   * @param include - Optional Prisma include for relations
   * @returns Updated show with relations
   */
  async replaceMCsForShow<T extends Prisma.ShowInclude = Record<string, never>>(
    uid: string,
    mcs: Array<{ mcId: string; note?: string | null; metadata?: object }>,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    const defaultInclude = include || this.getDefaultIncludes();
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    return this.prisma.executeTransaction(async (tx) => {
      // Soft-delete all existing ShowMC records
      await tx.showMC.updateMany({
        where: { showId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Create new ShowMC records
      if (mcs.length > 0) {
        const mcRecords = await tx.mC.findMany({
          where: { uid: { in: mcs.map((mc) => mc.mcId) } },
          select: { id: true, uid: true },
        });

        const mcIdMap = new Map(mcRecords.map((mc) => [mc.uid, mc.id]));

        await Promise.all(
          mcs.map((mc) => {
            const mcId = mcIdMap.get(mc.mcId);
            if (!mcId) {
              throw HttpError.notFound('MC', mc.mcId);
            }
            return tx.showMC.create({
              data: {
                uid: this.showMcService.generateShowMcUid(),
                showId,
                mcId,
                note: mc.note ?? null,
                metadata: mc.metadata ?? {},
              },
            });
          }),
        );
      }

      // Fetch updated show with relations
      return tx.show.findUniqueOrThrow({
        where: { id: showId },
        include: defaultInclude,
      }) as Promise<Show | ShowWithIncludes<T>>;
    });
  }

  /**
   * Replaces all platforms for a show (removes existing, adds new).
   *
   * @param uid - Show UID
   * @param platforms - Array of platform assignments
   * @param include - Optional Prisma include for relations
   * @returns Updated show with relations
   */
  async replacePlatformsForShow<
    T extends Prisma.ShowInclude = Record<string, never>,
  >(
    uid: string,
    platforms: Array<{
      platformId: string;
      liveStreamLink?: string;
      platformShowId?: string;
      viewerCount?: number;
      metadata?: object;
    }>,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    const defaultInclude = include || this.getDefaultIncludes();
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    return this.prisma.executeTransaction(async (tx) => {
      // Soft-delete all existing ShowPlatform records
      await tx.showPlatform.updateMany({
        where: { showId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Create new ShowPlatform records
      if (platforms.length > 0) {
        const platformRecords = await tx.platform.findMany({
          where: { uid: { in: platforms.map((p) => p.platformId) } },
          select: { id: true, uid: true },
        });

        const platformIdMap = new Map(
          platformRecords.map((p) => [p.uid, p.id]),
        );

        await Promise.all(
          platforms.map((platform) => {
            const platformId = platformIdMap.get(platform.platformId);
            if (!platformId) {
              throw HttpError.notFound('Platform', platform.platformId);
            }
            return tx.showPlatform.create({
              data: {
                uid: this.showPlatformService.generateShowPlatformUid(),
                showId,
                platformId,
                liveStreamLink: platform.liveStreamLink ?? '',
                platformShowId: platform.platformShowId ?? '',
                viewerCount: platform.viewerCount ?? 0,
                metadata: platform.metadata ?? {},
              },
            });
          }),
        );
      }

      // Fetch updated show with relations
      return tx.show.findUniqueOrThrow({
        where: { id: showId },
        include: defaultInclude,
      }) as Promise<Show | ShowWithIncludes<T>>;
    });
  }

  private createShowPayload(
    data: CreateShowWithAssignmentsDto,
  ): Prisma.ShowCreateInput {
    const showUid = this.showService.generateShowUid();

    return {
      uid: showUid,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      metadata: data.metadata,
      client: { connect: { uid: data.clientId } },
      studioRoom: { connect: { uid: data.studioRoomId } },
      showType: { connect: { uid: data.showTypeId } },
      showStatus: { connect: { uid: data.showStatusId } },
      showStandard: { connect: { uid: data.showStandardId } },
      showMCs: {
        create: data.mcs?.map((mc) => ({
          uid: this.showMcService.generateShowMcUid(),
          mc: { connect: { uid: mc.mcId } },
          note: mc.note ?? null,
          metadata: mc.metadata ?? {},
        })),
      },
      showPlatforms: {
        create: data.platforms?.map((platform) => ({
          uid: this.showPlatformService.generateShowPlatformUid(),
          platform: { connect: { uid: platform.platformId } },
          liveStreamLink: platform.liveStreamLink ?? '',
          platformShowId: platform.platformShowId ?? '',
          viewerCount: platform.viewerCount ?? 0,
          metadata: platform.metadata ?? {},
        })),
      },
    };
  }

  /**
   * Builds the update payload for core show attributes.
   */
  private buildShowUpdatePayload(
    dto: UpdateShowWithAssignmentsDto,
  ): Prisma.ShowUpdateInput {
    const payload: Prisma.ShowUpdateInput = {};

    if (dto.name)
      payload.name = dto.name;
    if (dto.startTime)
      payload.startTime = dto.startTime;
    if (dto.endTime)
      payload.endTime = dto.endTime;
    if (dto.metadata)
      payload.metadata = dto.metadata;

    if (dto.clientId) {
      payload.client = { connect: { uid: dto.clientId } };
    }
    if (dto.studioRoomId) {
      payload.studioRoom = { connect: { uid: dto.studioRoomId } };
    }
    if (dto.showTypeId) {
      payload.showType = { connect: { uid: dto.showTypeId } };
    }
    if (dto.showStatusId) {
      payload.showStatus = { connect: { uid: dto.showStatusId } };
    }
    if (dto.showStandardId) {
      payload.showStandard = { connect: { uid: dto.showStandardId } };
    }

    // Validate time range if both times are present
    if (dto.startTime && dto.endTime) {
      if (dto.endTime <= dto.startTime) {
        throw HttpError.badRequest('End time must be after start time');
      }
    }

    return payload;
  }

  /**
   * Synchronizes ShowMC records for a show (creates, updates, or soft-deletes).
   */
  private async syncShowMCs(
    tx: TransactionClient,
    showId: bigint,
    mcs: Array<{ mcId: string; note?: string | null; metadata?: object }>,
  ): Promise<void> {
    // Get existing ShowMC records
    const existingShowMCs = await tx.showMC.findMany({
      where: { showId, deletedAt: null },
      include: { mc: true },
    });

    // Get MC IDs from UIDs
    const mcUids = mcs.map((mc) => mc.mcId);
    const mcRecords = await tx.mC.findMany({
      where: { uid: { in: mcUids } },
      select: { id: true, uid: true },
    });
    const mcIdMap = new Map(mcRecords.map((mc) => [mc.uid, mc.id]));

    // Process each MC assignment
    const processedMcIds = new Set<bigint>();

    for (const mcAssignment of mcs) {
      const mcId = mcIdMap.get(mcAssignment.mcId);
      if (!mcId) {
        throw HttpError.notFound('MC', mcAssignment.mcId);
      }

      processedMcIds.add(mcId);

      const existing = existingShowMCs.find((showMc) => showMc.mcId === mcId);

      if (existing) {
        // Update existing ShowMC record
        await tx.showMC.update({
          where: { id: existing.id },
          data: {
            note: mcAssignment.note ?? null,
            metadata: mcAssignment.metadata ?? existing.metadata ?? {},
          },
        });
      } else {
        // Create new ShowMC record
        await tx.showMC.create({
          data: {
            uid: this.showMcService.generateShowMcUid(),
            showId,
            mcId,
            note: mcAssignment.note ?? null,
            metadata: mcAssignment.metadata ?? {},
          },
        });
      }
    }

    // Soft-delete ShowMC records that are no longer in the list
    const toDelete = existingShowMCs.filter(
      (showMc) => !processedMcIds.has(showMc.mcId),
    );

    if (toDelete.length > 0) {
      await tx.showMC.updateMany({
        where: {
          id: { in: toDelete.map((sm) => sm.id) },
        },
        data: { deletedAt: new Date() },
      });
    }
  }

  /**
   * Synchronizes ShowPlatform records for a show (creates, updates, or soft-deletes).
   */
  private async syncShowPlatforms(
    tx: TransactionClient,
    showId: bigint,
    platforms: Array<{
      platformId: string;
      liveStreamLink?: string;
      platformShowId?: string;
      viewerCount?: number;
      metadata?: object;
    }>,
  ): Promise<void> {
    // Get existing ShowPlatform records
    const existingShowPlatforms = await tx.showPlatform.findMany({
      where: { showId, deletedAt: null },
      include: { platform: true },
    });

    // Get platform IDs from UIDs
    const platformUids = platforms.map((p) => p.platformId);
    const platformRecords = await tx.platform.findMany({
      where: { uid: { in: platformUids } },
      select: { id: true, uid: true },
    });
    const platformIdMap = new Map(platformRecords.map((p) => [p.uid, p.id]));

    // Process each platform assignment
    const processedPlatformIds = new Set<bigint>();

    for (const platformAssignment of platforms) {
      const platformId = platformIdMap.get(platformAssignment.platformId);
      if (!platformId) {
        throw HttpError.notFound('Platform', platformAssignment.platformId);
      }

      processedPlatformIds.add(platformId);

      const existing = existingShowPlatforms.find(
        (showPlatform) => showPlatform.platformId === platformId,
      );

      if (existing) {
        // Update existing ShowPlatform record
        await tx.showPlatform.update({
          where: { id: existing.id },
          data: {
            liveStreamLink:
              platformAssignment.liveStreamLink ?? existing.liveStreamLink,
            platformShowId:
              platformAssignment.platformShowId ?? existing.platformShowId,
            viewerCount: platformAssignment.viewerCount ?? existing.viewerCount,
            metadata: platformAssignment.metadata ?? existing.metadata ?? {},
          },
        });
      } else {
        // Create new ShowPlatform record
        await tx.showPlatform.create({
          data: {
            uid: this.showPlatformService.generateShowPlatformUid(),
            showId,
            platformId,
            liveStreamLink: platformAssignment.liveStreamLink ?? '',
            platformShowId: platformAssignment.platformShowId ?? '',
            viewerCount: platformAssignment.viewerCount ?? 0,
            metadata: platformAssignment.metadata ?? {},
          },
        });
      }
    }

    // Soft-delete ShowPlatform records that are no longer in the list
    const toDelete = existingShowPlatforms.filter(
      (showPlatform) => !processedPlatformIds.has(showPlatform.platformId),
    );

    if (toDelete.length > 0) {
      await tx.showPlatform.updateMany({
        where: {
          id: { in: toDelete.map((sp) => sp.id) },
        },
        data: { deletedAt: new Date() },
      });
    }
  }

  /**
   * Returns default includes for show relations.
   *
   * @returns Default Prisma include object
   */
  private getDefaultIncludes(): Prisma.ShowInclude {
    return {
      client: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
      showMCs: {
        include: {
          mc: true,
        },
        where: {
          deletedAt: null,
        },
      },
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
