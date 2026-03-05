import { Module } from '@nestjs/common';

import { MeTaskModule } from './me-task/me-task.module';
import { ProfileModule } from './profile/profile.module';
import { MeShiftsModule } from './shifts/shifts.module';
import { ShowsModule } from './shows/shows.module';

@Module({
  imports: [ProfileModule, ShowsModule, MeTaskModule, MeShiftsModule],
  exports: [ShowsModule, MeTaskModule, MeShiftsModule],
})
export class MeModule {}
