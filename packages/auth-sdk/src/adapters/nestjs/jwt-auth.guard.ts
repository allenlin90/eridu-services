/**
 * NestJS Guard for JWT Authentication
 *
 * Base guard class that can be extended for custom behavior.
 * Provides common JWT validation logic while allowing subclasses to:
 * - Customize error handling
 * - Transform user data before attaching to request
 * - Add additional validation logic
 */

import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import type { JwtVerifier } from '../../server/jwt/jwt-verifier.js';
import type { JwtPayload, UserInfo } from '../../types.js';

/**
 * Extended Request interface with user information
 */
export type AuthenticatedRequest = {
  user?: UserInfo;
} & Request;

/**
 * Configuration options for customizing guard behavior
 */
export type JwtAuthGuardOptions = {
  /**
   * Custom error handler for authentication failures
   * @param message - Error message
   * @param originalError - Original error if available
   * @returns Error to throw
   */
  createUnauthorizedError?: (message: string, originalError?: Error) => Error;

  /**
   * Transform user data before attaching to request
   * @param payload - Full JWT payload
   * @param userInfo - Extracted user info
   * @returns Transformed user object to attach to request
   */
  transformUser?: (payload: JwtPayload, userInfo: UserInfo) => unknown;
};

/**
 * Base NestJS Guard that validates JWT tokens and attaches user information to the request.
 *
 * This guard can be used directly for simple cases, or extended for custom behavior:
 * - Custom error handling (e.g., HttpError instead of UnauthorizedException)
 * - User data transformation (e.g., adding ext_id mapping, full payload)
 * - Additional validation logic
 *
 * @example
 * ```typescript
 * // Simple usage
 * const guard = new JwtAuthGuard(jwtVerifier);
 *
 * // Custom error handling
 * class CustomGuard extends JwtAuthGuard {
 *   protected createUnauthorizedError(message: string, error?: Error): Error {
 *     return HttpError.unauthorized(message);
 *   }
 * }
 *
 * // Custom user transformation
 * class ExtendedGuard extends JwtAuthGuard {
 *   protected transformUser(payload: JwtPayload, userInfo: UserInfo) {
 *     return { ...userInfo, ext_id: payload.id, payload };
 *   }
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  protected readonly logger: Logger;
  protected readonly jwtVerifier: JwtVerifier;
  protected readonly options?: JwtAuthGuardOptions;

  constructor(jwtVerifier: JwtVerifier, options?: JwtAuthGuardOptions) {
    this.jwtVerifier = jwtVerifier;
    this.options = options;
    this.logger = new Logger(JwtAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Extract token from Authorization header
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No JWT token provided in request');
      throw this.createUnauthorizedError('Authentication token is required');
    }

    try {
      // Verify token
      const payload = await this.jwtVerifier.verify(token);

      // Extract user information
      const userInfo = this.jwtVerifier.extractUserInfo(payload);

      // Transform user data if custom transformer provided
      const transformedUser = this.transformUser(payload, userInfo);

      // Attach user to request
      request.user = transformedUser as UserInfo;

      this.logger.debug(`JWT token validated for user: ${userInfo.email}`);

      return true;
    } catch (error) {
      this.logger.warn(
        `JWT token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      const errorMessage
        = error instanceof Error
          ? `Invalid token: ${error.message}`
          : 'Invalid authentication token';

      throw this.createUnauthorizedError(
        errorMessage,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Create unauthorized error - can be overridden for custom error handling
   */
  protected createUnauthorizedError(
    message: string,
    originalError?: Error,
  ): Error {
    if (this.options?.createUnauthorizedError) {
      return this.options.createUnauthorizedError(message, originalError);
    }
    return new UnauthorizedException(message);
  }

  /**
   * Transform user data before attaching to request - can be overridden for custom mapping
   */
  protected transformUser(payload: JwtPayload, userInfo: UserInfo): unknown {
    if (this.options?.transformUser) {
      return this.options.transformUser(payload, userInfo);
    }
    return userInfo;
  }

  /**
   * Extract JWT token from Authorization header
   * Supports both "Bearer <token>" and "<token>" formats
   * Can be overridden for custom token extraction logic
   */
  protected extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return null;
    }

    // Handle "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Handle plain token format
    return authHeader;
  }
}
