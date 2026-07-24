import { Module } from '@nestjs/common';

import { AdminClientModule } from './clients/admin-client.module';
import { AdminCompensationLineItemModule } from './compensation-line-items/admin-compensation-line-item.module';
import { AdminCreatorModule } from './creators/admin-creator.module';
import { AdminStudioMembershipModule } from './memberships/admin-studio-membership.module';
import { AdminScheduleModule } from './schedules/admin-schedule.module';
import { AdminShowCreatorModule } from './show-creators/admin-show-creator.module';
import { AdminShowPlatformModule } from './show-platforms/admin-show-platform.module';
import { AdminShowModule } from './shows/admin-show.module';
import { AdminSnapshotModule } from './snapshots/admin-snapshot.module';
import { AdminStudioRoomModule } from './studio-rooms/admin-studio-room.module';
import { AdminStudioModule } from './studios/admin-studio.module';
import { AdminTaskTemplateModule } from './task-templates/admin-task-template.module';
import { AdminTaskModule } from './tasks/admin-task.module';
import { AdminUserModule } from './users/admin-user.module';

import { ShowCatalogModule } from '@/capabilities/show-catalog/show-catalog.module';

@Module({
  imports: [
    AdminUserModule,
    AdminClientModule,
    AdminCreatorModule,
    ShowCatalogModule,
    AdminShowModule,
    AdminShowCreatorModule,
    AdminShowPlatformModule,
    AdminStudioModule,
    AdminStudioRoomModule,
    AdminStudioMembershipModule,
    AdminTaskModule,
    AdminTaskTemplateModule,
    AdminScheduleModule,
    AdminSnapshotModule,
    AdminCompensationLineItemModule,
  ],
})
export class AdminModule {}
