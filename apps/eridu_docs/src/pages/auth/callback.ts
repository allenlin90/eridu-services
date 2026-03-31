import type { APIRoute } from 'astro';

import {
  buildLoginUrl,
  normalizeReturnTo,
  refreshToken,
  setTokenCookie,
} from '../../lib/auth';

export const GET: APIRoute = async (context) => {
  const returnTo = normalizeReturnTo(context.url.searchParams.get('returnTo'));
  const loginUrl = buildLoginUrl(context.url.origin, returnTo);

  // Forward Better Auth session cookies (cross-subdomain on .eridu.io) to get JWT
  const cookieHeader = context.request.headers.get('cookie') || '';
  const refreshed = await refreshToken(cookieHeader);

  if (!refreshed) {
    return context.redirect(loginUrl, 302);
  }

  setTokenCookie(context.cookies, refreshed.token);
  return context.redirect(returnTo, 302);
};
