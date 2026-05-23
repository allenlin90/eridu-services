import { forwardRef, Module } from '@nestjs/common';

import { MembershipModule } from '../membership/membership.module';
import { ShowModule } from '../show/show.module';
import { TaskTargetModule } from '../task-target/task-target.module';
import { TaskTemplateModule } from '../task-template/task-template.module';

import { TaskRepository } from './task.repository';
import { TaskService } from './task.service';
import { TaskValidationService } from './task-validation.service';

import { FactExtractionModule } from '@/orchestration/fact-extraction/fact-extraction.module';
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
    // Circular: TaskService triggers FactExtractionService after a COMPLETED
    // transition; FactExtractionService reads task snapshot/content via
    // TaskService. forwardRef breaks the construction cycle without forcing
    // either module to expose the other's internals.
    forwardRef(() => FactExtractionModule),
  ],
  providers: [TaskService, TaskValidationService, TaskRepository],
  exports: [TaskService, TaskValidationService],
})
export class TaskModule {}
