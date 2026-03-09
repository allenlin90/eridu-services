import { Module } from '@nestjs/common';

import { StudioEconomicsController } from './studio-economics.controller';
import { StudioEconomicsService } from './studio-economics.service';

import { ShowModule } from '@/models/show/show.module';
import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';

@Module({
  imports: [ShowModule, ShowMcModule, ShowPlatformModule, StudioShiftModule],
  controllers: [StudioEconomicsController],
  providers: [StudioEconomicsService],
})
export class StudioEconomicsModule {}
