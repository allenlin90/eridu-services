import { Module } from '@nestjs/common';

import { StudioRoomModule } from '../../studio-room/studio-room.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminStudioRoomController } from './admin-studio-room.controller';

@Module({
  imports: [StudioRoomModule, UtilityModule],
  controllers: [AdminStudioRoomController],
})
export class AdminStudioRoomModule {}
