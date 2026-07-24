import { Module } from '@nestjs/common';

import { StudioLookupController } from './studio-lookup.controller';

import { ShowCatalogModule } from '@/capabilities/show-catalog/show-catalog.module';
import { ClientModule } from '@/models/client/client.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';

@Module({
  imports: [
    ClientModule,
    ShowCatalogModule,
    ScheduleModule,
    StudioRoomModule,
  ],
  controllers: [StudioLookupController],
})
export class StudioLookupModule {}
