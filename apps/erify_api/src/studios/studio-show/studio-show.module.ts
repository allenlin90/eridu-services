import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';
import { StudioShowManagementService } from './studio-show-management.service';

import { AuditModule } from '@/models/audit/audit.module';
import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { TaskModule } from '@/models/task/task.module';
import { UserModule } from '@/models/user/user.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [
    TaskOrchestrationModule,
    ShowModule,
    ShowOrchestrationModule,
    ShowStatusModule,
    StudioModule,
    AuditModule,
    StudioRoomModule,
    ScheduleModule,
    PlatformModule,
    ShowPlatformModule,
    ClientMechanicModule,
    UserModule,
    TaskModule,
  ],
  controllers: [StudioShowController],
  providers: [StudioShowManagementService],
})
export class StudioShowModule {}
