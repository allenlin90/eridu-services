/**
 * Calls eridu_auth sign-out endpoint server-side by forwarding the browser's
 * session cookies. Best-effort — caller should always clear the local JWT cookie
 * regardless of whether this call succeeds.
 *
 * @param authApiUrl - eridu_auth backend base URL
 * @param cookieHeader - raw Cookie header string from the incoming request
 * @param origin - optional Origin header (some CSRF checks require it)
 */
export async function signOutFromAuth(
  authApiUrl: string,
  cookieHeader: string,
  origin?: string,
): Promise<void> {
  try {
    await fetch(`${authApiUrl}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        ...(origin ? { origin } : {}),
      },
    });
  } catch {
    // Caller must clear the local JWT cookie even if this fails.
  }
}
