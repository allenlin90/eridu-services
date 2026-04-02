import { Module } from '@nestjs/common';

import { StudioEconomicsController } from './studio-economics.controller';

import { EconomicsModule } from '@/models/economics/economics.module';

@Module({
  imports: [EconomicsModule],
  controllers: [StudioEconomicsController],
})
export class StudioEconomicsModule {}
