import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';

import { ShowModule } from '@/models/show/show.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [TaskOrchestrationModule, ShowModule, ShowOrchestrationModule],
  controllers: [StudioShowController],
})
export class StudioShowModule {}
