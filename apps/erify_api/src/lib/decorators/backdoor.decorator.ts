import { applyDecorators, SetMetadata } from '@nestjs/common';

import { SKIP_JWT_AUTH_KEY } from './skip-jwt-auth.decorator';

/**
 * @deprecated Use SKIP_JWT_AUTH_KEY instead. Kept for backward compatibility with other guards.
 */
export const IS_BACKDOOR_KEY = 'is_backdoor_protected';

/**
 * Decorator to mark a route as backdoor (skip JWT authentication, use API key instead).
 * This is a semantic wrapper around SkipJwtAuth for better code readability.
 */
export function Backdoor() {
  return applyDecorators(
    SetMetadata(SKIP_JWT_AUTH_KEY, { skip: true, reason: 'backdoor' }),
    SetMetadata(IS_BACKDOOR_KEY, true), // Keep for backward compatibility
  );
}
