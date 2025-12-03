import { Module } from '@nestjs/common';

import { AdminStudioRoomController } from './admin-studio-room.controller';

import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [StudioRoomModule, UtilityModule],
  controllers: [AdminStudioRoomController],
})
export class AdminStudioRoomModule {}
