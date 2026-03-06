import { Module } from '@nestjs/common';

import { MeShiftsController } from './shifts.controller';
import { MeShiftsService } from './shifts.service';

import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';
import { UserModule } from '@/models/user/user.module';

@Module({
  imports: [UserModule, StudioShiftModule],
  controllers: [MeShiftsController],
  providers: [MeShiftsService],
})
export class MeShiftsModule {}
