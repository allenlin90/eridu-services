import { Module } from '@nestjs/common';

import { StudioPerformanceController } from './studio-performance.controller';
import { StudioPerformanceRepository } from './studio-performance.repository';
import { StudioPerformanceService } from './studio-performance.service';
import { StudioPerformanceCalculatorService } from './studio-performance-calculator.service';

import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudioPerformanceController],
  providers: [
    StudioPerformanceService,
    StudioPerformanceRepository,
    StudioPerformanceCalculatorService,
  ],
})
export class StudioPerformanceModule {}
