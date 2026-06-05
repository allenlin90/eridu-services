import { Module } from '@nestjs/common';

import { StudioPerformanceController } from './studio-performance.controller';
import { StudioPerformanceService } from './studio-performance.service';

@Module({
  controllers: [StudioPerformanceController],
  providers: [StudioPerformanceService],
})
export class StudioPerformanceModule {}
