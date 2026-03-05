import { Module } from '@nestjs/common';

import { ShiftAlignmentService } from './shift-alignment.service';

import { ShowModule } from '@/models/show/show.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';
import { TaskModule } from '@/models/task/task.module';

@Module({
  imports: [StudioModule, StudioShiftModule, ShowModule, TaskModule],
  providers: [ShiftAlignmentService],
  exports: [ShiftAlignmentService],
})
export class ShiftAlignmentModule {}
