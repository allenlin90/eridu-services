import { Module } from '@nestjs/common';

import { TaskAssignmentService } from './task-assignment.service';
import { TaskDeletionService } from './task-deletion.service';
import { TaskGenerationService } from './task-generation.service';
import { TaskGenerationProcessor } from './task-generation-processor.service';
import { TaskOrchestrationService } from './task-orchestration.service';
import { TaskRetrievalService } from './task-retrieval.service';
import { TaskSubmissionService } from './task-submission.service';

import { MembershipModule } from '@/models/membership/membership.module';
import { ShowModule } from '@/models/show/show.module';
import { StudioModule } from '@/models/studio/studio.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { TaskTemplateModule } from '@/models/task-template/task-template.module';
import { FactExtractionModule } from '@/orchestration/fact-extraction/fact-extraction.module';
import { ShiftAlignmentModule } from '@/orchestration/shift-alignment/shift-alignment.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    TaskModule,
    TaskTargetModule,
    TaskTemplateModule,
    ShowModule,
    MembershipModule,
    StudioModule,
    ShiftAlignmentModule,
    FactExtractionModule,
  ],
  providers: [
    TaskOrchestrationService,
    TaskSubmissionService,
    TaskGenerationService,
    TaskAssignmentService,
    TaskRetrievalService,
    TaskDeletionService,
    TaskGenerationProcessor,
  ],
  exports: [TaskOrchestrationService],
})
export class TaskOrchestrationModule {}
