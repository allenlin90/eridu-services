import type { APIRoute } from 'astro';

import { CONFIG } from '../../config/env';
import { clearTokenCookie } from '../../lib/auth';

export const GET: APIRoute = async (context) => {
  const cookieHeader = context.request.headers.get('cookie') ?? '';
  const siteOrigin = CONFIG.siteUrl ?? context.url.origin;

  // Call eridu_auth sign-out directly (not via the sdk helper) so we can
  // capture the Set-Cookie headers from the response. The sdk helper discards
  // the response; without forwarding those headers the browser keeps its Better
  // Auth session cookies and silent-SSO immediately re-logs the user in.
  let authSetCookies: string[] = [];
  try {
    const res = await fetch(`${CONFIG.authApiUrl}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        origin: siteOrigin,
      },
    });
    authSetCookies = res.headers.getSetCookie();
  }
  catch {
    // best-effort — clear the local cookie regardless
  }

  // Clear the docs JWT cookie via context so Astro merges it into the response.
  clearTokenCookie(context.cookies);

  // Build sign-in URL with a callbackURL so the user is returned to docs
  // after re-authenticating.
  const callbackUrl = new URL('/auth/callback', siteOrigin);
  const signInUrl = new URL('/sign-in', CONFIG.authUiUrl);
  signInUrl.searchParams.set('callbackURL', callbackUrl.toString());

  const response = context.redirect(signInUrl.toString(), 302);

  // Forward eridu_auth's Set-Cookie headers so the browser actually clears
  // the Better Auth session cookies. Without this the sign-out appears to
  // succeed on eridu_auth's side but the browser retains the cookies.
  for (const cookie of authSetCookies) {
    response.headers.append('set-cookie', cookie);
  }

  return response;
};
