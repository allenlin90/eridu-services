import { Module } from '@nestjs/common';

import { MeTaskController } from './me-task.controller';
import { MeTaskService } from './me-task.service';

import { StudioModule } from '@/models/studio/studio.module';
import { TaskModule } from '@/models/task/task.module';
import { UserModule } from '@/models/user/user.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [TaskModule, UserModule, StudioModule, TaskOrchestrationModule],
  controllers: [MeTaskController],
  providers: [MeTaskService],
  exports: [MeTaskService],
})
export class MeTaskModule {}
