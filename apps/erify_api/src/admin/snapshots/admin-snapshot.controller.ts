import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import { AdminResponse } from '@/admin/decorators/admin-response.decorator';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import { scheduleDto } from '@/models/schedule/schemas/schedule.schema';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import { scheduleSnapshotDto } from '@/models/schedule-snapshot/schemas/schedule-snapshot.schema';
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
  @AdminResponse(
    scheduleSnapshotDto,
    HttpStatus.OK,
    'Schedule snapshot details',
  )
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
  @AdminResponse(
    scheduleDto,
    HttpStatus.OK,
    'Schedule restored from snapshot successfully',
  )
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
