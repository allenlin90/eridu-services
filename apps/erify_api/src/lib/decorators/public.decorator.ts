import { applyDecorators, SetMetadata } from '@nestjs/common';

import { SKIP_JWT_AUTH_KEY } from './skip-jwt-auth.decorator';

/**
 * @deprecated Use SKIP_JWT_AUTH_KEY instead. Kept for backward compatibility with other guards.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public (skip JWT authentication).
 * This is a semantic wrapper around SkipJwtAuth for better code readability.
 */
export function Public() {
  return applyDecorators(
    SetMetadata(SKIP_JWT_AUTH_KEY, { skip: true, reason: 'public' }),
    SetMetadata(IS_PUBLIC_KEY, true), // Keep for backward compatibility
  );
}
