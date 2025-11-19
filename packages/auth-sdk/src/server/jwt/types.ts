/**
 * JWT-related types
 */

import type { JwksService } from "../jwks/jwks-service.js";

/**
 * Configuration for JWT Verifier
 */
export type JwtVerifierConfig = {
  /**
   * JWKS Service instance for key management
   */
  jwksService: JwksService;
  /**
   * Expected JWT issuer (should match ERIFY_AUTH_URL)
   */
  issuer: string;
  /**
   * Expected JWT audience (defaults to issuer if not provided)
   */
  audience?: string;
};
