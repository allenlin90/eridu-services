import { Module } from '@nestjs/common';

import { StudioModule } from '../../studio/studio.module';
import { StudioRoomModule } from '../../studio-room/studio-room.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminStudioRoomController } from './admin-studio-room.controller';
import { AdminStudioRoomService } from './admin-studio-room.service';

@Module({
  imports: [StudioRoomModule, StudioModule, UtilityModule],
  controllers: [AdminStudioRoomController],
  providers: [AdminStudioRoomService],
})
export class AdminStudioRoomModule {}
