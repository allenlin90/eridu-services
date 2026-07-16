import { Module } from '@nestjs/common';

import { PublishingService } from './publishing.service';
import { PublishingRelationSyncService } from './publishing-relation-sync.service';
import { SchedulePlanningService } from './schedule-planning.service';
import { ScheduleRestorationProcessor } from './schedule-restoration-processor.service';
import { ValidationService } from './validation.service';

import { AuditModule } from '@/models/audit/audit.module';
import { PublishRunModule } from '@/models/publish-run/publish-run.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ScheduleConflictModule } from '@/models/schedule-conflict/schedule-conflict.module';
import { ScheduleSnapshotModule } from '@/models/schedule-snapshot/schedule-snapshot.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    PublishRunModule,
    ScheduleModule,
    ScheduleConflictModule,
    ScheduleSnapshotModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    UtilityModule,
    TaskModule,
    TaskTargetModule,
  ],
  providers: [
    SchedulePlanningService,
    ValidationService,
    PublishingRelationSyncService,
    PublishingService,
    ScheduleRestorationProcessor,
  ],
  exports: [SchedulePlanningService],
})
export class SchedulePlanningModule {}
