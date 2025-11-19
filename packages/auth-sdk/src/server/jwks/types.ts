/**
 * JWKS-related types
 */

/**
 * Configuration for JWKS Service
 */
export type JwksServiceConfig = {
  /**
   * Base URL of the auth service (e.g., http://localhost:3000 or https://auth.example.com)
   */
  authServiceUrl: string;
  /**
   * Path to JWKS endpoint (defaults to Better Auth standard endpoint)
   * Only override if using a custom Better Auth basePath configuration
   */
  jwksPath?: string;
};

/**
 * JWKS response structure
 */
export type JwksResponse = {
  keys: Array<{
    kty: string;
    use?: string;
    kid: string;
    x?: string;
    y?: string;
    crv?: string;
    alg?: string;
    [key: string]: unknown;
  }>;
};
