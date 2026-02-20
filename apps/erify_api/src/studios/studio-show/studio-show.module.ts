import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';

import { ShowModule } from '@/models/show/show.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [TaskOrchestrationModule, ShowModule],
  controllers: [StudioShowController],
})
export class StudioShowModule {}
