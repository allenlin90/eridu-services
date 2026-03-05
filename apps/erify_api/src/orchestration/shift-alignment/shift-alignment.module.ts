import { Module } from '@nestjs/common';

import { ShiftAlignmentService } from './shift-alignment.service';

import { MembershipModule } from '@/models/membership/membership.module';
import { ShowModule } from '@/models/show/show.module';
import { StudioModule } from '@/models/studio/studio.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';

@Module({
  imports: [StudioModule, StudioShiftModule, ShowModule, MembershipModule],
  providers: [ShiftAlignmentService],
  exports: [ShiftAlignmentService],
})
export class ShiftAlignmentModule {}
