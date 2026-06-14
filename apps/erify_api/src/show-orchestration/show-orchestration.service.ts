import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Show } from '@prisma/client';

import {
  CreateShowWithAssignmentsDto,
  showWithAssignmentsInclude,
  UpdateShowWithAssignmentsDto,
} from './schemas/show-orchestration.schema';
import type {
  BulkAssignCreatorsResult,
  CreatorAssignmentPayload,
  ShowCreatorListItem,
} from './show-creator-assignment.service';
import { ShowCreatorAssignmentService } from './show-creator-assignment.service';
import { ShowPlatformAssignmentService } from './show-platform-assignment.service';

import type { ShowInclude, ShowWithPayload } from '@/models/show/schemas/show.schema';
import { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

/**
 * Coordinating facade for show + assignment workflows. Owns show CRUD and the
 * cross-cutting transactional flows (create/update/delete that span creators,
 * platforms and tasks), and delegates the focused creator- and platform-
 * assignment operations to their dedicated services. Read-only review analytics
 * and creator-compensation reads live in their own peer services (WI-20).
 */
@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly showCreatorService: ShowCreatorService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly showRepository: ShowRepository,
    private readonly showCreatorRepository: ShowCreatorRepository,
    private readonly showPlatformRepository: ShowPlatformRepository,
    private readonly taskService: TaskService,
    private readonly taskTargetService: TaskTargetService,
    private readonly showCreatorAssignmentService: ShowCreatorAssignmentService,
    private readonly showPlatformAssignmentService: ShowPlatformAssignmentService,
  ) {}

  async createShowWithAssignments(
    data: CreateShowWithAssignmentsDto,
  ): Promise<Show | ShowWithPayload<ShowInclude>> {
    this.showService.ensureValidActualTimeRange(null, null, {
      actualStartTime: data.actualStartTime,
      actualEndTime: data.actualEndTime,
    });
    const payload = this.createShowPayload(data);

    return this.showService.createShow(payload, this.getDefaultIncludes());
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
    actorExtId: string,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    const defaultInclude = include || this.getDefaultIncludes();

    // Pre-validate existence (throws 404 if not found)
    const existingShow = await this.showService.getShowById(uid);
    const showId = existingShow.id;

    this.showService.ensureValidActualTimeRange(
      existingShow.actualStartTime,
      existingShow.actualEndTime,
      { actualStartTime: dto.actualStartTime, actualEndTime: dto.actualEndTime },
    );

    // 1. Update core show attributes via the show service (repository access
    //    stays in the model layer).
    await this.showService.updateShowFromDto(uid, dto);

    // 2. Sync creator assignments if provided
    if (dto.showCreators) {
      await this.showCreatorAssignmentService.syncShowCreators(showId, dto.showCreators, actorExtId);
    }

    // 3. Sync platform assignments if provided
    if (dto.showPlatforms) {
      await this.showPlatformAssignmentService.syncShowPlatforms(showId, dto.showPlatforms);
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

    // Collect all taskIds ever linked to this show (including soft-deleted historical targets)
    // before removing this show's targets, so we can evaluate which tasks become fully orphaned.
    const taskTargets = await this.taskTargetService.findAllByShowId(showId);
    const candidateTaskIds = [...new Set(taskTargets.map((target) => target.taskId))];

    // Hard deletes are intentionally front-loaded: for pre-start shows, task workflow state
    // is disposable and partial cleanup is recoverable by retrying the delete operation.
    await this.taskTargetService.hardDeleteByShowId(showId);

    // Only hard-delete tasks that have no remaining active targets on any other show.
    // Tasks reassigned to another show will have surviving active target rows and must not be removed.
    if (candidateTaskIds.length > 0) {
      const survivingTargets = await this.taskTargetService.findByTaskIds(candidateTaskIds);
      const survivingTaskIds = new Set(survivingTargets.map((t) => t.taskId));
      const orphanedTaskIds = candidateTaskIds.filter((id) => !survivingTaskIds.has(id));
      await this.taskService.hardDeleteByIds(orphanedTaskIds);
    }

    await this.showCreatorRepository.softDeleteAllByShowId(showId);
    await this.showPlatformRepository.softDeleteAllByShowId(showId);
    await this.showRepository.softDelete({ uid });
  }

  // ---------------------------------------------------------------------------
  // Creator-assignment surface — delegated to ShowCreatorAssignmentService.
  // ---------------------------------------------------------------------------

  async removeCreatorsFromShow(uid: string, creatorIds: string[]): Promise<void> {
    return this.showCreatorAssignmentService.removeCreatorsFromShow(uid, creatorIds);
  }

  async bulkAssignCreatorsToShow(
    studioUid: string,
    uid: string,
    creators: CreatorAssignmentPayload[],
    actorExtId: string,
  ): Promise<BulkAssignCreatorsResult> {
    return this.showCreatorAssignmentService.bulkAssignCreatorsToShow(studioUid, uid, creators, actorExtId);
  }

  async listCreatorsForShow(uid: string): Promise<ShowCreatorListItem[]> {
    return this.showCreatorAssignmentService.listCreatorsForShow(uid);
  }

  async updateCreatorForShow(
    uid: string,
    showCreatorUid: string,
    payload: Omit<CreatorAssignmentPayload, 'creatorId'>,
    actorExtId: string,
  ): Promise<ShowCreatorListItem> {
    return this.showCreatorAssignmentService.updateCreatorForShow(uid, showCreatorUid, payload, actorExtId);
  }

  async replaceCreatorsForShow<T extends ShowInclude = Record<string, never>>(
    uid: string,
    creators: CreatorAssignmentPayload[],
    actorExtId: string,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    return this.showCreatorAssignmentService.replaceCreatorsForShow(uid, creators, actorExtId, include);
  }

  // ---------------------------------------------------------------------------
  // Platform-assignment surface — delegated to ShowPlatformAssignmentService.
  // ---------------------------------------------------------------------------

  async removePlatformsFromShow(uid: string, platformIds: string[]): Promise<void> {
    return this.showPlatformAssignmentService.removePlatformsFromShow(uid, platformIds);
  }

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
    return this.showPlatformAssignmentService.replacePlatformsForShow(uid, platforms, include);
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
      actualStartTime: data.actualStartTime,
      actualEndTime: data.actualEndTime,
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
}
