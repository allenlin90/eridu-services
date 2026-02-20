import { Module } from '@nestjs/common';

import { MembershipModule } from '../membership/membership.module';
import { ShowModule } from '../show/show.module';
import { TaskTargetModule } from '../task-target/task-target.module';
import { TaskTemplateModule } from '../task-template/task-template.module';

import { TaskRepository } from './task.repository';
import { TaskService } from './task.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [
    PrismaModule,
    UtilityModule,
    TaskTargetModule,
    TaskTemplateModule,
    ShowModule,
    MembershipModule,
  ],
  providers: [TaskService, TaskRepository],
  exports: [TaskService, TaskRepository],
})
export class TaskModule {}
