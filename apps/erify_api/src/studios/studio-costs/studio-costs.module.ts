import { Module } from '@nestjs/common';

import { StudioCostCalculatorService } from './studio-cost-calculator.service';
import { StudioCostsController } from './studio-costs.controller';
import { StudioCostsRepository } from './studio-costs.repository';
import { StudioCostsService } from './studio-costs.service';

import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudioCostsController],
  providers: [StudioCostsService, StudioCostsRepository, StudioCostCalculatorService],
  exports: [StudioCostsService],
})
export class StudioCostsModule {}
