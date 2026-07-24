import { Module } from '@nestjs/common';

import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

import { ShowCatalogModule } from '@/capabilities/show-catalog/show-catalog.module';
import { ClientModule } from '@/models/client/client.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [
    PrismaModule,
    UtilityModule,
    ClientModule,
    StudioRoomModule,
    ShowCatalogModule,
  ],
  providers: [ShowService, ShowRepository],
  exports: [ShowService, ShowRepository],
})
export class ShowModule {}
