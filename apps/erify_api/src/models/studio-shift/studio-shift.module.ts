import { Module } from '@nestjs/common';

import { StudioShiftRepository } from './studio-shift.repository';
import { StudioShiftService } from './studio-shift.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { MembershipModule } from '@/models/membership/membership.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, MembershipModule],
  providers: [StudioShiftService, StudioShiftRepository],
  exports: [StudioShiftService],
})
export class StudioShiftModule {}
