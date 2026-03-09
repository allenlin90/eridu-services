import { Module } from '@nestjs/common';

import { StudioShiftRepository } from './studio-shift.repository';
import { StudioShiftService } from './studio-shift.service';

import { MembershipModule } from '@/models/membership/membership.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, MembershipModule],
  providers: [StudioShiftService, StudioShiftRepository],
  exports: [StudioShiftService, StudioShiftRepository],
})
export class StudioShiftModule {}
