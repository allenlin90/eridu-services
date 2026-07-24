import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';
import { StudioShowManagementService } from './studio-show-management.service';

import { AuditModule } from '@/models/audit/audit.module';
import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { PublishRunModule } from '@/models/publish-run/publish-run.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ScheduleConflictModule } from '@/models/schedule-conflict/schedule-conflict.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { UserModule } from '@/models/user/user.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [
    TaskOrchestrationModule,
    AuditModule,
    ShowModule,
    ShowOrchestrationModule,
    ShowStatusModule,
    StudioModule,
    StudioRoomModule,
    ScheduleModule,
    ScheduleConflictModule,
    PlatformModule,
    PublishRunModule,
    ShowPlatformModule,
    ClientMechanicModule,
    UserModule,
    TaskModule,
    TaskTargetModule,
  ],
  controllers: [StudioShowController],
  providers: [StudioShowManagementService],
})
export class StudioShowModule {}
