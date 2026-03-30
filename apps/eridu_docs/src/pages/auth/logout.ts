import type { APIRoute } from 'astro';

import { clearTokenCookie, signOutFromAuth } from '../../lib/auth';

function normalizeReturnTo(value: string | null): string {
  if (!value) return '/';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

export const GET: APIRoute = async (context) => {
  const returnTo = normalizeReturnTo(context.url.searchParams.get('returnTo'));
  const cookieHeader = context.request.headers.get('cookie') || '';

  await signOutFromAuth(cookieHeader, context.url.origin);
  clearTokenCookie(context.cookies);

  return context.redirect(returnTo, 302);
};
