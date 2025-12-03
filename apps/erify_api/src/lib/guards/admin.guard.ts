import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { StudioMembership } from '@prisma/client';

import { AuthenticatedRequest } from '@/lib/auth/jwt-auth.guard';
import { IS_ADMIN_KEY } from '@/lib/decorators/admin-protected.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';

/**
 * Admin Guard
 *
 * Authorization guard that verifies the authenticated user has admin role.
 * This guard assumes authentication has already been performed by JwtAuthGuard.
 *
 * Architecture:
 * - Expects request.user to be populated by JwtAuthGuard
 * - Checks if user has admin role in ANY studio via StudioMembershipService
 * - Stateless: no dependencies on other guards (follows NestJS best practice)
 *
 * Behavior:
 * 1. Reads authenticated user from request.user (populated by JwtAuthGuard)
 * 2. Queries database for admin membership using optimized query
 * 3. Attaches adminMembership to request.adminMembership for downstream use
 * 4. Throws UnauthorizedException if user is not authenticated
 * 5. Throws ForbiddenException if user is not admin
 *
 * Usage (with explicit guard composition):
 * ```typescript
 * @Controller('admin/users')
 * @UseGuards(JwtAuthGuard, AdminGuard)  // Guards run in sequence
 * export class AdminUserController {
 *   // Only authenticated admin users can access these endpoints
 *
 *   @Get('reports')
 *   getReports(@Req() req: AuthenticatedRequest) {
 *     // Access admin membership without re-querying database
 *     const studioId = req.adminMembership?.studioId;
 *     // ... use studioId for filtering, etc.
 *   }
 * }
 * ```
 *
 * Why separate guards instead of one composed guard?
 * - Guards are stateless and composable (NestJS idiomatic pattern)
 * - Avoids guard-to-guard DI coupling
 * - Clear separation of concerns: authentication vs authorization
 * - Better testability (test each guard independently)
 * - Avoids circular dependencies between modules
 * - Explicit dependencies in modules (no hidden re-exports)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly studioMembershipService: StudioMembershipService,
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

    const adminMembership: StudioMembership | null
      = await this.studioMembershipService.findAdminMembershipByExtId(ext_id);

    if (!adminMembership) {
      this.logger.warn(
        `User ${email} (ext_id: ${ext_id}) attempted to access admin endpoint but is not an admin`,
      );
      throw HttpError.forbidden('Admin access required');
    }

    // Attach admin membership to request for downstream use (e.g., in controllers)
    // This avoids re-querying the database when studio context is needed
    request.adminMembership = adminMembership;

    this.logger.debug(
      `Admin access granted for user: ${email} (ext_id: ${ext_id}, studio: ${adminMembership.studioId})`,
    );

    return true;
  }
}
