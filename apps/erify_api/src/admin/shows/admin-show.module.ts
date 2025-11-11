import { Module } from '@nestjs/common';

import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminShowController } from './admin-show.controller';

@Module({
  imports: [ShowOrchestrationModule, UtilityModule],
  controllers: [AdminShowController],
})
export class AdminShowModule {}
