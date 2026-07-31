import { Module } from '@nestjs/common';

import { MembershipModule } from '../membership/membership.module';
import { ShowModule } from '../show/show.module';
import { TaskTargetModule } from '../task-target/task-target.module';
import { TaskTemplateModule } from '../task-template/task-template.module';

import { TaskRepository } from './task.repository';
import { TaskService } from './task.service';
import { TaskValidationService } from './task-validation.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    UidGeneratorModule,
    TaskTargetModule,
    TaskTemplateModule,
    ShowModule,
    MembershipModule,
  ],
  providers: [TaskService, TaskValidationService, TaskRepository],
  exports: [TaskService, TaskValidationService],
})
export class TaskModule {}
