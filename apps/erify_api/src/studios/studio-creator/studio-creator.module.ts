import { Module } from '@nestjs/common';

import { StudioCreatorController } from './studio-creator.controller';

import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';

@Module({
  imports: [StudioCreatorModelModule, ShowOrchestrationModule],
  controllers: [StudioCreatorController],
})
export class StudioCreatorApiModule {}
