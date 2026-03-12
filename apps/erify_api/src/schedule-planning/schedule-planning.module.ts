import { Module } from '@nestjs/common';

import { PublishingService } from './publishing.service';
import { SchedulePlanningService } from './schedule-planning.service';
import { ScheduleRestorationProcessor } from './schedule-restoration-processor.service';
import { ValidationService } from './validation.service';

import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ScheduleSnapshotModule } from '@/models/schedule-snapshot/schedule-snapshot.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    ScheduleSnapshotModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    UtilityModule,
  ],
  providers: [
    SchedulePlanningService,
    ValidationService,
    PublishingService,
    ScheduleRestorationProcessor,
  ],
  exports: [SchedulePlanningService],
})
export class SchedulePlanningModule {}
