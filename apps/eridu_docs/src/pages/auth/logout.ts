import type { APIRoute } from 'astro';

import { CONFIG } from '../../config/env';
import { clearTokenCookie, signOutFromAuth } from '../../lib/auth';

export const GET: APIRoute = async (context) => {
  const cookieHeader = context.request.headers.get('cookie') ?? '';

  // Use SITE_URL as the Origin header — context.url.origin is localhost:PORT
  // in Railway, which fails Better Auth's CSRF check and silently leaves the
  // session alive.
  const siteOrigin = CONFIG.siteUrl ?? context.url.origin;
  await signOutFromAuth(cookieHeader, siteOrigin);
  clearTokenCookie(context.cookies);

  // Redirect to the auth sign-in page, not back into the docs.
  // Redirecting to any docs route would trigger the silent-SSO middleware path,
  // which would re-exchange the (still-valid) Better Auth session cookies for a
  // fresh JWT and immediately log the user back in.
  return context.redirect(new URL('/sign-in', CONFIG.authUiUrl).toString(), 302);
};
