import { Module } from '@nestjs/common';

import { StudioCostsController } from './studio-costs.controller';
import { StudioCostsRepository } from './studio-costs.repository';
import { StudioCostsService } from './studio-costs.service';

import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudioCostsController],
  providers: [StudioCostsService, StudioCostsRepository],
  exports: [StudioCostsService],
})
export class StudioCostsModule {}
