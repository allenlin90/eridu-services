import type { BetterAuthClientOptions } from 'better-auth';
import { jwtClient } from 'better-auth/client/plugins';
import { createAuthClient as createBetterAuthClient } from 'better-auth/react';

export function createAuthClient(options: BetterAuthClientOptions) {
  /**
   * Redirects to the login page with the current URL as the return destination.
   * Handles edge cases like query parameters, hash fragments, and prevents redirect loops.
   *
   * @param returnUrl - Optional custom return URL. If not provided, uses current window.location.href
   */
  const redirectToLogin = (returnUrl?: string) => {
    // Prevent redirect loop - don't redirect if already on the auth app
    const authBaseUrl = options.baseURL || '';
    if (window.location.href.startsWith(authBaseUrl)) {
      console.warn('Already on auth app, skipping redirect to prevent loop');
      return;
    }

    // Use provided returnUrl or construct from current location
    const returnTo = returnUrl || window.location.href;

    // Build the login URL with the return destination
    const loginUrl = new URL('/sign-in', authBaseUrl);
    loginUrl.searchParams.set('callbackURL', returnTo);

    window.location.href = loginUrl.toString();
  };

  const client = createBetterAuthClient({
    plugins: [
      jwtClient(),
    ],
    ...options,
  });

  return {
    client,
    redirectToLogin,
  };
}

/**
 * Re-export Better Auth types for convenience
 */
export type { Session } from 'better-auth/types';
