import { Module } from '@nestjs/common';

import { CreatorCompensationService } from './creator-compensation.service';
import { ShowCreatorAssignmentService } from './show-creator-assignment.service';
import { ShowOrchestrationService } from './show-orchestration.service';
import { ShowPlatformAssignmentService } from './show-platform-assignment.service';
import { ShowRunReviewService } from './show-run-review.service';

import { CompensationLineItemModule } from '@/models/compensation-line-item/compensation-line-item.module';
import { CreatorModule } from '@/models/creator/creator.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    CompensationLineItemModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    CreatorModule,
    PlatformModule,
    StudioModule,
    StudioCreatorModelModule,
    TaskModule,
    TaskTargetModule,
  ],
  providers: [
    ShowOrchestrationService,
    ShowRunReviewService,
    CreatorCompensationService,
    ShowPlatformAssignmentService,
    ShowCreatorAssignmentService,
  ],
  exports: [ShowOrchestrationService, ShowRunReviewService, CreatorCompensationService],
})
export class ShowOrchestrationModule {}
