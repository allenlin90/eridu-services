import { Module } from '@nestjs/common';

import { AdminUserController } from './admin-user.controller';

import { UserModule } from '@/models/user/user.module';

/**
 * Admin User Module
 *
 * Manages admin endpoints for user management.
 */
@Module({
  imports: [UserModule],
  controllers: [AdminUserController],
})
export class AdminUserModule {}
