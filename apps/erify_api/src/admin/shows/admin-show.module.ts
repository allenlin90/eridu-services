import { Module } from '@nestjs/common';

import { AdminShowController } from './admin-show.controller';

import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';

@Module({
  imports: [ShowOrchestrationModule],
  controllers: [AdminShowController],
})
export class AdminShowModule {}
