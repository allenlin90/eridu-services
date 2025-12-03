import { Module } from '@nestjs/common';

import { PublishingService } from './publishing.service';
import { SchedulePlanningService } from './schedule-planning.service';
import { ValidationService } from './validation.service';

import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ScheduleSnapshotModule } from '@/models/schedule-snapshot/schedule-snapshot.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    ScheduleSnapshotModule,
    ShowModule,
    ShowMcModule,
    ShowPlatformModule,
    UtilityModule,
  ],
  providers: [SchedulePlanningService, ValidationService, PublishingService],
  exports: [SchedulePlanningService],
})
export class SchedulePlanningModule {}
