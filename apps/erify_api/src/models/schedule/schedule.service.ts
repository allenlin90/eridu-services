import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Schedule } from '@prisma/client';

import {
  BulkCreateScheduleDto,
  BulkUpdateScheduleDto,
  CreateScheduleDto,
  ListSchedulesQuery,
  ScheduleCreatePayload,
  ScheduleInclude,
  ScheduleJsonValue,
  ScheduleUpdatePayload,
  ScheduleWithRelations,
  UpdateScheduleDto,
} from './schemas/schedule.schema';
import {
  SCHEDULE_STATUS,
  SCHEDULE_UID_PREFIX,
} from './schedule.constants';
import { ScheduleRepository } from './schedule.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { ShowPlanItem } from '@/schedule-planning/schemas/schedule-planning.schema';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ScheduleService extends BaseModelService {
  static readonly UID_PREFIX = SCHEDULE_UID_PREFIX;
  protected readonly uidPrefix = ScheduleService.UID_PREFIX;

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createScheduleFromDto<T extends ScheduleInclude = Record<string, never>>(
    dto: CreateScheduleDto,
    include?: T,
  ): Promise<Schedule | ScheduleWithRelations<T>> {
    const data = this.buildCreatePayload(dto);
    return this.createSchedule(data, include);
  }

  async createSchedule<T extends ScheduleInclude = Record<string, never>>(
    data: ScheduleCreatePayload,
    include?: T,
  ): Promise<Schedule | ScheduleWithRelations<T>> {
    const uid = this.generateUid();
    const result = await this.scheduleRepository.create(
      { ...data, uid },
      include,
    );
    return result as Schedule | ScheduleWithRelations<T>;
  }

  async getScheduleById<T extends ScheduleInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<Schedule | ScheduleWithRelations<T>> {
    return this.findScheduleOrThrow(uid, include);
  }

  async findScheduleById(id: bigint): Promise<Schedule | null> {
    return this.scheduleRepository.findOne({ id });
  }

  /**
   * Gets paginated schedules with filtering.
   *
   * @param query - Query parameters including pagination and filters (validated by Zod)
   * @returns Object containing schedules and total count
   */
  async getPaginatedSchedules(query: ListSchedulesQuery): Promise<{
    schedules: Schedule[];
    total: number;
  }> {
    return this.scheduleRepository.findPaginated(query);
  }

  async listActiveSchedulesByStudioUid(
    studioUid: string,
    params?: {
      take?: number;
      skip?: number;
      orderBy?: Record<string, 'asc' | 'desc'>;
      include?: ScheduleInclude;
    },
  ): Promise<Schedule[]> {
    return this.scheduleRepository.findMany({
      where: { studio: { uid: studioUid, deletedAt: null } },
      skip: params?.skip,
      take: params?.take,
      orderBy: params?.orderBy ?? { startDate: 'desc' },
      include: params?.include,
    });
  }

  async updateScheduleFromDto<T extends ScheduleInclude = Record<string, never>>(
    uid: string,
    dto: UpdateScheduleDto,
    include?: T,
  ): Promise<Schedule | ScheduleWithRelations<T>> {
    const data = this.buildUpdatePayload(dto);
    return this.updateSchedule(uid, data, dto.version, include);
  }

  /**
   * Updates a schedule with optimistic locking validation and publishing prevention.
   *
   * @param uid - Schedule UID
   * @param data - Update data
   * @param clientVersion - Client's version number for optimistic locking
   * @param include - Optional relations to include
   * @returns Updated schedule
   */
  async updateSchedule<T extends ScheduleInclude = Record<string, never>>(
    uid: string,
    data: ScheduleUpdatePayload,
    clientVersion?: number,
    include?: T,
  ): Promise<Schedule | ScheduleWithRelations<T>> {
    const schedule = await this.findScheduleOrThrow(uid);

    // If published, move back to draft on update to require re-publishing
    // This ensures changes are reviewed and synced to live tables via the publish endpoint
    if (
      schedule.status === SCHEDULE_STATUS.PUBLISHED
      && (!data.status || data.status === SCHEDULE_STATUS.PUBLISHED)
    ) {
      data.status = SCHEDULE_STATUS.DRAFT;
    }

    // Optimistic locking validation
    if (clientVersion && schedule.version !== clientVersion) {
      throw HttpError.conflict(
        `Version mismatch. Expected ${clientVersion}, but schedule is at version ${schedule.version}`,
      );
    }

    const result = await this.scheduleRepository.update({ uid }, data, include);
    return result as Schedule | ScheduleWithRelations<T>;
  }

  async deleteSchedule(uid: string): Promise<Schedule> {
    await this.findScheduleOrThrow(uid);

    return this.scheduleRepository.softDelete({ uid });
  }

  /**
   * Duplicates a schedule by creating a new schedule with cloned plan document.
   *
   * @param sourceUid - Source schedule UID to duplicate
   * @param newName - Name for the new schedule
   * @param userId - User ID creating the duplicate
   * @returns New duplicated schedule
   */
  async duplicateSchedule(
    sourceUid: string,
    newName: string,
    userId: bigint,
  ): Promise<Schedule> {
    const source = await this.findScheduleOrThrow(sourceUid, {
      client: true,
    });

    // Clone plan document with new tempIds
    const clonedPlanDocument = JSON.parse(
      JSON.stringify(source.planDocument),
    ) as Record<string, unknown>;

    // Update tempIds for shows if plan document has shows array
    if (
      clonedPlanDocument
      && typeof clonedPlanDocument === 'object'
      && 'shows' in clonedPlanDocument
      && Array.isArray(clonedPlanDocument.shows)
    ) {
      // Create new object with updated shows array
      // Type guard to ensure shows are ShowPlanItem-like objects
      const updatedShows = clonedPlanDocument.shows.map(
        (show: unknown): ShowPlanItem => {
          // Validate that show is an object
          if (
            typeof show !== 'object'
            || show === null
            || !('name' in show)
            || typeof show.name !== 'string'
          ) {
            throw HttpError.badRequest('Invalid show item in plan document');
          }

          // Cast to ShowPlanItem shape and update tempId
          const showItem = show as ShowPlanItem;
          return {
            ...showItem,
            tempId: this.generateUid(),
            existingShowId: undefined, // Don't link to existing shows
          };
        },
      );
      clonedPlanDocument.shows = updatedShows;
    }

    // Create new schedule with cloned data
    return this.createSchedule({
      name: newName,
      startDate: source.startDate,
      endDate: source.endDate,
      status: 'draft',
      planDocument: clonedPlanDocument as ScheduleJsonValue,
      version: 1,
      ...(source.clientId && { client: { connect: { id: source.clientId } } }),
      createdByUser: { connect: { id: userId } },
    });
  }

  private async findScheduleOrThrow<T extends ScheduleInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<Schedule | ScheduleWithRelations<T>> {
    const schedule = await this.scheduleRepository.findByUid(uid, include);
    if (!schedule) {
      throw HttpError.notFound('Schedule', uid);
    }
    return schedule;
  }

  private buildCreatePayload(
    dto: CreateScheduleDto,
  ): ScheduleCreatePayload {
    // Validate date range
    if (dto.endDate <= dto.startDate) {
      throw HttpError.badRequest('End date must be after start date');
    }

    return {
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.status || 'draft',
      planDocument: dto.planDocument || { metadata: {}, shows: [] },
      version: dto.version || 1,
      metadata: dto.metadata || {},
      client: dto.client,
      studio: dto.studio,
      createdByUser: dto.createdByUser,
    };
  }

  private buildUpdatePayload(
    dto: UpdateScheduleDto,
  ): ScheduleUpdatePayload {
    const payload: ScheduleUpdatePayload = {};

    if (dto.name)
      payload.name = dto.name;
    if (dto.startDate)
      payload.startDate = dto.startDate;
    if (dto.endDate)
      payload.endDate = dto.endDate;
    if (dto.status)
      payload.status = dto.status;
    if (dto.planDocument) {
      payload.planDocument = dto.planDocument;
      // Increment version when plan document is updated
      payload.version = { increment: 1 };
    }
    if (dto.metadata)
      payload.metadata = dto.metadata;
    if (dto.studio !== undefined)
      payload.studio = dto.studio;
    if (dto.publishedByUser)
      payload.publishedByUser = dto.publishedByUser;

    // Validate date range if both dates are present
    if (dto.startDate && dto.endDate) {
      if (dto.endDate <= dto.startDate) {
        throw HttpError.badRequest('End date must be after start date');
      }
    }

    return payload;
  }

  /**
   * Creates multiple schedules in bulk with partial success handling.
   * Each schedule is created in its own transaction to allow partial success.
   *
   * @param dto - Bulk create DTO with array of schedule data
   * @param include - Optional relations to include
   * @returns Bulk operation result with success/failure details
   */
  async bulkCreateSchedules(
    dto: BulkCreateScheduleDto,
    include?: ScheduleInclude,
  ): Promise<{
      total: number;
      successful: number;
      failed: number;
      results: Array<{
        index?: number;
        schedule_id?: string | null;
        client_id?: string | null;
        client_name?: string | null;
        success: boolean;
        error?: string | null;
        error_code?: string | null;
      }>;
      successfulSchedules?: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
    }> {
    const results: Array<{
      index?: number;
      schedule_id?: string | null;
      client_id?: string | null;
      client_name?: string | null;
      success: boolean;
      error?: string | null;
      error_code?: string | null;
    }> = [];
    const successfulSchedules: Array<Schedule | ScheduleWithRelations<ScheduleInclude>> = [];

    // Process each schedule individually to allow partial success
    for (let index = 0; index < dto.schedules.length; index++) {
      const scheduleDto = dto.schedules[index];
      try {
        // Create schedule - using createScheduleFromDto which handles validation
        const schedule = await this.createScheduleFromDto(scheduleDto, include);

        // Extract client info for result
        const clientId
          = 'client' in schedule && schedule.client
            ? (schedule.client as { uid: string }).uid
            : undefined;
        const clientName
          = 'client' in schedule && schedule.client
            ? (schedule.client as { name: string }).name
            : undefined;

        results.push({
          index,
          schedule_id: schedule.uid,
          client_id: clientId ?? null,
          client_name: clientName ?? null,
          success: true,
          error: null,
          error_code: null,
        });
        successfulSchedules.push(schedule);
      } catch (error) {
        // Extract error information
        const errorMessage
          = error instanceof Error ? error.message : String(error);
        const errorCode
          = error instanceof BadRequestException
            ? 'BAD_REQUEST'
            : error instanceof ConflictException
              ? 'CONFLICT'
              : 'UNKNOWN_ERROR';

        // Try to extract client_id from the failed DTO for context
        const clientId = scheduleDto.client?.connect?.uid;
        const clientName = undefined; // Can't get without successful creation

        results.push({
          index,
          schedule_id: null,
          client_id: clientId ?? null,
          client_name: clientName ?? null,
          success: false,
          error: errorMessage,
          error_code: errorCode,
        });
      }
    }

    return {
      total: dto.schedules.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      successfulSchedules:
        successfulSchedules.length > 0 ? successfulSchedules : undefined,
    };
  }

  /**
   * Updates multiple schedules in bulk with partial success handling.
   * Each schedule is updated in its own transaction to allow partial success.
   *
   * @param dto - Bulk update DTO with array of schedule update data
   * @param include - Optional relations to include
   * @returns Bulk operation result with success/failure details
   */
  async bulkUpdateSchedules(
    dto: BulkUpdateScheduleDto,
    include?: ScheduleInclude,
  ): Promise<{
      total: number;
      successful: number;
      failed: number;
      results: Array<{
        index?: number;
        schedule_id?: string | null;
        client_id?: string | null;
        client_name?: string | null;
        success: boolean;
        error?: string | null;
        error_code?: string | null;
      }>;
      successfulSchedules?: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
    }> {
    const results: Array<{
      index?: number;
      schedule_id?: string | null;
      client_id?: string | null;
      client_name?: string | null;
      success: boolean;
      error?: string | null;
      error_code?: string | null;
    }> = [];
    const successfulSchedules: Array<Schedule | ScheduleWithRelations<ScheduleInclude>> = [];

    // Process each schedule update individually to allow partial success
    for (let index = 0; index < dto.schedules.length; index++) {
      const updateItem = dto.schedules[index];
      const scheduleId = updateItem.scheduleId;

      try {
        // Build update payload from the bulk update item
        const updatePayload: ScheduleUpdatePayload = {};
        if (updateItem.name !== undefined)
          updatePayload.name = updateItem.name;
        if (updateItem.startDate)
          updatePayload.startDate = updateItem.startDate;
        if (updateItem.endDate)
          updatePayload.endDate = updateItem.endDate;
        if (updateItem.status)
          updatePayload.status = updateItem.status;
        if (updateItem.planDocument) {
          updatePayload.planDocument = updateItem.planDocument;
          updatePayload.version = { increment: 1 };
        }
        if (updateItem.metadata)
          updatePayload.metadata = updateItem.metadata;
        if (updateItem.publishedByUser)
          updatePayload.publishedByUser = updateItem.publishedByUser;

        // Validate date range if both dates are present
        if (updateItem.startDate && updateItem.endDate) {
          if (updateItem.endDate <= updateItem.startDate) {
            throw HttpError.badRequest('End date must be after start date');
          }
        }

        // Update schedule - using updateSchedule which handles validation and optimistic locking
        const schedule = await this.updateSchedule(
          scheduleId,
          updatePayload,
          updateItem.version,
          include,
        );

        // Extract client info for result
        const clientId
          = 'client' in schedule && schedule.client
            ? (schedule.client as { uid: string }).uid
            : undefined;
        const clientName
          = 'client' in schedule && schedule.client
            ? (schedule.client as { name: string }).name
            : undefined;

        results.push({
          index,
          schedule_id: schedule.uid,
          client_id: clientId ?? null,
          client_name: clientName ?? null,
          success: true,
          error: null,
          error_code: null,
        });
        successfulSchedules.push(schedule);
      } catch (error) {
        // Extract error information
        const errorMessage
          = error instanceof Error ? error.message : String(error);
        const errorCode
          = error instanceof BadRequestException
            ? 'BAD_REQUEST'
            : error instanceof ConflictException
              ? 'CONFLICT'
              : error instanceof HttpException && error.getStatus() === 404
                ? 'NOT_FOUND'
                : 'UNKNOWN_ERROR';

        results.push({
          index,
          schedule_id: scheduleId ?? null,
          client_id: null,
          client_name: null,
          success: false,
          error: errorMessage,
          error_code: errorCode,
        });
      }
    }

    return {
      total: dto.schedules.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      successfulSchedules:
        successfulSchedules.length > 0 ? successfulSchedules : undefined,
    };
  }

  /**
   * Gets monthly overview of schedules within a date range, optionally filtered by clients.
   *
   * @param params - Query parameters for monthly overview
   * @param params.startDate - Start date for the overview period
   * @param params.endDate - End date for the overview period
   * @param params.clientIds - Optional array of client IDs to filter by
   * @param params.status - Optional status filter
   * @param params.includeDeleted - Whether to include deleted schedules
   * @param include - Optional relations to include
   * @returns Monthly overview with schedules grouped by client and status
   */
  async getMonthlyOverview(
    params: {
      startDate: Date;
      endDate: Date;
      clientIds?: string[];
      status?: string;
      includeDeleted?: boolean;
    },
    include?: ScheduleInclude,
  ): Promise<{
      startDate: Date;
      endDate: Date;
      totalSchedules: number;
      schedulesByClient: Record<
        string,
        {
          clientId: string;
          clientName: string;
          count: number;
          schedules: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
        }
      >;
      schedulesByStatus: Record<string, number>;
      schedules: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
    }> {
    const schedules = await this.scheduleRepository.findByDateRange(params, include);

    const schedulesByClient: Record<
      string,
      {
        clientId: string;
        clientName: string;
        count: number;
        schedules: Array<Schedule | ScheduleWithRelations<ScheduleInclude>>;
      }
    > = {};
    const schedulesByStatus: Record<string, number> = {};

    for (const schedule of schedules) {
      const clientId
        = 'client' in schedule && schedule.client
          ? (schedule.client as { uid: string }).uid
          : null;
      const clientName
        = 'client' in schedule && schedule.client
          ? (schedule.client as { name: string }).name
          : 'Unknown Client';

      if (clientId) {
        if (!schedulesByClient[clientId]) {
          schedulesByClient[clientId] = { clientId, clientName, count: 0, schedules: [] };
        }
        schedulesByClient[clientId].schedules.push(schedule);
        schedulesByClient[clientId].count++;
      }

      const status = schedule.status;
      schedulesByStatus[status] = (schedulesByStatus[status] || 0) + 1;
    }

    return {
      startDate: params.startDate,
      endDate: params.endDate,
      totalSchedules: schedules.length,
      schedulesByClient,
      schedulesByStatus,
      schedules,
    };
  }

  /**
   * Appends shows to a schedule incrementally (for chunked uploads).
   *
   * @param scheduleUid - Schedule UID
   * @param shows - Shows to append
   * @param chunkIndex - 1-based chunk number (must be sequential)
   * @param version - Current schedule version (for optimistic locking)
   * @param include - Optional relations to include
   * @returns Updated schedule
   */
  async appendShows<T extends ScheduleInclude = Record<string, never>>(
    scheduleUid: string,
    shows: ShowPlanItem[],
    chunkIndex: number,
    version: number,
    include?: T,
  ): Promise<Schedule | ScheduleWithRelations<T>> {
    const schedule = await this.findScheduleOrThrow(scheduleUid);

    // If published, move back to draft to require re-publishing
    if (schedule.status === SCHEDULE_STATUS.PUBLISHED) {
      await this.scheduleRepository.update(
        { uid: scheduleUid },
        { status: SCHEDULE_STATUS.DRAFT },
      );
    }

    // Validate version matches (optimistic locking)
    if (schedule.version !== version) {
      throw HttpError.conflict(
        `Version mismatch. Expected version ${version}, but schedule is at version ${schedule.version}`,
      );
    }

    // Get plan document
    const planDocument = schedule.planDocument as {
      metadata?: {
        uploadProgress?: {
          expectedChunks: number;
          receivedChunks: number;
          lastChunkIndex?: number;
          isComplete?: boolean;
        };
        [key: string]: unknown;
      };
      shows?: ShowPlanItem[];
      [key: string]: unknown;
    };

    // Validate uploadProgress exists
    if (!planDocument.metadata?.uploadProgress) {
      throw HttpError.badRequest(
        'Schedule does not have uploadProgress metadata. Cannot append shows.',
      );
    }

    const uploadProgress = planDocument.metadata.uploadProgress;

    // Validate upload not already complete
    if (uploadProgress.isComplete) {
      throw HttpError.badRequestWithDetails(
        `Upload already complete. All ${uploadProgress.expectedChunks} chunks have been received.`,
        {
          errorCode: 'UPLOAD_COMPLETE',
          uploadProgress: {
            expectedChunks: uploadProgress.expectedChunks,
            receivedChunks: uploadProgress.receivedChunks,
            lastChunkIndex: uploadProgress.lastChunkIndex,
            isComplete: true,
          },
        },
      );
    }

    // Validate chunk index is valid
    if (chunkIndex < 1 || chunkIndex > uploadProgress.expectedChunks) {
      throw HttpError.badRequestWithDetails(
        `Invalid chunk index ${chunkIndex}. Must be between 1 and ${uploadProgress.expectedChunks}.`,
        {
          errorCode: 'INVALID_CHUNK_INDEX',
          uploadProgress: {
            expectedChunks: uploadProgress.expectedChunks,
            receivedChunks: uploadProgress.receivedChunks,
            lastChunkIndex: uploadProgress.lastChunkIndex,
            isComplete: uploadProgress.isComplete,
          },
        },
      );
    }

    // Validate sequential chunks
    const expectedNextChunk = (uploadProgress.lastChunkIndex ?? 0) + 1;
    if (chunkIndex !== expectedNextChunk) {
      // Calculate missing chunks
      const missingChunks: number[] = [];
      for (
        let i = expectedNextChunk;
        i < chunkIndex && i <= uploadProgress.expectedChunks;
        i++
      ) {
        missingChunks.push(i);
      }

      throw HttpError.conflict(
        `Chunk must be uploaded sequentially. Expected chunk ${expectedNextChunk}, but received chunk ${chunkIndex}.`,
      );
    }

    // Merge shows into existing plan document
    const existingShows = planDocument.shows || [];
    const updatedShows = [...existingShows, ...shows];

    // Update uploadProgress
    const updatedReceivedChunks = uploadProgress.receivedChunks + 1;
    const isComplete = updatedReceivedChunks === uploadProgress.expectedChunks;

    const updatedUploadProgress = {
      expectedChunks: uploadProgress.expectedChunks,
      receivedChunks: updatedReceivedChunks,
      lastChunkIndex: chunkIndex,
      isComplete,
    };

    // Update plan document
    const updatedPlanDocument = {
      ...planDocument,
      metadata: {
        ...planDocument.metadata,
        totalShows: updatedShows.length,
        lastEditedAt: new Date().toISOString(),
        uploadProgress: updatedUploadProgress,
      },
      shows: updatedShows,
    };

    // Update schedule with incremented version
    const updatedSchedule = await this.scheduleRepository.update(
      { uid: scheduleUid },
      {
        planDocument: updatedPlanDocument as ScheduleJsonValue,
        version: schedule.version + 1,
      },
      include,
    );

    return updatedSchedule as Schedule | ScheduleWithRelations<T>;
  }
}
