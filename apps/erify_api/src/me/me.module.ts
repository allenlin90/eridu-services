import { Module } from '@nestjs/common';

import { MeTaskModule } from './me-task/me-task.module';
import { ProfileModule } from './profile/profile.module';
import { ShowsModule } from './shows/shows.module';

@Module({
  imports: [ProfileModule, ShowsModule, MeTaskModule],
  exports: [ShowsModule, MeTaskModule],
})
export class MeModule {}
