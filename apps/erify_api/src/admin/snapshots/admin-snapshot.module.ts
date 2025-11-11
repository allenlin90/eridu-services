import { Module } from '@nestjs/common';

import { ScheduleSnapshotModule } from '@/models/schedule-snapshot/schedule-snapshot.module';
import { UserModule } from '@/models/user/user.module';
import { SchedulePlanningModule } from '@/schedule-planning/schedule-planning.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminSnapshotController } from './admin-snapshot.controller';

@Module({
  imports: [
    ScheduleSnapshotModule,
    SchedulePlanningModule,
    UserModule,
    UtilityModule,
  ],
  controllers: [AdminSnapshotController],
})
export class AdminSnapshotModule {}
