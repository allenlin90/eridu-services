/**
 * JWT Verifier - Verifies JWT tokens locally using cached JWKS
 */

import { createLocalJWKSet, jwtVerify } from 'jose';

import type { JwtPayload, UserInfo } from '../../types.js';

import { extractUserInfo, validateJwtPayload } from './jwt-payload.js';
import type { JwtVerifierConfig } from './types.js';

/**
 * Service for verifying JWT tokens using JWKS
 *
 * Uses JwksService as the single source of truth for keys — jose never makes
 * its own HTTP requests. This gives us full control over fetch timeouts,
 * caching, and key rotation retries.
 */
export class JwtVerifier {
  private readonly jwksService: JwtVerifierConfig['jwksService'];
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: JwtVerifierConfig) {
    this.jwksService = config.jwksService;
    this.issuer = config.issuer;
    this.audience = config.audience ?? config.issuer;

    if (!this.issuer) {
      throw new Error('issuer is required');
    }
  }

  /**
   * Verify a JWT token and return the payload.
   * Automatically handles key rotation by refreshing JWKS if unknown key ID detected.
   */
  async verify(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.verifyWithCachedKeys(token);
      return payload;
    } catch (error) {
      if (error instanceof Error) {
        // Key rotation: unknown kid → refresh cache and retry once
        if (
          error.message.includes('no matching key')
          || error.message.includes('key not found')
        ) {
          await this.jwksService.refreshJwks();
          return this.verifyWithCachedKeys(token);
        }

        throw new Error(`JWT verification failed: ${error.message}`);
      }

      throw new Error('Unknown error occurred during JWT verification');
    }
  }

  /**
   * Extract user information from JWT payload
   */
  extractUserInfo(payload: JwtPayload): UserInfo {
    return extractUserInfo(payload);
  }

  /**
   * Verify token against the locally-cached JWKS.
   * JwksService.getJwks() will auto-fetch if the cache is empty (e.g. after restart).
   */
  private async verifyWithCachedKeys(token: string): Promise<JwtPayload> {
    const jwks = await this.jwksService.getJwks();
    const localKeySet = createLocalJWKSet(jwks);

    const { payload } = await jwtVerify(token, localKeySet, {
      issuer: this.issuer,
      audience: this.audience,
    });

    if (!validateJwtPayload(payload)) {
      throw new Error('Invalid JWT payload structure');
    }

    return payload as JwtPayload;
  }
}
