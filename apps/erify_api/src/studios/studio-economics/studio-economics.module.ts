import { Module } from '@nestjs/common';

import { StudioEconomicsController } from './studio-economics.controller';
import { StudioEconomicsService } from './studio-economics.service';

import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';

@Module({
  imports: [ShowModule, ShowCreatorModule, ShowPlatformModule, StudioCreatorModelModule, StudioShiftModule],
  controllers: [StudioEconomicsController],
  providers: [StudioEconomicsService],
})
export class StudioEconomicsModule {}
