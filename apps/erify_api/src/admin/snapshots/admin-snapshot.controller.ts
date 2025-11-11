import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import { BaseAdminController } from '@/admin/base-admin.controller';
import { ApiZodResponse } from '@/common/openapi/decorators';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import {
  ScheduleDto,
  scheduleDto,
} from '@/models/schedule/schemas/schedule.schema';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import {
  ScheduleSnapshotDto,
  scheduleSnapshotDto,
} from '@/models/schedule-snapshot/schemas/schedule-snapshot.schema';
import { UserService } from '@/models/user/user.service';
import { SchedulePlanningService } from '@/schedule-planning/schedule-planning.service';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/snapshots')
export class AdminSnapshotController extends BaseAdminController {
  constructor(
    private readonly scheduleSnapshotService: ScheduleSnapshotService,
    private readonly schedulePlanningService: SchedulePlanningService,
    private readonly userService: UserService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(scheduleSnapshotDto, 'Schedule snapshot details')
  @ZodSerializerDto(ScheduleSnapshotDto)
  async getSnapshot(
    @Param(
      'id',
      new UidValidationPipe(
        ScheduleSnapshotService.UID_PREFIX,
        'ScheduleSnapshot',
      ),
    )
    id: string,
  ) {
    return this.scheduleSnapshotService.getScheduleSnapshotById(id, {
      schedule: {
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      },
      user: true,
    });
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(scheduleDto, 'Schedule restored from snapshot successfully')
  @ZodSerializerDto(ScheduleDto)
  async restoreFromSnapshot(
    @Param(
      'id',
      new UidValidationPipe(
        ScheduleSnapshotService.UID_PREFIX,
        'ScheduleSnapshot',
      ),
    )
    id: string,
    @Body() body: { user_id: string },
  ) {
    // Get user by UID
    const user = await this.userService.getUserById(body.user_id);

    // Restore from snapshot
    const restored = await this.schedulePlanningService.restoreFromSnapshot(
      id,
      user.id,
    );

    // Return schedule with relations
    return restored;
  }
}
