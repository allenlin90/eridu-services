import { Module } from '@nestjs/common';

import { AdminClientModule } from './clients/admin-client.module';
import { AdminMcModule } from './mcs/admin-mc.module';
import { AdminStudioMembershipModule } from './memberships/admin-studio-membership.module';
import { AdminPlatformModule } from './platforms/admin-platform.module';
import { AdminScheduleModule } from './schedules/admin-schedule.module';
import { AdminShowMcModule } from './show-mcs/admin-show-mc.module';
import { AdminShowPlatformModule } from './show-platforms/admin-show-platform.module';
import { AdminShowStandardModule } from './show-standards/admin-show-standard.module';
import { AdminShowStatusModule } from './show-statuses/admin-show-status.module';
import { AdminShowTypeModule } from './show-types/admin-show-type.module';
import { AdminShowModule } from './shows/admin-show.module';
import { AdminSnapshotModule } from './snapshots/admin-snapshot.module';
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
    AdminShowModule,
    AdminShowMcModule,
    AdminShowPlatformModule,
    AdminStudioModule,
    AdminStudioRoomModule,
    AdminStudioMembershipModule,
    AdminScheduleModule,
    AdminSnapshotModule,
  ],
  exports: [
    AdminUserModule,
    AdminClientModule,
    AdminMcModule,
    AdminPlatformModule,
    AdminShowStandardModule,
    AdminShowStatusModule,
    AdminShowTypeModule,
    AdminShowModule,
    AdminShowMcModule,
    AdminShowPlatformModule,
    AdminStudioModule,
    AdminStudioRoomModule,
    AdminStudioMembershipModule,
    AdminScheduleModule,
    AdminSnapshotModule,
  ],
})
export class AdminModule {}
