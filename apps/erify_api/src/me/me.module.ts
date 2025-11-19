import { Module } from '@nestjs/common';

import { ProfileModule } from './profile/profile.module';
import { ShowsModule } from './shows/shows.module';

@Module({
  imports: [ProfileModule, ShowsModule],
  exports: [ShowsModule],
})
export class MeModule {}
