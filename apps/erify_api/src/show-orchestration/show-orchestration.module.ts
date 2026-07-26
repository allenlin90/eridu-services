import { Module } from '@nestjs/common';

import { CreatorCompensationService } from './creator-compensation.service';
import { ShowCancellationGateService } from './show-cancellation-gate.service';
import { ShowCreatorAssignmentService } from './show-creator-assignment.service';
import { ShowOrchestrationService } from './show-orchestration.service';
import { ShowPlatformAssignmentService } from './show-platform-assignment.service';
import { ShowRunReviewService } from './show-run-review.service';

import { ShowCatalogModule } from '@/capabilities/show-catalog/show-catalog.module';
import { AuditModule } from '@/models/audit/audit.module';
import { CompensationLineItemModule } from '@/models/compensation-line-item/compensation-line-item.module';
import { CreatorModule } from '@/models/creator/creator.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CompensationLineItemModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    ShowCatalogModule,
    CreatorModule,
    StudioModule,
    StudioCreatorModelModule,
    StudioShiftModule,
    TaskModule,
    TaskTargetModule,
  ],
  providers: [
    ShowOrchestrationService,
    ShowRunReviewService,
    CreatorCompensationService,
    ShowPlatformAssignmentService,
    ShowCreatorAssignmentService,
    ShowCancellationGateService,
  ],
  exports: [ShowOrchestrationService, ShowRunReviewService, CreatorCompensationService, ShowCancellationGateService],
})
export class ShowOrchestrationModule {}
