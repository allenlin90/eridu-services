import { Module } from '@nestjs/common';

import { ShowsModule } from './shows/shows.module';

/**
 * Me Module
 *
 * User-scoped API endpoints for authenticated users.
 * Similar to AdminModule but scoped to the authenticated user's resources.
 *
 * Endpoints are prefixed with `/me` (e.g., `/me/shows`)
 */
@Module({
  imports: [ShowsModule],
  exports: [ShowsModule],
})
export class MeModule {}
