/**
 * JWT Verifier - Verifies JWT tokens locally using cached JWKS
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

import type { JwtPayload, UserInfo } from "../../types.js";
import type { JwtVerifierConfig } from "./types.js";

import { extractUserInfo, validateJwtPayload } from "./jwt-payload.js";

/**
 * Service for verifying JWT tokens using JWKS
 */
export class JwtVerifier {
  private readonly jwksService: JwtVerifierConfig["jwksService"];
  private readonly issuer: string;
  private readonly audience: string;
  private remoteJWKSet: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(config: JwtVerifierConfig) {
    this.jwksService = config.jwksService;
    this.issuer = config.issuer;
    this.audience = config.audience ?? config.issuer;

    if (!this.issuer) {
      throw new Error("issuer is required");
    }
  }

  /**
   * Verify a JWT token and return the payload
   * Automatically handles key rotation by refreshing JWKS if unknown key ID detected
   */
  async verify(token: string): Promise<JwtPayload> {
    try {
      // Get JWKS URL for remote JWK set
      const jwksUrl = this.getJwksUrl();

      // Create or reuse remote JWK set (handles key rotation automatically)
      if (!this.remoteJWKSet) {
        this.remoteJWKSet = createRemoteJWKSet(new URL(jwksUrl));
      }

      // Verify token
      const { payload } = await jwtVerify(token, this.remoteJWKSet, {
        issuer: this.issuer,
        audience: this.audience,
      });

      // Validate payload structure
      if (!validateJwtPayload(payload)) {
        throw new Error("Invalid JWT payload structure");
      }

      return payload as JwtPayload;
    }
    catch (error) {
      if (error instanceof Error) {
        // Check if it's a key rotation issue (unknown key ID)
        if (
          error.message.includes("no matching key")
          || error.message.includes("key not found")
        ) {
          // Refresh JWKS and retry once
          await this.jwksService.refreshJwks();
          // Reset remote JWK set to force refresh
          this.remoteJWKSet = null;

          // Retry verification
          const jwksUrl = this.getJwksUrl();
          this.remoteJWKSet = createRemoteJWKSet(new URL(jwksUrl));

          const { payload } = await jwtVerify(token, this.remoteJWKSet, {
            issuer: this.issuer,
            audience: this.audience,
          });

          if (!validateJwtPayload(payload)) {
            throw new Error("Invalid JWT payload structure");
          }

          return payload as JwtPayload;
        }

        throw new Error(`JWT verification failed: ${error.message}`);
      }

      throw new Error("Unknown error occurred during JWT verification");
    }
  }

  /**
   * Extract user information from JWT payload
   */
  extractUserInfo(payload: JwtPayload): UserInfo {
    return extractUserInfo(payload);
  }

  /**
   * Get JWKS URL from JWKS service
   */
  private getJwksUrl(): string {
    return this.jwksService.getJwksUrl();
  }
}
