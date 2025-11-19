import { applyDecorators, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/lib/auth/jwt-auth.guard';
import { AdminGuard } from '@/lib/guards/admin.guard';

/**
 * Admin Authentication & Authorization Decorator
 *
 * Convenience decorator that applies both JWT authentication and admin authorization.
 * This decorator combines JwtAuthGuard and AdminGuard in the correct order.
 *
 * Module requirements:
 * - Import AdminAccessModule in your module (provides all required dependencies)
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [AdminAccessModule],
 *   controllers: [AdminController],
 * })
 * export class AdminModule {}
 *
 * @Controller('admin/users')
 * @AdminAuth()
 * export class AdminUserController {
 *   // All endpoints require authenticated admin users
 * }
 * ```
 *
 * Or on individual routes:
 * ```typescript
 * @Post()
 * @AdminAuth()
 * async createUser(@Body() body: CreateUserDto) {
 *   // Only authenticated admin users can access this endpoint
 * }
 * ```
 *
 * This is equivalent to:
 * ```typescript
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * ```
 *
 * Guards run in sequence:
 * 1. JwtAuthGuard validates JWT token and populates request.user
 * 2. AdminGuard checks if request.user has admin role
 */
export function AdminAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard, AdminGuard));
}
