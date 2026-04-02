import { Module } from '@nestjs/common';

import { EconomicsRepository } from './economics.repository';
import { EconomicsService } from './economics.service';

import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EconomicsService, EconomicsRepository],
  exports: [EconomicsService],
})
export class EconomicsModule {}
