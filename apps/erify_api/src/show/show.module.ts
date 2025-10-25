import { Module } from '@nestjs/common';

import { ClientModule } from '../client/client.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShowStandardModule } from '../show-standard/show-standard.module';
import { ShowStatusModule } from '../show-status/show-status.module';
import { ShowTypeModule } from '../show-type/show-type.module';
import { StudioRoomModule } from '../studio-room/studio-room.module';
import { UtilityModule } from '../utility/utility.module';
import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

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
