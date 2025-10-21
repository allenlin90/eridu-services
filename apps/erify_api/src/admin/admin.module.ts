import { Module } from '@nestjs/common';

import { AdminClientModule } from './clients/admin-client.module';
import { AdminMcModule } from './mcs/admin-mc.module';
import { AdminPlatformModule } from './platforms/admin-platform.module';
import { AdminShowStandardModule } from './show-standards/admin-show-standard.module';
import { AdminShowStatusModule } from './show-statuses/admin-show-status.module';
import { AdminShowTypeModule } from './show-types/admin-show-type.module';
import { AdminStudioRoomModule } from './studio-rooms/admin-studio-room.module';
import { AdminStudioModule } from './studios/admin-studio.module';
import { AdminUserModule } from './users/admin-user.module';

@Module({
  imports: [
    AdminUserModule,
    AdminClientModule,
    AdminMcModule,
    AdminPlatformModule,
    AdminShowStandardModule,
    AdminShowStatusModule,
    AdminShowTypeModule,
    AdminStudioModule,
    AdminStudioRoomModule,
  ],
  exports: [
    AdminUserModule,
    AdminClientModule,
    AdminMcModule,
    AdminPlatformModule,
    AdminShowStandardModule,
    AdminShowStatusModule,
    AdminShowTypeModule,
    AdminStudioModule,
    AdminStudioRoomModule,
  ],
})
export class AdminModule {}
