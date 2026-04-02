import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';
import { StudioShowManagementService } from './studio-show-management.service';

import { PlatformModule } from '@/models/platform/platform.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [
    TaskOrchestrationModule,
    ShowModule,
    ShowOrchestrationModule,
    StudioModule,
    StudioRoomModule,
    PlatformModule,
    ShowPlatformModule,
  ],
  controllers: [StudioShowController],
  providers: [StudioShowManagementService],
})
export class StudioShowModule {}
