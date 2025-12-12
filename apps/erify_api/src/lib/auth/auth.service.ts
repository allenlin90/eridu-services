import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import type { JwksServiceConfig } from '@eridu/auth-sdk/server/jwks/types';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';
import type { JwtVerifierConfig } from '@eridu/auth-sdk/server/jwt/types';

import type { Env } from '@/config/env.schema';
import { HttpError } from '@/lib/errors/http-error.util';

/**
 * Authentication service that manages JWKS and JWT verification
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwksService: JwksService;
  private readonly jwtVerifier: JwtVerifier;

  constructor(private readonly configService: ConfigService<Env>) {
    const authUrl = this.configService.get('ERIDU_AUTH_URL', { infer: true });

    if (!authUrl) {
      throw HttpError.internalServerError('ERIDU_AUTH_URL is required');
    }

    // Initialize JWKS Service
    // Cache recovery is handled automatically - if cache is lost (restart, redeploy, etc.),
    // the service will automatically refetch on the next request
    // Uses Better Auth standard JWKS path (/api/auth/jwks) by default
    const jwksConfig: JwksServiceConfig = {
      authServiceUrl: authUrl,
    };
    this.jwksService = new JwksService(jwksConfig);

    // Initialize JWT Verifier
    const jwtConfig: JwtVerifierConfig = {
      jwksService: this.jwksService,
      issuer: authUrl,
    };
    this.jwtVerifier = new JwtVerifier(jwtConfig);
  }

  /**
   * Initialize JWKS on module startup
   *
   * If initialization fails, the service will automatically retry on the first
   * JWT verification request. This ensures the app can start even if the auth
   * service is temporarily unavailable.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.jwksService.initialize();
      this.logger.log('JWKS initialized successfully');
    } catch (error) {
      // Log warning but don't throw - cache recovery will handle it
      // This allows the app to start even if auth service is temporarily unavailable
      const errorMessage
        = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to initialize JWKS on startup: ${errorMessage}. Will retry on first use.`,
      );
    }
  }

  /**
   * Get the JWT verifier instance
   */
  getJwtVerifier(): JwtVerifier {
    return this.jwtVerifier;
  }

  /**
   * Get the JWKS service instance
   */
  getJwksService(): JwksService {
    return this.jwksService;
  }
}
