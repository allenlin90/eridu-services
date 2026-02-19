import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedRequest } from '@/lib/auth/jwt-auth.guard';
import { STUDIO_ROLES_KEY, StudioRole } from '@/lib/decorators/studio-protected.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import { UserService } from '@/models/user/user.service';

/**
 * Studio Guard
 *
 * Authorization guard that verifies:
 * 1. User has a valid membership in the target studio
 * 2. User has one of the required roles (if specified)
 * 3. Studio ID is present in the route parameters
 *
 * Architecture:
 * - Can be applied globally or per-controller/method
 * - If @StudioProtected() is not present, it passes through (unless global guard enforcement is rigorous, but here we check for metadata first)
 * - Fetches membership via UserService to minimize DI overhead
 * - Attaches studioMembership to the request object for downstream use
 */
@Injectable()
export class StudioGuard implements CanActivate {
  private readonly logger = new Logger(StudioGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<StudioRole[]>(
      STUDIO_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Pass through if not protected
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.ensureAuthenticated(request);

    const studioId = this.getStudioId(request);

    const membership = await this.fetchMembership(request.user!, studioId);
    this.ensureMembershipExists(membership, request.user!, studioId);
    this.checkRoles(membership!, roles, request.user!.email, studioId);

    // Attach membership to request context
    request.studioMembership = membership!;

    return true;
  }

  private ensureAuthenticated(request: AuthenticatedRequest): void {
    if (!request.user) {
      this.logger.warn(
        'User not found in request - JwtAuthGuard must run before StudioGuard',
      );
      throw HttpError.unauthorized('Authentication required');
    }
  }

  private getStudioId(request: AuthenticatedRequest): string {
    const studioId = request.params?.studioId;

    if (!studioId) {
      this.logger.error(
        'StudioGuard applied but no studioId parameter found in request',
      );
      throw HttpError.badRequest('Context missing studio identifier');
    }

    if (!studioId.startsWith(StudioService.UID_PREFIX)) {
      throw HttpError.badRequest('Invalid Studio ID format');
    }

    return studioId;
  }

  private async fetchMembership(user: { ext_id: string }, studioId: string) {
    return this.userService.getStudioMembership(user.ext_id, studioId);
  }

  private ensureMembershipExists(membership: any, user: { ext_id: string; email: string }, studioId: string): void {
    if (!membership) {
      this.logger.warn(
        `User ${user.email} (ext_id: ${user.ext_id}) attempted to access studio ${studioId} without membership`,
      );
      throw HttpError.forbidden('Studio membership required');
    }
  }

  private checkRoles(membership: any, roles: StudioRole[], email: string, studioId: string) {
    if (roles.length > 0) {
      const hasRole = roles.includes(membership.role as StudioRole);
      if (!hasRole) {
        this.logger.warn(
          `User ${email} (role: ${membership.role}) missing required roles [${roles.join(', ')}] for studio ${studioId}`,
        );
        throw HttpError.forbidden('Insufficient studio permissions');
      }
    }
  }
}
