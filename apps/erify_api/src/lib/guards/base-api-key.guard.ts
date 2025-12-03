import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { Env } from '@/config/env.schema';
import { HttpError } from '@/lib/errors/http-error.util';

/**
 * Service context attached to request when API key is validated
 * Ready for future JWT integration
 */
export type ServiceContext = {
  type: 'api-key';
  serviceName: string;
  // Future: Add user context from JWT
  // userId?: string;
  // userEmail?: string;
};

/**
 * Extend Express Request to include service context
 */
declare global {

  namespace Express {
    // eslint-disable-next-line ts/consistent-type-definitions
    interface Request {
      service?: ServiceContext;
    }
  }
}

/**
 * Base API Key Guard for server-to-server authentication
 *
 * This is an abstract base class that provides common API key validation logic.
 * Extend this class to create service-specific guards with isolated validation.
 *
 * Behavior:
 * - If API key is configured: Always validates API key (all environments)
 * - If not set in development: Bypasses authentication (useful for local dev)
 * - If not set in production: Returns 401 error (production requires API key)
 */
@Injectable()
export abstract class BaseApiKeyGuard implements CanActivate {
  protected readonly logger: Logger;
  protected readonly isProduction: boolean;

  constructor(
    protected readonly configService: ConfigService<Env>,
    protected readonly serviceName: string,
  ) {
    this.logger = new Logger(`${serviceName}ApiKeyGuard`);
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.getApiKeyFromConfig();
    const providedApiKey = this.extractApiKeyFromHeader(request);

    // If API key is configured in env, always validate
    if (apiKey) {
      if (!providedApiKey) {
        this.logger.warn(`${this.serviceName} API key not provided in request`);
        throw new UnauthorizedException(
          `${this.serviceName} API key is required`,
        );
      }

      if (!this.validateApiKey(providedApiKey, apiKey)) {
        this.logger.warn(`Invalid ${this.serviceName} API key provided`);
        throw new UnauthorizedException(`Invalid ${this.serviceName} API key`);
      }

      // Attach service context to request
      request.service = {
        type: 'api-key',
        serviceName: this.serviceName,
      };

      this.logger.debug(`${this.serviceName} API key validated successfully`);
      return true;
    }

    // API key not configured in env
    if (this.isProduction) {
      // In production: Require API key to be configured
      // This ensures production endpoints are properly secured
      this.logger.error(
        `${this.serviceName} API key (${this.getEnvKeyName()}) is required in production but not configured`,
      );
      throw HttpError.unauthorized(
        `${this.serviceName} API key authentication is required in production`,
      );
    }

    // Development mode: Bypass authentication if no API key configured
    this.logger.debug(
      `${this.serviceName} API key not configured in development, bypassing authentication`,
    );
    return true;
  }

  /**
   * Get API key from environment configuration
   * Override this method to customize how the API key is retrieved
   */
  protected abstract getApiKeyFromConfig(): string | undefined;

  /**
   * Get the environment variable key name for logging
   */
  protected abstract getEnvKeyName(): string;

  /**
   * Validate the provided API key against the configured key
   * Override this method to add custom validation logic
   */
  protected validateApiKey(
    providedKey: string,
    configuredKey: string,
  ): boolean {
    return providedKey === configuredKey;
  }

  /**
   * Extract API key from request header
   * Override this method to customize header extraction
   */
  protected extractApiKeyFromHeader(request: Request): string | undefined {
    const apiKey = request.headers['x-api-key'] || request.headers['X-API-Key'];
    return typeof apiKey === 'string' ? apiKey : undefined;
  }
}
