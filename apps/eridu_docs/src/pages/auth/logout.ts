import type { APIRoute } from 'astro';

import { CONFIG } from '../../config/env';
import { COOKIE_NAME, jwtVerifier } from '../../lib/auth';

export const GET: APIRoute = async (context) => {
  const siteOrigin = CONFIG.siteUrl ?? context.url.origin;

  // Server-to-server session revocation via JWT identity.
  //
  // Why not forward Better Auth session cookies to /api/auth/sign-out?
  //   eridu_auth's Set-Cookie response clears Domain=.eridu.io cookies, but
  //   the browser only applies those headers when the response comes from a
  //   same-domain request. A server-forwarded Set-Cookie from eridu_docs does
  //   not reliably clear cookies on the .eridu.io domain in all browsers.
  //
  // Why JWT instead of a session token?
  //   eridu_docs already has the user's JWT (eridu_docs_token cookie). We verify
  //   it to get the userId, then POST to the internal /api/service/sign-out
  //   endpoint which deletes all sessions for that user directly in the database.
  //   The browser's Better Auth session cookies become invalid server-side, so
  //   the next silent-SSO attempt on the callback endpoint will fail → sign-in
  //   page is shown rather than re-logging the user in transparently.
  if (CONFIG.authServiceSecret) {
    const token = context.cookies.get(COOKIE_NAME)?.value;

    if (token) {
      try {
        const payload = await jwtVerifier.verify(token);

        if (payload.id) {
          const revokeUrl = new URL('/api/service/sign-out', CONFIG.authApiUrl);
          // Best-effort: network errors or eridu_auth downtime must not block logout.
          await fetch(revokeUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${CONFIG.authServiceSecret}`,
            },
            body: JSON.stringify({ userId: payload.id }),
          }).catch(() => {
            // Swallow — session will expire naturally; local cookie is cleared below.
          });
        }
      } catch {
        // JWT is expired or invalid — skip revocation, clear cookie below.
      }
    }
  }

  // Clear the docs JWT cookie.
  const cookieFlags = [
    `${COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    CONFIG.cookieSecure ? 'Secure' : '',
    'SameSite=Lax',
  ].filter(Boolean).join('; ');

  // Redirect to sign-in with a callbackURL so the user is returned to docs
  // after re-authenticating. Use /auth/callback (not a specific docs page) so
  // the callback can issue a fresh JWT on the next login.
  const callbackUrl = new URL('/auth/callback', siteOrigin);
  const signInUrl = new URL('/sign-in', CONFIG.authUiUrl);
  signInUrl.searchParams.set('callbackURL', callbackUrl.toString());

  return new Response(null, {
    status: 302,
    headers: {
      Location: signInUrl.toString(),
      'set-cookie': cookieFlags,
      'cache-control': 'no-store',
    },
  });
};
