import { Module } from '@nestjs/common';

import { MeShiftsController } from './shifts.controller';
import { MeShiftsService } from './shifts.service';

import { StudioModule } from '@/models/studio/studio.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';
import { UserModule } from '@/models/user/user.module';

@Module({
  imports: [UserModule, StudioModule, StudioShiftModule],
  controllers: [MeShiftsController],
  providers: [MeShiftsService],
})
export class MeShiftsModule {}
