import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Show } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import type { ShowRunReviewSummary, SignOffShowRunReviewInput } from '@eridu/api-types/shows';
import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import {
  CreateShowWithAssignmentsDto,
  showWithAssignmentsInclude,
  UpdateShowWithAssignmentsDto,
} from './schemas/show-orchestration.schema';

import { appendSnapshotAudit, isSnapshotValueEqual, SnapshotChange } from '@/lib/audit/snapshot-audit.helper';
import { HttpError } from '@/lib/errors/http-error.util';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { AuditService } from '@/models/audit/audit.service';
import { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';
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
import { StudioService } from '@/models/studio/studio.service';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { UserService } from '@/models/user/user.service';

type CreatorAssignmentPayload = {
  creatorId: string;
  note?: string | null;
  agreedRate?: string | null;
  compensationType?: string | null;
  commissionRate?: string | null;
  overrideReason?: string;
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
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAliasName: string;
  note: string | null;
  agreedRate: unknown | null;
  compensationType: string | null;
  commissionRate: unknown | null;
  metadata: Record<string, unknown>;
};

type ShowCreatorCompensationSummaryRow = {
  showCreatorId: string;
  creatorId: string;
  creatorName: string;
  creatorAliasName: string;
  compensationType: string | null;
  agreedRate: string | null;
  commissionRate: string | null;
  baseAmount: string | null;
  adjustmentTotal: string;
  totalAmount: string | null;
  unresolvedReason: string | null;
};

type StudioCreatorCompensationRow = ShowCreatorCompensationSummaryRow & {
  showId: string;
  showName: string;
  showStartTime: Date;
  showEndTime: Date;
  note: string | null;
};

type StudioCreatorSnapshotDefaults = {
  defaultRate: { toString: () => string } | string | number | null;
  defaultRateType: string | null;
  defaultCommissionRate: { toString: () => string } | string | number | null;
};

type ResolvedCreatorSnapshot = {
  agreedRate: string | null;
  compensationType: string | null;
  commissionRate: string | null;
  metadata: Record<string, unknown>;
};

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly compensationLineItemService: CompensationLineItemService,
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
    private readonly studioService: StudioService,
    private readonly auditService: AuditService,
    private readonly userService: UserService,
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

    // 1. Update core show attributes directly via repository
    const updateData = this.showService.buildUpdatePayload(dto);
    await this.showRepository.update({ uid }, updateData);

    // 2. Sync creator assignments if provided
    if (dto.showCreators) {
      await this.syncShowCreators(showId, dto.showCreators, actorExtId);
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
    actorExtId: string,
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
    const rosterEntryByCreatorUid = new Map(
      studioCreatorRosterEntries.map((entry) => [entry.creator.uid, entry]),
    );
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
          const snapshot = this.resolveCreatorSnapshot(
            creator,
            rosterEntryByCreatorUid.get(creator.creatorId),
            this.mergeMetadata(existingAssignment.metadata, creator.metadata),
            existingAssignment.deletedAt === null ? existingAssignment : undefined,
          );
          const changes = this.buildCreatorSnapshotChanges(existingAssignment, snapshot);

          const newMetadata = appendSnapshotAudit(
            snapshot.metadata,
            changes,
            actorExtId,
            creator.overrideReason,
          );

          await this.showCreatorRepository.restoreAndUpdateAssignment(existingAssignment.id, {
            note: creator.note ?? null,
            agreedRate: snapshot.agreedRate,
            compensationType: snapshot.compensationType,
            commissionRate: snapshot.commissionRate,
            metadata: newMetadata,
          });
        } else {
          const snapshot = this.resolveCreatorSnapshot(
            creator,
            rosterEntryByCreatorUid.get(creator.creatorId),
            creator.metadata,
          );

          await this.showCreatorRepository.createAssignment({
            uid: this.showCreatorService.generateShowCreatorUid(),
            showId,
            creatorId: internalCreatorId,
            note: creator.note ?? null,
            agreedRate: snapshot.agreedRate,
            compensationType: snapshot.compensationType,
            commissionRate: snapshot.commissionRate,
            metadata: snapshot.metadata,
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
      id: showCreator.uid,
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

  @Transactional()
  async updateCreatorForShow(
    uid: string,
    showCreatorUid: string,
    payload: Omit<CreatorAssignmentPayload, 'creatorId'>,
    actorExtId: string,
  ): Promise<ShowCreatorListItem> {
    const show = await this.showService.getShowById(uid, {
      showCreators: {
        where: {
          uid: showCreatorUid,
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
    const existing = show.showCreators?.[0];

    if (!existing) {
      throw HttpError.notFound('Show creator', showCreatorUid);
    }

    const snapshot = this.resolveCreatorSnapshot(
      {
        creatorId: existing.creator.uid,
        ...payload,
      },
      undefined,
      this.mergeMetadata(existing.metadata, payload.metadata),
      existing,
    );
    this.assertCreatorSnapshotInvariants(snapshot);
    const changes = this.buildCreatorSnapshotChanges(existing, snapshot);
    const metadata = appendSnapshotAudit(
      snapshot.metadata,
      changes,
      actorExtId,
      payload.overrideReason,
    );

    const updated = await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {
      note: payload.note !== undefined ? payload.note : existing.note,
      agreedRate: snapshot.agreedRate,
      compensationType: snapshot.compensationType,
      commissionRate: snapshot.commissionRate,
      metadata,
    });

    return {
      id: updated.uid,
      creatorId: existing.creator.uid,
      creatorName: existing.creator.name,
      creatorAliasName: existing.creator.aliasName,
      note: updated.note,
      agreedRate: updated.agreedRate ?? null,
      compensationType: updated.compensationType ?? null,
      commissionRate: updated.commissionRate ?? null,
      metadata: (updated.metadata as Record<string, unknown>) ?? {},
    };
  }

  async getCreatorCompensationSummaryForShow(studioUid: string, uid: string) {
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

    const showCreators = show.showCreators ?? [];
    const adjustmentTotals = await this.compensationLineItemService.sumActiveAmountsByShowCreatorUids({
      studioId: studioUid,
      showCreatorUids: showCreators.map((showCreator) => showCreator.uid),
    });

    const creators: ShowCreatorCompensationSummaryRow[] = [];
    let totalAmount = new Prisma.Decimal(0);
    let unresolvedCount = 0;

    for (const showCreator of showCreators) {
      const adjustmentTotal = adjustmentTotals.get(showCreator.uid) ?? new Prisma.Decimal(0);
      const baseAmount = this.resolveBaseCreatorAmount(
        showCreator.compensationType,
        showCreator.agreedRate,
      );
      const unresolvedReason = this.resolveCreatorCompensationUnresolvedReason(
        showCreator.compensationType,
        showCreator.agreedRate,
        showCreator.commissionRate,
      );
      const rowTotal = unresolvedReason !== null || baseAmount === null
        ? null
        : baseAmount.plus(adjustmentTotal);

      if (rowTotal === null) {
        unresolvedCount += 1;
      } else {
        totalAmount = totalAmount.plus(rowTotal);
      }

      creators.push({
        showCreatorId: showCreator.uid,
        creatorId: showCreator.creator.uid,
        creatorName: showCreator.creator.name,
        creatorAliasName: showCreator.creator.aliasName,
        compensationType: showCreator.compensationType,
        agreedRate: this.decimalLikeToString(showCreator.agreedRate),
        commissionRate: this.decimalLikeToString(showCreator.commissionRate),
        baseAmount: baseAmount === null ? null : this.toMoneyString(baseAmount),
        adjustmentTotal: this.toMoneyString(adjustmentTotal),
        totalAmount: rowTotal === null ? null : this.toMoneyString(rowTotal),
        unresolvedReason,
      });
    }

    return {
      showId: uid,
      creators,
      totalAmount: this.toMoneyString(totalAmount),
      unresolvedCount,
    };
  }

  async getCreatorCompensations(
    studioUid: string,
    creatorUid: string,
    params: {
      dateFrom: Date;
      dateTo: Date;
    },
  ) {
    const rosterEntry = await this.studioCreatorRepository.findByStudioUidAndCreatorUid(
      studioUid,
      creatorUid,
    );
    if (!rosterEntry) {
      throw HttpError.notFound('Studio creator', creatorUid);
    }

    const rows = await this.showCreatorRepository.findCompensationReviewRows({
      studioUid,
      creatorUid,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    const adjustmentTotals = await this.compensationLineItemService.sumActiveAmountsByShowCreatorUids({
      studioId: studioUid,
      showCreatorUids: rows.map((row) => row.uid),
    });

    const shows: StudioCreatorCompensationRow[] = [];
    let totalAmount = new Prisma.Decimal(0);
    let unresolvedCount = 0;

    for (const row of rows) {
      const adjustmentTotal = adjustmentTotals.get(row.uid) ?? new Prisma.Decimal(0);
      const compensationRow = this.buildCreatorCompensationRow(row, adjustmentTotal);
      const showTotal = compensationRow.totalAmount === null
        ? null
        : new Prisma.Decimal(compensationRow.totalAmount);

      if (showTotal === null) {
        unresolvedCount += 1;
      } else {
        totalAmount = totalAmount.plus(showTotal);
      }

      shows.push({
        ...compensationRow,
        showId: row.show.uid,
        showName: row.show.name,
        showStartTime: row.show.startTime,
        showEndTime: row.show.endTime,
        note: row.note ?? null,
      });
    }

    return {
      creatorId: rosterEntry.creator.uid,
      creatorName: rosterEntry.creator.name,
      creatorAliasName: rosterEntry.creator.aliasName,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      shows,
      totalAmount: this.toMoneyString(totalAmount),
      unresolvedCount,
    };
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
    actorExtId: string,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    const defaultInclude = include || this.getDefaultIncludes();
    const show = await this.showService.getShowById(uid);
    const showId = show.id;
    await this.syncShowCreators(showId, creators, actorExtId);
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

  /**
   * Syncs creator assignments for a show within the active transaction (via CLS).
   * Validates creators exist, upserts active assignments, soft-deletes removed ones.
   */
  private async syncShowCreators(
    showId: bigint,
    creators: CreatorAssignmentPayload[],
    actorExtId: string,
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
        const snapshot = this.resolveCreatorSnapshot(
          assignment,
          undefined,
          this.mergeMetadata(existing.metadata, assignment.metadata),
          existing,
        );
        const changes = this.buildCreatorSnapshotChanges(existing, snapshot);

        const newMetadata = appendSnapshotAudit(
          snapshot.metadata,
          changes,
          actorExtId,
          assignment.overrideReason,
        );

        await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {
          note: assignment.note ?? null,
          agreedRate: snapshot.agreedRate,
          compensationType: snapshot.compensationType,
          commissionRate: snapshot.commissionRate,
          metadata: newMetadata,
        });
      } else {
        const snapshot = this.resolveCreatorSnapshot(assignment, undefined, assignment.metadata);

        await this.showCreatorRepository.createAssignment({
          uid: this.showCreatorService.generateShowCreatorUid(),
          showId,
          creatorId: internalCreatorId,
          note: assignment.note ?? null,
          agreedRate: snapshot.agreedRate,
          compensationType: snapshot.compensationType,
          commissionRate: snapshot.commissionRate,
          metadata: snapshot.metadata,
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

  private resolveCreatorSnapshot(
    assignment: CreatorAssignmentPayload,
    defaults: StudioCreatorSnapshotDefaults | undefined,
    metadata: unknown,
    current?: {
      agreedRate: unknown | null;
      compensationType: string | null;
      commissionRate: unknown | null;
    },
  ): ResolvedCreatorSnapshot {
    const compensationType = assignment.compensationType !== undefined
      ? assignment.compensationType
      : current?.compensationType ?? defaults?.defaultRateType ?? null;
    const agreedRate = assignment.agreedRate !== undefined
      ? assignment.agreedRate
      : this.decimalLikeToString(current?.agreedRate ?? defaults?.defaultRate ?? null);
    const commissionRate = assignment.commissionRate !== undefined
      ? assignment.commissionRate
      : this.decimalLikeToString(current?.commissionRate ?? defaults?.defaultCommissionRate ?? null);
    const resolvedMetadata = this.withAgreementSnapshotFlag(
      this.toMetadataObject(metadata),
      this.isCreatorSnapshotMissing(compensationType, agreedRate, commissionRate),
    );

    return {
      agreedRate,
      compensationType,
      commissionRate,
      metadata: resolvedMetadata,
    };
  }

  private resolveBaseCreatorAmount(
    compensationType: string | null,
    agreedRate: unknown | null,
  ): Prisma.Decimal | null {
    if (
      compensationType === CREATOR_COMPENSATION_TYPE.FIXED
      || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID
    ) {
      return agreedRate == null ? null : this.toDecimal(agreedRate);
    }

    return null;
  }

  private resolveCreatorCompensationUnresolvedReason(
    compensationType: string | null,
    agreedRate: unknown | null,
    commissionRate: unknown | null,
  ): string | null {
    if (this.isCreatorSnapshotMissing(
      compensationType,
      this.decimalLikeToString(agreedRate),
      this.decimalLikeToString(commissionRate),
    )) {
      return 'AGREEMENT_SNAPSHOT_MISSING';
    }

    if (
      compensationType === CREATOR_COMPENSATION_TYPE.COMMISSION
      || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID
    ) {
      return 'COMMISSION_REVENUE_NOT_AVAILABLE';
    }

    return null;
  }

  private buildCreatorCompensationRow(
    showCreator: {
      uid: string;
      compensationType: string | null;
      agreedRate: unknown | null;
      commissionRate: unknown | null;
      creator: {
        uid: string;
        name: string;
        aliasName: string;
      };
    },
    adjustmentTotal: Prisma.Decimal,
  ): ShowCreatorCompensationSummaryRow {
    const baseAmount = this.resolveBaseCreatorAmount(
      showCreator.compensationType,
      showCreator.agreedRate,
    );
    const unresolvedReason = this.resolveCreatorCompensationUnresolvedReason(
      showCreator.compensationType,
      showCreator.agreedRate,
      showCreator.commissionRate,
    );
    const rowTotal = unresolvedReason !== null || baseAmount === null
      ? null
      : baseAmount.plus(adjustmentTotal);

    return {
      showCreatorId: showCreator.uid,
      creatorId: showCreator.creator.uid,
      creatorName: showCreator.creator.name,
      creatorAliasName: showCreator.creator.aliasName,
      compensationType: showCreator.compensationType,
      agreedRate: this.decimalLikeToString(showCreator.agreedRate),
      commissionRate: this.decimalLikeToString(showCreator.commissionRate),
      baseAmount: baseAmount === null ? null : this.toMoneyString(baseAmount),
      adjustmentTotal: this.toMoneyString(adjustmentTotal),
      totalAmount: rowTotal === null ? null : this.toMoneyString(rowTotal),
      unresolvedReason,
    };
  }

  private toDecimal(value: unknown): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) {
      return value;
    }

    return new Prisma.Decimal(String(value));
  }

  private toMoneyString(value: Prisma.Decimal): string {
    return value.toFixed(2);
  }

  private buildCreatorSnapshotChanges(
    current: {
      agreedRate: unknown | null;
      compensationType: string | null;
      commissionRate: unknown | null;
    },
    next: ResolvedCreatorSnapshot,
  ): SnapshotChange[] {
    const changes: SnapshotChange[] = [];
    if (!isSnapshotValueEqual(current.agreedRate, next.agreedRate)) {
      changes.push({ field: 'agreed_rate', old_value: current.agreedRate, new_value: next.agreedRate });
    }
    if (!isSnapshotValueEqual(current.compensationType, next.compensationType)) {
      changes.push({ field: 'compensation_type', old_value: current.compensationType, new_value: next.compensationType });
    }
    if (!isSnapshotValueEqual(current.commissionRate, next.commissionRate)) {
      changes.push({ field: 'commission_rate', old_value: current.commissionRate, new_value: next.commissionRate });
    }
    return changes;
  }

  private assertCreatorSnapshotInvariants(snapshot: ResolvedCreatorSnapshot): void {
    if (
      (snapshot.compensationType === CREATOR_COMPENSATION_TYPE.FIXED || snapshot.compensationType === null)
      && snapshot.commissionRate !== null
    ) {
      throw HttpError.badRequest(
        snapshot.compensationType === null
          ? 'commission_rate must be null when compensation_type is null'
          : 'commission_rate must be null when compensation_type is FIXED',
      );
    }
  }

  private isCreatorSnapshotMissing(
    compensationType: string | null,
    agreedRate: string | null,
    commissionRate: string | null,
  ): boolean {
    if (!compensationType) {
      return true;
    }

    if (
      (compensationType === CREATOR_COMPENSATION_TYPE.FIXED
        || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID)
      && !agreedRate
    ) {
      return true;
    }

    return (
      (compensationType === CREATOR_COMPENSATION_TYPE.COMMISSION
        || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID)
      && !commissionRate
    );
  }

  private withAgreementSnapshotFlag(
    metadata: Record<string, unknown>,
    isMissing: boolean,
  ): Record<string, unknown> {
    const flags = this.toMetadataObject(metadata.flags);
    return {
      ...metadata,
      flags: {
        ...flags,
        agreement_snapshot_missing: isMissing,
      },
    };
  }

  private mergeMetadata(
    existing: unknown,
    incoming: unknown,
  ): Record<string, unknown> {
    return {
      ...this.toMetadataObject(existing),
      ...this.toMetadataObject(incoming),
    };
  }

  private toMetadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private decimalLikeToString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return value.toString();
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

  /**
   * Retrieves compiled daily operational facts and summaries (PR 12.4.4)
   */
  async getShowRunReviewSummary(
    studioUid: string,
    query: { date_from: string; date_to: string },
  ): Promise<ShowRunReviewSummary> {
    const studio = await this.studioService.getStudioById(studioUid);
    const studioId = studio.id;

    const start = new Date(query.date_from);
    const end = new Date(query.date_to);

    const shows = await this.showService.getShowsForReview(studioId, start, end);

    const signOffAudit = await this.auditService.findSignOff(
      studioUid,
      query.date_from,
      query.date_to,
    );

    const sign_off = signOffAudit
      ? {
          id: signOffAudit.uid,
          actor_uid: signOffAudit.actor?.uid ?? null,
          actor_name: signOffAudit.actor?.name ?? null,
          signed_at: signOffAudit.createdAt.toISOString(),
          reason: signOffAudit.reason,
          unresolved_exceptions: (signOffAudit.metadata as any)?.unresolved_exceptions ?? {
            late_creators: 0,
            missing_creators: 0,
            platform_violations: 0,
            incomplete_tasks: 0,
          },
        }
      : null;

    let startedCount = 0;
    let lateStartCount = 0;
    let missingDurationMinutes = 0;
    let endRecordedCount = 0;
    let totalCreatorsCount = 0;
    let lateCreatorsCount = 0;
    let missingCreatorsCount = 0;
    const creatorExceptions: ShowRunReviewSummary['creators']['exceptions'] = [];
    const activeViolations: ShowRunReviewSummary['platforms']['violations'] = [];
    const seenTaskUids = new Set<string>();
    const incompleteTasksList: ShowRunReviewSummary['tasks']['incomplete_tasks'] = [];

    for (const show of shows) {
      // 1. Show actuals: start time is the primary signal that a show ran and
      // whether it was late. End time is recorded as secondary detail; a late
      // start that ends on the planned end implies lost (missing) duration.
      if (show.actualStartTime !== null) {
        startedCount++;
        const actualStart = new Date(show.actualStartTime);
        const plannedStart = new Date(show.startTime);
        if (actualStart > plannedStart) {
          lateStartCount++;
          const diffMs = actualStart.getTime() - plannedStart.getTime();
          missingDurationMinutes += Math.max(0, Math.floor(diffMs / 60000));
        }
      }
      if (show.actualEndTime !== null) {
        endRecordedCount++;
      }

      // 2. Creator lateness / presence exceptions
      for (const sc of show.showCreators) {
        totalCreatorsCount++;
        if (sc.attendanceMissing) {
          missingCreatorsCount++;
          creatorExceptions.push({
            show_creator_uid: sc.uid,
            creator_name: sc.creator.aliasName || sc.creator.name,
            show_name: show.name,
            show_start_time: show.startTime.toISOString(),
            status: 'MISSING' as const,
            late_minutes: 0,
            reason: sc.attendanceReason,
          });
        } else if (sc.actualStartTime) {
          const actualStart = new Date(sc.actualStartTime);
          const plannedStart = new Date(show.startTime);
          if (actualStart > plannedStart) {
            lateCreatorsCount++;
            const diffMs = actualStart.getTime() - plannedStart.getTime();
            const lateMinutes = Math.max(0, Math.floor(diffMs / 60000));
            creatorExceptions.push({
              show_creator_uid: sc.uid,
              creator_name: sc.creator.aliasName || sc.creator.name,
              show_name: show.name,
              show_start_time: show.startTime.toISOString(),
              status: 'LATE' as const,
              late_minutes: lateMinutes,
              reason: sc.attendanceReason,
            });
          }
        }
      }

      // 3. Platform violations
      for (const sp of show.showPlatforms) {
        for (const violation of sp.violations) {
          activeViolations.push({
            violation_uid: violation.uid,
            platform_name: sp.platform.name,
            show_name: show.name,
            show_start_time: show.startTime.toISOString(),
            violation_type: violation.violationType,
            severity: violation.severity,
            reason: violation.reason,
            observed_at: violation.observedAt.toISOString(),
          });
        }
      }

      // 4. Incomplete tasks
      for (const target of show.taskTargets) {
        const task = target.task;
        if (task && task.deletedAt === null && task.status !== 'COMPLETED' && task.status !== 'CLOSED') {
          if (!seenTaskUids.has(task.uid)) {
            seenTaskUids.add(task.uid);
            incompleteTasksList.push({
              task_uid: task.uid,
              description: task.description,
              status: task.status,
              type: task.type,
              show_name: show.name,
            });
          }
        }
      }
    }

    return {
      date_from: query.date_from,
      date_to: query.date_to,
      sign_off,
      shows: {
        total_count: shows.length,
        started_count: startedCount,
        not_started_count: shows.length - startedCount,
        late_start_count: lateStartCount,
        missing_duration_minutes: missingDurationMinutes,
        end_recorded_count: endRecordedCount,
      },
      creators: {
        total_count: totalCreatorsCount,
        late_count: lateCreatorsCount,
        missing_count: missingCreatorsCount,
        exceptions: creatorExceptions,
      },
      platforms: {
        active_violations_count: activeViolations.length,
        violations: activeViolations,
      },
      tasks: {
        incomplete_phase_checks_count: incompleteTasksList.length,
        incomplete_tasks: incompleteTasksList,
      },
    };
  }

  @Transactional()
  async signOffShowRunReview(
    studioUid: string,
    actorExtId: string,
    payload: SignOffShowRunReviewInput,
  ) {
    await this.studioService.getStudioById(studioUid);

    // Check if sign-off already exists for this exact range
    const existing = await this.auditService.findSignOff(
      studioUid,
      payload.date_from,
      payload.date_to,
    );
    if (existing) {
      throw HttpError.conflict(
        `This range (${payload.date_from} to ${payload.date_to}) is already signed off.`,
      );
    }

    const user = await this.userService.getUserByExtId(actorExtId);
    if (!user) {
      throw HttpError.notFound('User', actorExtId);
    }

    // Compile exceptions at sign-off time
    const summary = await this.getShowRunReviewSummary(studioUid, {
      date_from: payload.date_from,
      date_to: payload.date_to,
    });

    const audit = await this.auditService.create({
      action: 'SIGN_OFF',
      actorId: user.id,
      reason: payload.reason ?? null,
      metadata: {
        studio_uid: studioUid,
        date_from: payload.date_from,
        date_to: payload.date_to,
        unresolved_exceptions: {
          late_creators: summary.creators.late_count,
          missing_creators: summary.creators.missing_count,
          platform_violations: summary.platforms.active_violations_count,
          incomplete_tasks: summary.tasks.incomplete_phase_checks_count,
        },
        shows_total: summary.shows.total_count,
      },
      targets: [],
    });

    return audit;
  }
}
