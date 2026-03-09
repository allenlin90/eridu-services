import { Module } from '@nestjs/common';

import { StudioShowController } from './studio-show.controller';
import { StudioShowCreatorController } from './studio-show-creator.controller';
import { StudioShowMcController } from './studio-show-mc.controller';
import { StudioShowMcOrchestrationService } from './studio-show-mc.orchestration.service';

import { McModule } from '@/models/mc/mc.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { TaskOrchestrationModule } from '@/task-orchestration/task-orchestration.module';

@Module({
  imports: [TaskOrchestrationModule, ShowModule, McModule, ShowMcModule],
  controllers: [StudioShowController, StudioShowMcController, StudioShowCreatorController],
  providers: [StudioShowMcOrchestrationService],
})
export class StudioShowModule {}
