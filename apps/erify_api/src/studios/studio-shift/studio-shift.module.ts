import { Module } from '@nestjs/common';

import { ShiftCalendarController } from './shift-calendar.controller';
import { StudioShiftController } from './studio-shift.controller';

import { StudioShiftModule as StudioShiftModelModule } from '@/models/studio-shift/studio-shift.module';
import { ShiftAlignmentModule } from '@/orchestration/shift-alignment/shift-alignment.module';
import { ShiftCalendarModule } from '@/orchestration/shift-calendar/shift-calendar.module';

@Module({
  imports: [StudioShiftModelModule, ShiftCalendarModule, ShiftAlignmentModule],
  controllers: [StudioShiftController, ShiftCalendarController],
})
export class StudioShiftApiModule {}
