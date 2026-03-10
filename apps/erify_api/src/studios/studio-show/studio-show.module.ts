import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';
import { StudioShowCreatorController } from './studio-show-creator.controller';
import { StudioShowCreatorOrchestrationService } from './studio-show-creator.orchestration.service';

import { CreatorModule } from '@/models/creator/creator.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [TaskOrchestrationModule, ShowModule, CreatorModule, ShowCreatorModule, StudioCreatorModelModule],
  controllers: [StudioShowController, StudioShowCreatorController],
  providers: [StudioShowCreatorOrchestrationService],
})
export class StudioShowModule {}
