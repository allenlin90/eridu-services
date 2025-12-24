import { Module } from '@nestjs/common';

import { ProfileController } from './profile.controller';

import { UserModule } from '@/models/user/user.module';

/**
 * Profile Module
 *
 * Handles user profile endpoints for authenticated users.
 * Provides access to the current user's profile information extracted from JWT tokens.
 */
@Module({
  imports: [UserModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
