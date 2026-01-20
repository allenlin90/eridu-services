import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { GoogleSheetsApiKeyGuard } from '@/lib/guards/google-sheets-api-key.guard';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ScheduleService } from '@/models/schedule/schedule.service';
import {
  BulkCreateScheduleDto,
  bulkCreateScheduleResultSchema,
  BulkUpdateScheduleDto,
  bulkUpdateScheduleResultSchema,
  CreateScheduleDto,
  ListSchedulesQueryDto,
  MonthlyOverviewQueryDto,
  monthlyOverviewResponseSchema,
  scheduleDto,
  UpdateScheduleDto,
} from '@/models/schedule/schemas/schedule.schema';
import {
  ListSnapshotsQueryDto,
  scheduleSnapshotDto,
} from '@/models/schedule-snapshot/schemas/schedule-snapshot.schema';
import { UserService } from '@/models/user/user.service';
import { ScheduleWithRelations } from '@/schedule-planning/publishing.service';
import { SchedulePlanningService } from '@/schedule-planning/schedule-planning.service';
import {
  PublishScheduleDto,
  ValidationResult,
  validationResultSchema,
} from '@/schedule-planning/schemas/schedule-planning.schema';

@Controller('admin/schedules')
@UseGuards(GoogleSheetsApiKeyGuard)
export class AdminScheduleController extends BaseAdminController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly schedulePlanningService: SchedulePlanningService,
    private readonly userService: UserService,
  ) {
    super();
  }

  @Post()
  @AdminResponse(scheduleDto, HttpStatus.CREATED, 'Schedule created successfully')
  async createSchedule(@Body() body: CreateScheduleDto) {
    const schedule = await this.scheduleService.createScheduleFromDto(body, {
      client: true,
      createdByUser: true,
      publishedByUser: true,
    });
    return schedule;
  }

  @Get()
  @AdminPaginatedResponse(scheduleDto, 'List of schedules with pagination and filtering')
  async getSchedules(@Query() query: ListSchedulesQueryDto) {
    // Zod validates and transforms at runtime, so all required properties exist
    const { schedules, total }
      = await this.scheduleService.getPaginatedSchedules(query);

    // Conditionally exclude plan_document from serialization
    // Set to undefined when not requested - the Zod transform will omit it
    const data = query.include_plan_document
      ? schedules
      : schedules.map((s) => ({ ...s, plan_document: undefined as any }));

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(scheduleDto, HttpStatus.OK, 'Schedule details')
  async getSchedule(
    @Param('id', new UidValidationPipe(ScheduleService.UID_PREFIX, 'Schedule'))
    id: string,
  ) {
    return this.scheduleService.getScheduleById(id, {
      client: true,
      createdByUser: true,
      publishedByUser: true,
    });
  }

  @Patch(':id')
  @AdminResponse(scheduleDto, HttpStatus.OK, 'Schedule updated successfully')
  async updateSchedule(
    @Param('id', new UidValidationPipe(ScheduleService.UID_PREFIX, 'Schedule'))
    id: string,
    @Body() body: UpdateScheduleDto,
  ) {
    // Get current schedule for snapshot creation
    const currentSchedule = await this.scheduleService.getScheduleById(id);

    // If plan document is updated, create snapshot and increment version
    if (body.planDocument && currentSchedule.createdBy) {
      // TODO: After implementing authentication pipe/decorator, get current user from request
      // Replace this temporary workaround with: @CurrentUser() user: User
      // Create auto-snapshot before updating
      // Only create snapshot if schedule has a createdBy user
      await this.schedulePlanningService.createManualSnapshot(
        id,
        'auto_save',
        currentSchedule.createdBy,
      );
    }

    // Update with optimistic locking - payload transformation is handled in the service
    const schedule = await this.scheduleService.updateScheduleFromDto(
      id,
      body,
      {
        client: true,
        createdByUser: true,
        publishedByUser: true,
      },
    );
    return schedule;
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT, 'Schedule deleted successfully')
  async deleteSchedule(
    @Param('id', new UidValidationPipe(ScheduleService.UID_PREFIX, 'Schedule'))
    id: string,
  ) {
    await this.scheduleService.deleteSchedule(id);
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @AdminResponse(
    validationResultSchema,
    HttpStatus.OK,
    'Schedule validation result with errors and warnings',
  )
  async validateSchedule(
    @Param('id', new UidValidationPipe(ScheduleService.UID_PREFIX, 'Schedule'))
    id: string,
  ): Promise<ValidationResult> {
    return this.schedulePlanningService.validateSchedule(id);
  }

  @Post(':id/publish')
  @AdminResponse(scheduleDto, HttpStatus.OK, 'Schedule published successfully')
  async publishSchedule(
    @Param('id', new UidValidationPipe(ScheduleService.UID_PREFIX, 'Schedule'))
    id: string,
    @Body() body: PublishScheduleDto,
  ) {
    // TODO: After implementing authentication pipe/decorator, get current user from request
    // Replace this temporary workaround with: @CurrentUser() user: User
    // Get current user from request (this should be injected via decorator in real implementation)
    // For now, we'll get it from the schedule's createdBy user
    const schedule = await this.scheduleService.getScheduleById(id, {
      createdByUser: true,
    });

    // Ensure schedule has a creator for publishing
    if (!schedule.createdBy) {
      throw HttpError.badRequest(
        'Schedule must have a creator (createdBy) to be published',
      );
    }
    const userId = schedule.createdBy;
    const result = await this.schedulePlanningService.publishSchedule(
      id,
      body.version,
      userId,
    );

    // Fetch with relations for proper serialization
    // result.schedule is ScheduleWithRelations from publishing service, uid is guaranteed to exist
    const publishedSchedule: ScheduleWithRelations = result.schedule;
    const scheduleUid: string = publishedSchedule.uid;
    return this.scheduleService.getScheduleById(scheduleUid, {
      client: true,
      createdByUser: true,
      publishedByUser: true,
    });
  }

  @Post(':id/duplicate')
  @AdminResponse(scheduleDto, HttpStatus.CREATED, 'Schedule duplicated successfully')
  async duplicateSchedule(
    @Param('id', new UidValidationPipe(ScheduleService.UID_PREFIX, 'Schedule'))
    id: string,
    @Body() body: { name: string; created_by: string },
  ) {
    // TODO: After implementing authentication pipe/decorator, get current user from request
    // Replace body.created_by with: @CurrentUser() user: User
    // Get user by UID
    const user = await this.userService.getUserById(body.created_by);

    // duplicateSchedule returns a Schedule with guaranteed uid property
    const duplicatedSchedule = await this.scheduleService.duplicateSchedule(
      id,
      body.name,
      user.id,
    );

    // Fetch with relations for proper serialization
    const scheduleUid: string = duplicatedSchedule.uid;
    return this.scheduleService.getScheduleById(scheduleUid, {
      client: true,
      createdByUser: true,
      publishedByUser: true,
    });
  }

  @Get(':id/snapshots')
  @AdminResponse(z.array(scheduleSnapshotDto), HttpStatus.OK, 'List of schedule snapshots')
  async getScheduleSnapshots(
    @Param('id', new UidValidationPipe(ScheduleService.UID_PREFIX, 'Schedule'))
    id: string,
    @Query() query: ListSnapshotsQueryDto,
  ) {
    return this.schedulePlanningService.getSnapshotsBySchedule(id, {
      limit: query.limit,
      orderBy: 'desc',
    });
  }

  @Post('bulk')
  @AdminResponse(bulkCreateScheduleResultSchema, HttpStatus.CREATED, 'Bulk create schedules result')
  async bulkCreateSchedules(@Body() body: BulkCreateScheduleDto) {
    const result = await this.scheduleService.bulkCreateSchedules(body, {
      client: true,
      createdByUser: true,
      publishedByUser: true,
    });

    // Return result directly - serializer will handle transformation
    return {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
      successful_schedules: result.successfulSchedules,
    };
  }

  @Patch('bulk')
  @AdminResponse(bulkUpdateScheduleResultSchema, HttpStatus.OK, 'Bulk update schedules result')
  async bulkUpdateSchedules(@Body() body: BulkUpdateScheduleDto) {
    const result = await this.scheduleService.bulkUpdateSchedules(body, {
      client: true,
      createdByUser: true,
      publishedByUser: true,
    });

    // Return result directly - serializer will handle transformation
    return {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
      successful_schedules: result.successfulSchedules,
    };
  }

  @Get('overview/monthly')
  @AdminResponse(monthlyOverviewResponseSchema, HttpStatus.OK, 'Monthly overview with schedules grouped by client')
  async getMonthlyOverview(@Query() query: MonthlyOverviewQueryDto) {
    const result = await this.scheduleService.getMonthlyOverview(
      {
        startDate: new Date(query.start_date),
        endDate: new Date(query.end_date),
        clientIds: query.client_ids,
        status: query.status,
        includeDeleted: query.include_deleted,
      },
      {
        client: true,
        createdByUser: true,
        publishedByUser: true,
      },
    );

    // Transform schedules by client - serializer will handle schedule transformation
    const schedulesByClientDto: Record<
      string,
      {
        client_id: string;
        client_name: string;
        count: number;
        schedules: typeof result.schedules;
      }
    > = {};
    for (const [clientId, clientData] of Object.entries(
      result.schedulesByClient,
    )) {
      schedulesByClientDto[clientId] = {
        client_id: clientData.clientId,
        client_name: clientData.clientName,
        count: clientData.count,
        schedules: clientData.schedules,
      };
    }

    return {
      start_date: result.startDate.toISOString(),
      end_date: result.endDate.toISOString(),
      total_schedules: result.totalSchedules,
      schedules_by_client: schedulesByClientDto,
      schedules_by_status: result.schedulesByStatus,
      schedules: result.schedules,
    };
  }
}
