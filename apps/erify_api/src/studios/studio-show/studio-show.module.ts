import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';
import { StudioShowManagementService } from './studio-show-management.service';

import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';
import { MembershipModule } from '@/models/membership/membership.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
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
    StudioModule,
    StudioRoomModule,
    ScheduleModule,
    PlatformModule,
    ShowPlatformModule,
    ClientMechanicModule,
    MembershipModule,
    TaskModule,
    UserModule,
  ],
  controllers: [StudioShowController],
  providers: [StudioShowManagementService],
})
export class StudioShowModule {}
