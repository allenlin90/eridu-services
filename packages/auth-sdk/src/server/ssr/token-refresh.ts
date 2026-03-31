import type { JwtVerifier } from '../jwt/jwt-verifier.js';

/**
 * Forwards the browser's session cookie header to eridu_auth `/api/auth/token`
 * and verifies the returned JWT. Used in SSR middleware and callback endpoints.
 *
 * @param authApiUrl - eridu_auth backend base URL
 * @param cookieHeader - raw Cookie header string from the incoming request
 * @param verifier - JwtVerifier instance (should be a module-level singleton)
 * @returns verified token + payload, or null if refresh failed
 */
export async function refreshSessionToken<TPayload>(
  authApiUrl: string,
  cookieHeader: string,
  verifier: JwtVerifier,
): Promise<{ token: string; payload: TPayload } | null> {
  try {
    const res = await fetch(`${authApiUrl}/api/auth/token`, {
      headers: { cookie: cookieHeader },
    });

    if (!res.ok)
      return null;

    const data = (await res.json()) as { token?: string };
    const token = data?.token;
    if (!token)
      return null;

    const payload = await verifier.verify(token);
    return { token, payload: payload as TPayload };
  } catch {
    return null;
  }
}
