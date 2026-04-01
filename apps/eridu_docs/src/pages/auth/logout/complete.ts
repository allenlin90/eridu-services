import type { APIRoute } from 'astro';

import { CONFIG } from '../../../config/env';
import { buildLoginUrl, clearTokenCookie, normalizeReturnTo } from '../../../lib/auth';

export const GET: APIRoute = async (context) => {
  const returnTo = normalizeReturnTo(context.url.searchParams.get('returnTo'));
  const siteOrigin = CONFIG.siteUrl ?? context.url.origin;

  clearTokenCookie(context.cookies);

  return context.redirect(buildLoginUrl(siteOrigin, returnTo), 302);
};
