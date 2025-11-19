import { Module } from '@nestjs/common';

import { UserModule } from '@/models/user/user.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminUserController } from './admin-user.controller';

/**
 * Admin User Module
 *
 * Manages admin endpoints for user management.
 * Uses AdminAccessModule for authentication and authorization.
 */
@Module({
  imports: [UserModule, UtilityModule],
  controllers: [AdminUserController],
})
export class AdminUserModule {}
