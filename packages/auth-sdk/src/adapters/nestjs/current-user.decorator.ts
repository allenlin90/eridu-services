import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { createParamDecorator, UnauthorizedException } from "@nestjs/common";

import type { UserInfo } from "../../types.js";

/**
 * Type-safe request interface for authenticated endpoints
 * Used internally by the decorator to extract user from request
 */
type AuthenticatedRequest = {
  user?: UserInfo;
} & Request;

/**
 * CurrentUser decorator - Type-safe way to extract authenticated user from request
 *
 * This decorator extracts the user from the request object that was set by JwtAuthGuard.
 * It provides better type safety and cleaner code than accessing request.user directly.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: UserInfo) {
 *   return { id: user.id, email: user.email };
 * }
 * ```
 *
 * **Generic Design:**
 * The decorator returns `UserInfo` by default, but apps can use type annotations
 * to specify their transformed user type (if they extend the guard and transform the user).
 *
 * @example App with transformed user type
 * ```typescript
 * // App guard transforms UserInfo → AuthenticatedUser
 * @Get()
 * @UseGuards(CustomJwtAuthGuard) // Transforms user
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   // TypeScript knows it's AuthenticatedUser
 *   return { ext_id: user.ext_id };
 * }
 * ```
 *
 * Benefits:
 * - Type-safe: TypeScript knows the exact type of user (via annotation)
 * - Context-aware: Only works when guard is applied
 * - No global type pollution: Doesn't affect Express types globally
 * - Cleaner code: No need to check if user exists (throws if missing)
 *
 * @throws UnauthorizedException if user is not found (guard should have set it)
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserInfo => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException(
        "User not found in request - JwtAuthGuard should have set this",
      );
    }

    return request.user;
  },
);
