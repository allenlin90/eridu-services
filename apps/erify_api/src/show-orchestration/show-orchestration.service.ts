import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Show } from '@prisma/client';

import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import {
  CreateShowWithAssignmentsDto,
  showWithAssignmentsInclude,
  UpdateShowWithAssignmentsDto,
} from './schemas/show-orchestration.schema';

import { HttpError } from '@/lib/errors/http-error.util';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { PlatformRepository } from '@/models/platform/platform.repository';
import type { ShowInclude, ShowWithPayload } from '@/models/show/schemas/show.schema';
import { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

type CreatorAssignmentPayload = {
  creatorId: string;
  note?: string | null;
  agreedRate?: string | null;
  compensationType?: string | null;
  commissionRate?: string | null;
  metadata?: object;
};

type BulkAssignCreatorsResult = {
  assigned: number;
  skipped: number;
  failed: Array<{
    creatorId: string;
    reason: string;
  }>;
};

type ShowCreatorListItem = {
  creatorId: string;
  creatorName: string;
  creatorAliasName: string;
  note: string | null;
  agreedRate: unknown | null;
  compensationType: string | null;
  commissionRate: unknown | null;
  metadata: Record<string, unknown>;
};

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly showCreatorService: ShowCreatorService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly showRepository: ShowRepository,
    private readonly showCreatorRepository: ShowCreatorRepository,
    private readonly creatorRepository: CreatorRepository,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly platformRepository: PlatformRepository,
    private readonly studioCreatorRepository: StudioCreatorRepository,
    private readonly taskService: TaskService,
    private readonly taskTargetService: TaskTargetService,
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
   * Updates a show with optional creator and platform assignments atomically.
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

    // 2. Sync creator assignments if provided
    if (dto.showCreators) {
      await this.syncShowCreators(showId, dto.showCreators);
    }

    // 3. Sync platform assignments if provided
    if (dto.showPlatforms) {
      await this.syncShowPlatforms(showId, dto.showPlatforms);
    }

    // 4. Fetch updated show with relations directly via repository
    return this.showRepository.findByUid(uid, defaultInclude) as Promise<Show | ShowWithPayload<T>>;
  }

  /**
   * Soft-deletes a show and all its related creator and platform assignments.
   */
  @Transactional()
  async deleteShow(uid: string): Promise<void> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;
    const taskTargets = await this.taskTargetService.findAllByShowId(showId);
    const taskIds = [...new Set(taskTargets.map((target) => target.taskId))];

    await this.taskTargetService.hardDeleteByShowId(showId);
    await this.taskService.hardDeleteByIds(taskIds);
    await this.showCreatorRepository.softDeleteAllByShowId(showId);
    await this.showPlatformRepository.softDeleteAllByShowId(showId);
    await this.showRepository.softDelete({ uid });
  }

  @Transactional()
  async removeCreatorsFromShow(
    uid: string,
    creatorIds: string[],
  ): Promise<void> {
    const show = await this.showService.getShowById(uid);
    await this.removeShowCreatorAssignmentsByUids(show.id, creatorIds);
  }

  async bulkAssignCreatorsToShow(
    studioUid: string,
    uid: string,
    creators: CreatorAssignmentPayload[],
  ): Promise<BulkAssignCreatorsResult> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;
    if (creators.length === 0) {
      return { assigned: 0, skipped: 0, failed: [] };
    }

    const uniqueCreatorUids = [...new Set(creators.map((creator) => creator.creatorId))];
    const foundCreators = await this.creatorRepository.findByUids(uniqueCreatorUids);
    const creatorUidToIdMap = new Map(foundCreators.map((creator) => [creator.uid, creator.id]));
    const studioCreatorRosterEntries = await this.studioCreatorRepository.findByStudioUidAndCreatorUids(
      studioUid,
      uniqueCreatorUids,
    );
    const rosteredCreatorIds = new Set(
      studioCreatorRosterEntries.map((entry) => entry.creator.uid),
    );
    const inactiveRosterCreatorIds = new Set(
      studioCreatorRosterEntries
        .filter((entry) => !entry.isActive)
        .map((entry) => entry.creator.uid),
    );

    const existingAssignments = await this.showCreatorRepository.findMany({
      where: {
        showId,
        creatorId: {
          in: foundCreators.map((creator) => creator.id),
        },
      },
    });
    const existingByCreatorId = new Map(existingAssignments.map((assignment) => [assignment.creatorId, assignment]));
    const processedCreatorUids = new Set<string>();
    const result: BulkAssignCreatorsResult = { assigned: 0, skipped: 0, failed: [] };

    for (const creator of creators) {
      if (processedCreatorUids.has(creator.creatorId)) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: 'Duplicate creator_id in request',
        });
        continue;
      }
      processedCreatorUids.add(creator.creatorId);

      const internalCreatorId = creatorUidToIdMap.get(creator.creatorId);
      if (!internalCreatorId) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: 'Creator not found',
        });
        continue;
      }

      const existingAssignment = existingByCreatorId.get(internalCreatorId);
      if (existingAssignment?.deletedAt === null) {
        result.skipped += 1;
        continue;
      }

      if (!rosteredCreatorIds.has(creator.creatorId)) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER,
        });
        continue;
      }

      if (inactiveRosterCreatorIds.has(creator.creatorId)) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER,
        });
        continue;
      }

      try {
        if (existingAssignment) {
          await this.showCreatorRepository.restoreAndUpdateAssignment(existingAssignment.id, {
            note: creator.note ?? null,
            agreedRate: creator.agreedRate,
            compensationType: creator.compensationType,
            commissionRate: creator.commissionRate,
            metadata: creator.metadata ?? (existingAssignment.metadata as object) ?? {},
          });
        } else {
          await this.showCreatorRepository.createAssignment({
            uid: this.showCreatorService.generateShowCreatorUid(),
            showId,
            creatorId: internalCreatorId,
            note: creator.note ?? null,
            agreedRate: creator.agreedRate ?? null,
            compensationType: creator.compensationType ?? null,
            commissionRate: creator.commissionRate ?? null,
            metadata: creator.metadata ?? {},
          });
        }
      } catch (error) {
        if (this.isPrismaUniqueConstraintError(error)) {
          // Duplicate assignment race: treat as skipped/idempotent-safe.
          result.skipped += 1;
          continue;
        }

        result.failed.push({
          creatorId: creator.creatorId,
          reason: this.resolveCreatorAssignmentErrorReason(error),
        });
        continue;
      }

      result.assigned += 1;
    }

    return result;
  }

  async listCreatorsForShow(uid: string): Promise<ShowCreatorListItem[]> {
    const show = await this.showService.getShowById(uid, {
      showCreators: {
        where: {
          deletedAt: null,
          creator: { deletedAt: null },
        },
        include: {
          creator: {
            select: {
              uid: true,
              name: true,
              aliasName: true,
            },
          },
        },
      },
    });

    return (show.showCreators ?? []).map((showCreator) => ({
      creatorId: showCreator.creator.uid,
      creatorName: showCreator.creator.name,
      creatorAliasName: showCreator.creator.aliasName,
      note: showCreator.note,
      agreedRate: showCreator.agreedRate ?? null,
      compensationType: showCreator.compensationType ?? null,
      commissionRate: showCreator.commissionRate ?? null,
      metadata: (showCreator.metadata as Record<string, unknown>) ?? {},
    }));
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

  @Transactional()
  async replaceCreatorsForShow<T extends ShowInclude = Record<string, never>>(
    uid: string,
    creators: CreatorAssignmentPayload[],
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    const defaultInclude = include || this.getDefaultIncludes();
    const show = await this.showService.getShowById(uid);
    const showId = show.id;
    await this.syncShowCreators(showId, creators);
    return this.showRepository.findByUid(uid, defaultInclude) as Promise<Show | ShowWithPayload<T>>;
  }

  private resolveCreatorAssignmentErrorReason(error: unknown): string {
    if (this.isPrismaKnownRequestError(error)) {
      return 'Database error while assigning creator';
    }
    return 'Failed to assign creator';
  }

  private isPrismaKnownRequestError(error: unknown): error is { code: string } {
    return (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && typeof (error as { code?: unknown }).code === 'string'
    );
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return this.isPrismaKnownRequestError(error) && error.code === PRISMA_ERROR.UniqueConstraint;
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
      showCreators: {
        create: data.creators?.map((creator) => ({
          uid: this.showCreatorService.generateShowCreatorUid(),
          creator: { connect: { uid: creator.creatorId } },
          note: creator.note ?? null,
          agreedRate: creator.agreedRate ?? null,
          compensationType: creator.compensationType ?? null,
          commissionRate: creator.commissionRate ?? null,
          metadata: creator.metadata ?? {},
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
    return showWithAssignmentsInclude;
  }

  /**
   * Syncs creator assignments for a show within the active transaction (via CLS).
   * Validates creators exist, upserts active assignments, soft-deletes removed ones.
   */
  private async syncShowCreators(
    showId: bigint,
    creators: CreatorAssignmentPayload[],
    missingEntityLabel = 'Creators',
  ): Promise<void> {
    const creatorUids = creators.map((c) => c.creatorId);

    const foundCreators = await this.creatorRepository.findByUids(creatorUids);
    if (foundCreators.length !== creatorUids.length) {
      const foundUids = foundCreators.map((creator) => creator.uid);
      const missingUids = creatorUids.filter((uid) => !foundUids.includes(uid));
      throw HttpError.badRequest(`${missingEntityLabel} not found: ${missingUids.join(', ')}`);
    }

    const creatorMap = new Map(foundCreators.map((creator) => [creator.uid, creator.id]));
    const existingAssignments = await this.showCreatorRepository.findMany({ where: { showId } });
    const processedCreatorIds = new Set<bigint>();

    for (const assignment of creators) {
      const internalCreatorId = creatorMap.get(assignment.creatorId);
      if (!internalCreatorId)
        continue;

      processedCreatorIds.add(internalCreatorId);
      const existing = existingAssignments.find((a) => a.creatorId === internalCreatorId);

      if (existing) {
        await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {
          note: assignment.note ?? null,
          agreedRate: assignment.agreedRate,
          compensationType: assignment.compensationType,
          commissionRate: assignment.commissionRate,
          metadata: assignment.metadata ?? (existing.metadata as object) ?? {},
        });
      } else {
        await this.showCreatorRepository.createAssignment({
          uid: this.showCreatorService.generateShowCreatorUid(),
          showId,
          creatorId: internalCreatorId,
          note: assignment.note ?? null,
          agreedRate: assignment.agreedRate ?? null,
          compensationType: assignment.compensationType ?? null,
          commissionRate: assignment.commissionRate ?? null,
          metadata: assignment.metadata ?? {},
        });
      }
    }

    const toDelete = existingAssignments.filter(
      (a) => !processedCreatorIds.has(a.creatorId) && a.deletedAt === null,
    );
    for (const assignment of toDelete) {
      await this.showCreatorRepository.softDelete({ id: assignment.id });
    }
  }

  private async removeShowCreatorAssignmentsByUids(
    showId: bigint,
    creatorUids: string[],
  ): Promise<void> {
    const creators = await this.creatorRepository.findByUids(creatorUids);
    const internalCreatorIds = creators.map((creator) => creator.id);
    await this.showCreatorRepository.softDeleteByCreatorIds(showId, internalCreatorIds);
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
