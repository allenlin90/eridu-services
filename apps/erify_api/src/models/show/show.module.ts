import { Module } from '@nestjs/common';

import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

import { ClientModule } from '@/models/client/client.module';
import { ShowStandardModule } from '@/models/show-standard/show-standard.module';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { ShowTypeModule } from '@/models/show-type/show-type.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [
    PrismaModule,
    UtilityModule,
    ClientModule,
    StudioRoomModule,
    ShowTypeModule,
    ShowStatusModule,
    ShowStandardModule,
  ],
  providers: [ShowService, ShowRepository],
  exports: [ShowService],
})
export class ShowModule {}
