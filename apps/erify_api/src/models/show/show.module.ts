import { Module } from '@nestjs/common';

import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

import { ShowCatalogModule } from '@/capabilities/show-catalog/show-catalog.module';
import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { ClientModule } from '@/models/client/client.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    UidGeneratorModule,
    ClientModule,
    StudioRoomModule,
    ShowCatalogModule,
  ],
  providers: [ShowService, ShowRepository],
  exports: [ShowService, ShowRepository],
})
export class ShowModule {}
