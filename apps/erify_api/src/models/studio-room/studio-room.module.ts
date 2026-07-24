import { Module } from '@nestjs/common';

import { StudioRoomRepository } from './studio-room.repository';
import { StudioRoomService } from './studio-room.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [StudioRoomService, StudioRoomRepository],
  exports: [StudioRoomService],
})
export class StudioRoomModule {}
