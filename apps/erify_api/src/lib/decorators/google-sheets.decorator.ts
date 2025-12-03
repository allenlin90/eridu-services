import { applyDecorators, SetMetadata } from '@nestjs/common';

import { SKIP_JWT_AUTH_KEY } from './skip-jwt-auth.decorator';

/**
 * @deprecated Use SKIP_JWT_AUTH_KEY instead. Kept for backward compatibility with other guards.
 */
export const IS_GOOGLE_SHEETS_KEY = 'is_google_sheets';

/**
 * Decorator to mark a route as Google Sheets endpoint (skip JWT authentication, use API key instead).
 * This is a semantic wrapper around SkipJwtAuth for better code readability.
 */
export function GoogleSheets() {
  return applyDecorators(
    SetMetadata(SKIP_JWT_AUTH_KEY, { skip: true, reason: 'google-sheets' }),
    SetMetadata(IS_GOOGLE_SHEETS_KEY, true), // Keep for backward compatibility
  );
}
