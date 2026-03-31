import type { APIRoute } from 'astro';

import { clearTokenCookie, normalizeReturnTo, signOutFromAuth } from '../../lib/auth';

export const GET: APIRoute = async (context) => {
  const returnTo = normalizeReturnTo(context.url.searchParams.get('returnTo'));
  const cookieHeader = context.request.headers.get('cookie') || '';

  await signOutFromAuth(cookieHeader, context.url.origin);
  clearTokenCookie(context.cookies);

  return context.redirect(returnTo, 302);
};
