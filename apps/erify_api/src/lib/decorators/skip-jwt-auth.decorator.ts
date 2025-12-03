import { SetMetadata } from '@nestjs/common';

/**
 * Unified metadata key for skipping JWT authentication.
 * All decorators that skip JWT auth should use this key.
 * This allows the JwtAuthGuard to check a single key instead of multiple decorator-specific keys.
 */
export const SKIP_JWT_AUTH_KEY = 'skipJwtAuth';

/**
 * Base decorator that marks a route to skip JWT authentication.
 * This is used internally by other skip decorators (Public, Backdoor, GoogleSheets, etc.)
 *
 * @param reason Optional reason for skipping (for logging/debugging purposes)
 */
export function SkipJwtAuth(reason?: string) {
  return SetMetadata(SKIP_JWT_AUTH_KEY, { skip: true, reason });
}
