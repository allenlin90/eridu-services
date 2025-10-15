import { Module } from '@nestjs/common';

import { AdminClientModule } from './clients/admin-client.module';
import { AdminMcModule } from './mcs/admin-mc.module';
import { AdminUserModule } from './users/admin-user.module';

@Module({
  imports: [AdminUserModule, AdminClientModule, AdminMcModule],
  exports: [AdminUserModule, AdminClientModule, AdminMcModule],
})
export class AdminModule {}
