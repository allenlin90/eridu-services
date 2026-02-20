import { Module } from '@nestjs/common';

import { TaskGenerationProcessor } from './task-generation-processor.service';
import { TaskOrchestrationService } from './task-orchestration.service';

import { MembershipModule } from '@/models/membership/membership.module';
import { ShowModule } from '@/models/show/show.module';
import { StudioModule } from '@/models/studio/studio.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { TaskTemplateModule } from '@/models/task-template/task-template.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [
    PrismaModule,
    UtilityModule,
    TaskModule,
    TaskTargetModule,
    TaskTemplateModule,
    ShowModule,
    MembershipModule,
    StudioModule,
  ],
  providers: [TaskOrchestrationService, TaskGenerationProcessor],
  exports: [TaskOrchestrationService],
})
export class TaskOrchestrationModule {}
