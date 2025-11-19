import { Module } from '@nestjs/common';

import { AuthModule } from '@/lib/auth/auth.module';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { MembershipModule } from '@/models/membership/membership.module';

/**
 * Admin Access Module
 *
 * Provides admin authorization capabilities by bundling:
 * - AuthModule: JWT authentication via JwtAuthGuard
 * - MembershipModule: Admin role verification via StudioMembershipService
 * - AdminGuard: Authorization guard that checks admin membership
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [AdminAccessModule, /* other modules *\/],
 *   controllers: [AdminController],
 * })
 * export class AdminModule {}
 * ```
 *
 * The AdminGuard is automatically available when using @AdminAuth() decorator.
 * Guards run in sequence: JwtAuthGuard → AdminGuard
 */
@Module({
  imports: [AuthModule, MembershipModule],
  providers: [AdminGuard],
  exports: [AdminGuard, AuthModule, MembershipModule],
})
export class AdminAccessModule {}
