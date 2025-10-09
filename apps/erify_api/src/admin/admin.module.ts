import { Module } from '@nestjs/common';

import { AdminUserModule } from './users/admin-user.module';

@Module({
  imports: [AdminUserModule],
  exports: [AdminUserModule],
})
export class AdminModule {}
