import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedRequest } from '@/lib/auth/jwt-auth.guard';
import { IS_ADMIN_KEY } from '@/lib/decorators/admin-protected.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { UserService } from '@/models/user/user.service';

/**
 * Admin Guard
 *
 * Authorization guard that verifies the authenticated user has SYSTEM ADMIN privileges.
 * This guard assumes authentication has already been performed by JwtAuthGuard.
 *
 * Architecture:
 * - Expects request.user to be populated by JwtAuthGuard
 * - Checks if user has `isSystemAdmin` flag set to true in User table
 * - Stateless: no dependencies on other guards (follows NestJS best practice)
 *
 * Behavior:
 * 1. Reads authenticated user from request.user (populated by JwtAuthGuard)
 * 2. Queries database for User by ext_id
 * 3. Throws UnauthorizedException if user is not authenticated
 * 4. Throws ForbiddenException if user is not a system admin
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAdmin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdmin) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      this.logger.warn(
        'User not found in request - JwtAuthGuard must run before AdminGuard',
      );
      throw HttpError.unauthorized('Authentication required');
    }

    const { ext_id, email } = request.user;

    // Check system admin status via UserService
    // We fetch the full user record to check the isSystemAdmin flag
    const user = await this.userService.getUserByExtId(ext_id);

    if (!user || !user.isSystemAdmin) {
      this.logger.warn(
        `User ${email} (ext_id: ${ext_id}) attempted to access system admin endpoint but is not a system admin`,
      );
      throw HttpError.forbidden('System Admin access required');
    }

    this.logger.debug(
      `System Admin access granted for user: ${email} (ext_id: ${ext_id})`,
    );

    return true;
  }
}
