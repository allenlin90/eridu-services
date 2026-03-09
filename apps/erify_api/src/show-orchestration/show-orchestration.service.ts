import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Show } from '@prisma/client';

import {
  CreateShowWithAssignmentsDto,
  UpdateShowWithAssignmentsDto,
} from './schemas/show-orchestration.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { McRepository } from '@/models/mc/mc.repository';
import { PlatformRepository } from '@/models/platform/platform.repository';
import type { ShowInclude, ShowWithPayload } from '@/models/show/schemas/show.schema';
import { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowMcRepository } from '@/models/show-mc/show-mc.repository';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly showMcService: ShowMcService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly showRepository: ShowRepository,
    private readonly showMcRepository: ShowMcRepository,
    private readonly mcRepository: McRepository,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly platformRepository: PlatformRepository,
  ) {}

  async createShowWithAssignments(
    data: CreateShowWithAssignmentsDto,
  ): Promise<Show | ShowWithPayload<ShowInclude>> {
    const payload = this.createShowPayload(data);

    return this.showService.createShow(payload, this.getDefaultIncludes());
  }

  /**
   * Retrieves shows with all relations (MCs, platforms, clients, etc.).
   */
  async getShowsWithRelations<T extends ShowInclude = Record<string, never>>(
    params: Parameters<ShowService['getActiveShows']>[0],
    include?: T,
  ): Promise<Show[] | ShowWithPayload<T>[]> {
    return this.showService.getActiveShows({
      ...params,
      include: include || this.getDefaultIncludes(),
    });
  }

  /**
   * Retrieves paginated shows with filtering and full relations.
   */
  async getPaginatedShowsWithRelations(query: ListShowsQueryDto): Promise<{
    data: ShowWithPayload<ShowInclude>[];
    total: number;
  }> {
    const include = this.getDefaultIncludes();
    const result = await this.showService.getPaginatedShows(query, include);
    return result as { data: ShowWithPayload<ShowInclude>[]; total: number };
  }

  /**
   * Gets a show by ID with all relations.
   */
  async getShowWithRelations<T extends ShowInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    return this.showService.getShowById(
      uid,
      include || this.getDefaultIncludes(),
    );
  }

  /**
   * Updates a show with optional MC and platform assignments atomically.
   */
  @Transactional()
  async updateShowWithAssignments<T extends ShowInclude = Record<string, never>>(
    uid: string,
    dto: UpdateShowWithAssignmentsDto,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    const defaultInclude = include || this.getDefaultIncludes();

    // Pre-validate existence (throws 404 if not found)
    const existingShow = await this.showService.getShowById(uid);
    const showId = existingShow.id;

    // 1. Update core show attributes directly via repository
    const updateData = this.showService.buildUpdatePayload(dto);
    await this.showRepository.update({ uid }, updateData);

    // 2. Sync MC assignments if provided
    if (dto.showMcs) {
      await this.syncShowCreators(showId, dto.showMcs);
    }

    // 3. Sync platform assignments if provided
    if (dto.showPlatforms) {
      await this.syncShowPlatforms(showId, dto.showPlatforms);
    }

    // 4. Fetch updated show with relations directly via repository
    return this.showRepository.findByUid(uid, defaultInclude) as Promise<Show | ShowWithPayload<T>>;
  }

  /**
   * Soft-deletes a show and all its related MC and platform assignments.
   */
  @Transactional()
  async deleteShow(uid: string): Promise<void> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    await this.showRepository.softDelete({ uid });
    await this.showMcRepository.softDeleteAllByShowId(showId);
    await this.showPlatformRepository.softDeleteAllByShowId(showId);
  }

  /**
   * Removes MCs from a show by soft-deleting the ShowMC records.
   */
  @Transactional()
  async removeCreatorsFromShow(uid: string, creatorIds: string[]): Promise<void> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    const creators = await this.mcRepository.findByUids(creatorIds);
    const internalCreatorIds = creators.map((mc) => mc.id);
    await this.showMcRepository.softDeleteByMcIds(showId, internalCreatorIds);
  }

  /**
   * Removes platforms from a show by soft-deleting the ShowPlatform records.
   */
  @Transactional()
  async removePlatformsFromShow(uid: string, platformIds: string[]): Promise<void> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    const platforms = await this.platformRepository.findByUids(platformIds);
    const internalPlatformIds = platforms.map((p) => p.id);
    await this.showPlatformRepository.softDeleteByPlatformIds(showId, internalPlatformIds);
  }

  /**
   * Replaces all MCs for a show (sync: removes removed, adds new, restores previously deleted).
   */
  @Transactional()
  async replaceCreatorsForShow<T extends ShowInclude = Record<string, never>>(
    uid: string,
    creators: Array<{ creatorId: string; note?: string | null; metadata?: object }>,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    const defaultInclude = include || this.getDefaultIncludes();
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    await this.syncShowCreators(showId, creators);
    return this.showRepository.findByUid(uid, defaultInclude) as Promise<Show | ShowWithPayload<T>>;
  }

  /**
   * Replaces all platforms for a show (sync: removes removed, adds new, restores previously deleted).
   */
  @Transactional()
  async replacePlatformsForShow<T extends ShowInclude = Record<string, never>>(
    uid: string,
    platforms: Array<{
      platformId: string;
      liveStreamLink?: string | null;
      platformShowId?: string | null;
      viewerCount?: number;
      metadata?: object;
    }>,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    const defaultInclude = include || this.getDefaultIncludes();
    const show = await this.showService.getShowById(uid);
    const showId = show.id;

    await this.syncShowPlatforms(showId, platforms);
    return this.showRepository.findByUid(uid, defaultInclude) as Promise<Show | ShowWithPayload<T>>;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private createShowPayload(data: CreateShowWithAssignmentsDto) {
    const showUid = this.showService.generateShowUid();

    return {
      uid: showUid,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      metadata: data.metadata,
      client: { connect: { uid: data.clientId } },
      studioRoom: data.studioRoomId
        ? { connect: { uid: data.studioRoomId } }
        : undefined,
      studio: data.studioId
        ? { connect: { uid: data.studioId } }
        : undefined,
      showType: { connect: { uid: data.showTypeId } },
      showStatus: { connect: { uid: data.showStatusId } },
      showStandard: { connect: { uid: data.showStandardId } },
      showMCs: {
        create: data.creators?.map((mc) => ({
          uid: this.showMcService.generateShowMcUid(),
          mc: { connect: { uid: mc.creatorId } },
          note: mc.note ?? null,
          metadata: mc.metadata ?? {},
        })),
      },
      showPlatforms: {
        create: data.platforms?.map((platform) => ({
          uid: this.showPlatformService.generateShowPlatformUid(),
          platform: { connect: { uid: platform.platformId } },
          liveStreamLink: platform.liveStreamLink ?? null,
          platformShowId: platform.platformShowId ?? null,
          viewerCount: platform.viewerCount ?? 0,
          metadata: platform.metadata ?? {},
        })),
      },
    };
  }

  private getDefaultIncludes(): ShowInclude {
    return {
      client: true,
      studio: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
      showMCs: {
        include: { mc: true },
        where: { deletedAt: null },
      },
      showPlatforms: {
        include: { platform: true },
        where: { deletedAt: null },
      },
    };
  }

  /**
   * Syncs MC assignments for a show within the active transaction (via CLS).
   * Validates MCs exist, upserts active assignments, soft-deletes removed ones.
   */
  private async syncShowCreators(
    showId: bigint,
    creators: Array<{ creatorId: string; note?: string | null; metadata?: object }>,
  ): Promise<void> {
    const creatorUids = creators.map((m) => m.creatorId);

    const foundCreators = await this.mcRepository.findByUids(creatorUids);
    if (foundCreators.length !== creatorUids.length) {
      const foundUids = foundCreators.map((mc) => mc.uid);
      const missingUids = creatorUids.filter((uid) => !foundUids.includes(uid));
      throw HttpError.badRequest(`Creators not found: ${missingUids.join(', ')}`);
    }

    const creatorMap = new Map(foundCreators.map((m) => [m.uid, m.id]));
    const existingAssignments = await this.showMcRepository.findMany({ where: { showId } });
    const processedCreatorIds = new Set<bigint>();

    for (const assignment of creators) {
      const internalCreatorId = creatorMap.get(assignment.creatorId);
      if (!internalCreatorId)
        continue;

      processedCreatorIds.add(internalCreatorId);
      const existing = existingAssignments.find((a) => a.mcId === internalCreatorId);

      if (existing) {
        await this.showMcRepository.restoreAndUpdateAssignment(existing.id, {
          note: assignment.note ?? null,
          metadata: assignment.metadata ?? (existing.metadata as object) ?? {},
        });
      } else {
        await this.showMcRepository.createAssignment({
          uid: this.showMcService.generateShowMcUid(),
          showId,
          mcId: internalCreatorId,
          note: assignment.note ?? null,
          metadata: assignment.metadata ?? {},
        });
      }
    }

    const toDelete = existingAssignments.filter(
      (a) => !processedCreatorIds.has(a.mcId) && a.deletedAt === null,
    );
    for (const assignment of toDelete) {
      await this.showMcRepository.softDelete({ id: assignment.id });
    }
  }

  /**
   * Syncs platform assignments for a show within the active transaction (via CLS).
   * Validates platforms exist, upserts active assignments, soft-deletes removed ones.
   */
  private async syncShowPlatforms(
    showId: bigint,
    platforms: Array<{
      platformId: string;
      liveStreamLink?: string | null;
      platformShowId?: string | null;
      viewerCount?: number;
      metadata?: object;
    }>,
  ): Promise<void> {
    const platformUids = platforms.map((p) => p.platformId);

    const foundPlatforms = await this.platformRepository.findByUids(platformUids);
    if (foundPlatforms.length !== platformUids.length) {
      const foundUids = foundPlatforms.map((p) => p.uid);
      const missingUids = platformUids.filter((uid) => !foundUids.includes(uid));
      throw HttpError.badRequest(`Platforms not found: ${missingUids.join(', ')}`);
    }

    const platformMap = new Map(foundPlatforms.map((p) => [p.uid, p.id]));
    const existingAssignments = await this.showPlatformRepository.findMany({ where: { showId } });
    const processedPlatformIds = new Set<bigint>();

    for (const assignment of platforms) {
      const internalPlatformId = platformMap.get(assignment.platformId);
      if (!internalPlatformId)
        continue;

      processedPlatformIds.add(internalPlatformId);
      const existing = existingAssignments.find((a) => a.platformId === internalPlatformId);

      if (existing) {
        await this.showPlatformRepository.restoreAndUpdateAssignment(existing.id, {
          liveStreamLink: assignment.liveStreamLink ?? existing.liveStreamLink,
          platformShowId: assignment.platformShowId ?? existing.platformShowId,
          viewerCount: assignment.viewerCount ?? existing.viewerCount,
          metadata: assignment.metadata ?? (existing.metadata as object) ?? {},
        });
      } else {
        await this.showPlatformRepository.createAssignment({
          uid: this.showPlatformService.generateShowPlatformUid(),
          showId,
          platformId: internalPlatformId,
          liveStreamLink: assignment.liveStreamLink ?? null,
          platformShowId: assignment.platformShowId ?? null,
          viewerCount: assignment.viewerCount ?? 0,
          metadata: assignment.metadata ?? {},
        });
      }
    }

    const toDelete = existingAssignments.filter(
      (a) => !processedPlatformIds.has(a.platformId) && a.deletedAt === null,
    );
    for (const assignment of toDelete) {
      await this.showPlatformRepository.softDelete({ id: assignment.id });
    }
  }
}
