import { Module } from '@nestjs/common';

import { AdminStudioController } from './admin-studio.controller';

import { StudioModule } from '@/models/studio/studio.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';

@Module({
  imports: [StudioModule, StudioRoomModule],
  controllers: [AdminStudioController],
})
export class AdminStudioModule {}
