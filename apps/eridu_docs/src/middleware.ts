import { defineMiddleware } from 'astro:middleware';

import { CONFIG } from './config/env';
import {
  COOKIE_NAME,
  buildLoginUrl,
  extractUser,
  jwtVerifier,
  refreshToken,
  setTokenCookie,
} from './lib/auth';

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/auth/') ||
    /\.(png|jpg|jpeg|gif|css|js|ico|svg|webp|woff2?)$/.test(pathname)
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (isPublicPath(context.url.pathname)) return next();
  const returnTo = `${context.url.pathname}${context.url.search}`;

  if (CONFIG.bypassAuth) {
    if (context.url.pathname === '/') {
      console.warn('[DEV] Auth bypassed for local docs dev.');
    }
    return next();
  }

  const token = context.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return context.redirect(
      buildLoginUrl(context.url.origin, returnTo),
      302,
    );
  }

  // Verify JWT with cached JWKS (zero network calls on happy path)
  try {
    const payload = await jwtVerifier.verify(token);
    context.locals.user = extractUser(payload);
    return next();
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const isExpired =
      message.includes('"exp" claim') || message.includes('timestamp check');

    if (isExpired) {
      // Server-side refresh: forward Better Auth session cookies to get fresh JWT
      const cookieHeader = context.request.headers.get('cookie') || '';
      const refreshed = await refreshToken(cookieHeader);

      if (refreshed) {
        setTokenCookie(context.cookies, refreshed.token);
        context.locals.user = extractUser(refreshed.payload);
        return next();
      }
    }

    return context.redirect(
      buildLoginUrl(context.url.origin, returnTo),
      302,
    );
  }
});
