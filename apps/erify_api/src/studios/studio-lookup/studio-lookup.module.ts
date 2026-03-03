import { Module } from '@nestjs/common';

import { StudioLookupController } from './studio-lookup.controller';

import { PlatformModule } from '@/models/platform/platform.module';
import { ShowStandardModule } from '@/models/show-standard/show-standard.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { ShowTypeModule } from '@/models/show-type/show-type.module';

@Module({
  imports: [
    ShowTypeModule,
    ShowStandardModule,
    ShowStatusModule,
    PlatformModule,
  ],
  controllers: [StudioLookupController],
})
export class StudioLookupModule {}
