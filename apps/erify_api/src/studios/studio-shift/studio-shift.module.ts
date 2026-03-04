import { Module } from '@nestjs/common';

import { StudioShiftController } from './studio-shift.controller';

import { StudioShiftModule as StudioShiftModelModule } from '@/models/studio-shift/studio-shift.module';

@Module({
  imports: [StudioShiftModelModule],
  controllers: [StudioShiftController],
})
export class StudioShiftApiModule {}
