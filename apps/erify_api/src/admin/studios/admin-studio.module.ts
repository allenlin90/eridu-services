import { Module } from '@nestjs/common';

import { AdminStudioController } from './admin-studio.controller';

import { StudioModule } from '@/models/studio/studio.module';
import { StudioRoomModule } from '@/models/studio-room/studio-room.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [StudioModule, StudioRoomModule, UtilityModule],
  controllers: [AdminStudioController],
})
export class AdminStudioModule {}
