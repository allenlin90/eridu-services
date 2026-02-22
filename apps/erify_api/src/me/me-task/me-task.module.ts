import { Module } from '@nestjs/common';

import { MeTaskController } from './me-task.controller';
import { MeTaskService } from './me-task.service';

import { TaskModule } from '@/models/task/task.module';
import { UserModule } from '@/models/user/user.module';

@Module({
  imports: [TaskModule, UserModule],
  controllers: [MeTaskController],
  providers: [MeTaskService],
  exports: [MeTaskService],
})
export class MeTaskModule {}
