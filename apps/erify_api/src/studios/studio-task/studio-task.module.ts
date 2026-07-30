import { Module } from '@nestjs/common';

import { StudioTaskController } from './studio-task.controller';

import { TaskModule } from '@/models/task/task.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [TaskModule, TaskOrchestrationModule],
  controllers: [StudioTaskController],
})
export class StudioTaskModule {}
