import { Module } from '@nestjs/common';

import { AdminStudioRoomController } from './admin-studio-room.controller';

import { StudioRoomModule } from '@/models/studio-room/studio-room.module';

@Module({
  imports: [StudioRoomModule],
  controllers: [AdminStudioRoomController],
})
export class AdminStudioRoomModule {}
