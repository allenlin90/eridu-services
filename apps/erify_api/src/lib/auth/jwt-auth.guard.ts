import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { StudioMembership } from '@prisma/client';
import type { Request } from 'express';

import { JwtAuthGuard as SdkJwtAuthGuard } from '@eridu/auth-sdk/adapters/nestjs/jwt-auth.guard';
import type { JwtPayload, UserInfo } from '@eridu/auth-sdk/types';

import { AuthService } from './auth.service';

import { SKIP_JWT_AUTH_KEY } from '@/lib/decorators/skip-jwt-auth.decorator';
import { HttpError } from '@/lib/errors/http-error.util';

/**
 * Authenticated user type returned by JwtAuthGuard
 * This type represents the transformed user object attached to the request
 */
export type AuthenticatedUser = {
  ext_id: string; // Maps to user.id from JWT payload (better-auth user ID)
  id: string; // Same as ext_id for convenience
  name: string;
  email: string;
  image?: string;
  payload: JwtPayload; // Full JWT payload for advanced use cases
};

/**
 * Extended Request interface with user information and ext_id
 * Also includes adminMembership when AdminGuard has verified admin access
 */
export type AuthenticatedRequest = {
  user?: AuthenticatedUser;
  adminMembership?: StudioMembership; // Attached by AdminGuard when admin access is verified
} & Request;

/**
 * JWT Auth Guard that extends the SDK guard and adds API-specific behavior:
 * - Maps user.id to ext_id (for database User.ext_id mapping)
 * - Includes full JWT payload in request
 * - Uses HttpError instead of UnauthorizedException
 *
 * This demonstrates how to extend the SDK guard for custom requirements.
 * The guard validates the JWT token and extracts user information.
 * The user.id from the better-auth JWT payload is mapped to ext_id
 * in the request, which corresponds to User.ext_id in the database.
 */
@Injectable()
export class JwtAuthGuard extends SdkJwtAuthGuard {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {
    // Pass JwtVerifier and custom options to parent class
    super(authService.getJwtVerifier(), {
      // Custom error handling using HttpError
      createUnauthorizedError: (message: string) => {
        return HttpError.unauthorized(message);
      },
      // Custom user transformation to add ext_id mapping and full payload
      transformUser: (payload: JwtPayload, userInfo: UserInfo) => {
        return {
          ext_id: payload.id, // Map better-auth user.id to ext_id
          id: payload.id, // Keep id for convenience
          name: userInfo.name,
          email: userInfo.email,
          image: userInfo.image,
          payload, // Include full payload for advanced use cases
        };
      },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for any decorator that skips JWT authentication
    // This unified approach allows adding new skip decorators without modifying the guard
    const skipAuth = this.reflector.getAllAndOverride<{
      skip: boolean;
      reason?: string;
    }>(SKIP_JWT_AUTH_KEY, [context.getHandler(), context.getClass()]);

    if (skipAuth?.skip) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Override to add custom logging with ext_id
   */
  protected transformUser(
    payload: JwtPayload,
    userInfo: UserInfo,
  ): {
      ext_id: string;
      id: string;
      name: string;
      email: string;
      image?: string;
      payload: JwtPayload;
    } {
    const transformed = super.transformUser(payload, userInfo) as {
      ext_id: string;
      id: string;
      name: string;
      email: string;
      image?: string;
      payload: JwtPayload;
    };

    // Log with ext_id for better debugging
    this.logger.debug(
      `JWT token validated for user: ${userInfo.email} (ext_id: ${payload.id})`,
    );

    return transformed;
  }
}
