import { Module } from '@nestjs/common';

import { ShowOrchestrationService } from './show-orchestration.service';

import { CreatorModule } from '@/models/creator/creator.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';
import { TaskModule } from '@/models/task/task.module';
import { TaskTargetModule } from '@/models/task-target/task-target.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    CreatorModule,
    PlatformModule,
    StudioCreatorModelModule,
    TaskModule,
    TaskTargetModule,
  ],
  providers: [ShowOrchestrationService],
  exports: [ShowOrchestrationService],
})
export class ShowOrchestrationModule {}
