/**
 * In-memory store for the JWT token
 *
 * This avoids circular dependencies between client.ts and auth.ts
 * and allows efficient token access without async calls
 */
let cachedToken: string | null = null;

export const getCachedToken = () => cachedToken;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export function clearCachedToken() {
  cachedToken = null;
}
