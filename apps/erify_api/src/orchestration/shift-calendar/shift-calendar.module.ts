import { Module } from '@nestjs/common';

import { ShiftCalendarService } from './shift-calendar.service';

import { StudioModule } from '@/models/studio/studio.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';

@Module({
  imports: [StudioModule, StudioShiftModule],
  providers: [ShiftCalendarService],
  exports: [ShiftCalendarService],
})
export class ShiftCalendarModule {}
