/**
 * JWKS Service - Fetches and caches JSON Web Key Sets from Better Auth's JWKS endpoint
 */

import type { JWK } from "jose";

import type { JwksResponse, JwksServiceConfig } from "./types.js";

import { BETTER_AUTH_ENDPOINTS } from "../../constants.js";
import { fetchJwks } from "./jwks-client.js";

/**
 * Service for managing JWKS fetching and caching
 *
 * This service automatically handles cache loss scenarios:
 * - On startup: Fetches and caches JWKS
 * - On cache loss: Automatically refetches when cache is empty
 * - On key rotation: JwtVerifier automatically triggers refresh
 *
 * Works in all runtime environments (server, edge, worker) - if cache is lost
 * due to environment constraints (e.g., edge runtime statelessness), the service
 * will automatically refetch on the next request.
 */
export class JwksService {
  private readonly authServiceUrl: string;
  private readonly jwksPath: string;
  private cachedJwks: JwksResponse | null = null;
  private cachedKeys: Map<string, JWK> = new Map();
  private lastFetchedTime: Date | null = null;

  constructor(config: JwksServiceConfig) {
    this.authServiceUrl = config.authServiceUrl;
    this.jwksPath = config.jwksPath ?? BETTER_AUTH_ENDPOINTS.JWKS;

    if (!this.authServiceUrl) {
      throw new Error("authServiceUrl is required");
    }
  }

  /**
   * Initialize the service by fetching JWKS on startup
   * Should be called during application startup
   *
   * If initialization fails or cache is lost (e.g., server restart, redeploy),
   * the service will automatically refetch on the next getJwks() or getKeys() call.
   */
  async initialize(): Promise<void> {
    try {
      await this.refreshJwks();
    }
    catch (error) {
      // Log but don't throw - cache recovery will handle it on first use
      // This allows the app to start even if auth service is temporarily unavailable
      console.warn(
        `Failed to initialize JWKS on startup: ${error instanceof Error ? error.message : "Unknown error"}. Will retry on first use.`,
      );
    }
  }

  /**
   * Get cached JWKS, automatically refetching if cache is lost
   *
   * This method handles cache loss scenarios automatically:
   * - Server restart: Cache is empty, will refetch
   * - Redeploy: Cache is empty, will refetch
   * - Edge runtime: Cache may be lost between requests, will refetch
   */
  async getJwks(): Promise<JwksResponse> {
    if (!this.cachedJwks) {
      await this.refreshJwks();
    }

    if (!this.cachedJwks) {
      throw new Error("Failed to fetch JWKS");
    }

    return this.cachedJwks;
  }

  /**
   * Get cached JWK keys as a Map for efficient lookup
   * Automatically refetches if cache is lost
   */
  async getKeys(): Promise<Map<string, JWK>> {
    if (this.cachedKeys.size === 0) {
      await this.refreshJwks();
    }

    return this.cachedKeys;
  }

  /**
   * Refresh JWKS from the auth service
   * Useful for key rotation scenarios
   */
  async refreshJwks(): Promise<void> {
    const jwks = await fetchJwks(this.authServiceUrl, this.jwksPath);
    this.cachedJwks = jwks;
    this.cachedKeys = this.buildKeysMap(jwks);
    this.lastFetchedTime = new Date();
  }

  /**
   * Get the number of keys in the cached JWKS
   */
  getKeysCount(): number {
    return this.cachedKeys.size;
  }

  /**
   * Get the last time JWKS were fetched
   */
  getLastFetchedTime(): Date | null {
    return this.lastFetchedTime;
  }

  /**
   * Get the JWKS URL
   */
  getJwksUrl(): string {
    return `${this.authServiceUrl}${this.jwksPath}`;
  }

  /**
   * Get the JWKS path being used
   * This is useful for debugging and logging purposes
   */
  getJwksPath(): string {
    return this.jwksPath;
  }

  /**
   * Build a Map of key ID to JWK for efficient lookup
   */
  private buildKeysMap(jwks: JwksResponse): Map<string, JWK> {
    const keysMap = new Map<string, JWK>();

    for (const key of jwks.keys) {
      if (key.kid) {
        // Convert to JWK format expected by jose library
        const jwk: JWK = {
          kty: key.kty,
          kid: key.kid,
          ...(key.use && { use: key.use }),
          ...(key.alg && { alg: key.alg }),
          ...(key.crv && { crv: key.crv }),
          ...(key.x && { x: key.x }),
          ...(key.y && { y: key.y }),
        };

        keysMap.set(key.kid, jwk);
      }
    }

    return keysMap;
  }
}
