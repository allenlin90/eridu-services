import { Module } from '@nestjs/common';

import { StudioLookupController } from './studio-lookup.controller';

import { ClientModule } from '@/models/client/client.module';
import { PlatformModule } from '@/models/platform/platform.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ShowStandardModule } from '@/models/show-standard/show-standard.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { ShowTypeModule } from '@/models/show-type/show-type.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';

@Module({
  imports: [
    ClientModule,
    ShowTypeModule,
    ShowStandardModule,
    ShowStatusModule,
    PlatformModule,
    ScheduleModule,
    StudioRoomModule,
  ],
  controllers: [StudioLookupController],
})
export class StudioLookupModule {}
