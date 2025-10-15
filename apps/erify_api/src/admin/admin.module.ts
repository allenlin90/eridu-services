import { Module } from '@nestjs/common';

import { AdminClientModule } from './clients/admin-client.module';
import { AdminUserModule } from './users/admin-user.module';

@Module({
  imports: [AdminUserModule, AdminClientModule],
  exports: [AdminUserModule, AdminClientModule],
})
export class AdminModule {}
