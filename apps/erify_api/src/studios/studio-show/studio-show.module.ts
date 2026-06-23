import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';
import { StudioShowManagementService } from './studio-show-management.service';

import { AuditModule } from '@/models/audit/audit.module';
import { ClientMechanicModule } from '@/models/client-mechanic/client-mechanic.module';
import { MembershipModule } from '@/models/membership/membership.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCancellationResolutionModule } from '@/models/show-cancellation-resolution/show-cancellation-resolution.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { UserModule } from '@/models/user/user.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [
    TaskOrchestrationModule,
    AuditModule,
    ShowModule,
    ShowCancellationResolutionModule,
    ShowStatusModule,
    ShowOrchestrationModule,
    StudioModule,
    StudioRoomModule,
    MembershipModule,
    UserModule,
    ScheduleModule,
    PlatformModule,
    ShowPlatformModule,
    ClientMechanicModule,
  ],
  controllers: [StudioShowController],
  providers: [StudioShowManagementService],
})
export class StudioShowModule {}
