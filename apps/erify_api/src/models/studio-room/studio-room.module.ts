import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { StudioRoomRepository } from './studio-room.repository';
import { StudioRoomService } from './studio-room.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [StudioRoomService, StudioRoomRepository],
  exports: [StudioRoomService],
})
export class StudioRoomModule {}
