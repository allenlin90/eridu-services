import { Module } from '@nestjs/common';

import { AdminShowController } from './admin-show.controller';

import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowOrchestrationModule, UtilityModule],
  controllers: [AdminShowController],
})
export class AdminShowModule {}
