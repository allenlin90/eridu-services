import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';
import type { JwtPayload } from '@eridu/auth-sdk/types';
import {
  normalizeReturnTo,
  refreshSessionToken,
} from '@eridu/auth-sdk/server/ssr';
import type { AstroCookies } from 'astro';

import { CONFIG } from '../config/env';

export const COOKIE_NAME = 'eridu_docs_token';
export const TOKEN_MAX_AGE = 900; // 15 min, matches JWT expiry

export { normalizeReturnTo };

const jwksService = new JwksService({ authServiceUrl: CONFIG.authApiUrl });
export const jwtVerifier = new JwtVerifier({
  jwksService,
  issuer: CONFIG.authIssuerUrl,
});

if (!CONFIG.bypassAuth) {
  jwksService
    .initialize()
    .catch((err) => console.error('Failed to prefetch JWKS:', err));
}

export function buildLoginUrl(origin: string, pathname: string): string {
  // Use SITE_URL if configured — Railway's ingress passes Host: localhost:PORT
  // to the container, so context.url.origin would produce the wrong callback URL.
  const callbackBase = CONFIG.siteUrl ?? origin;
  const callbackUrl = new URL('/auth/callback', callbackBase);
  callbackUrl.searchParams.set('returnTo', pathname);

  const loginUrl = new URL('/sign-in', CONFIG.authUiUrl);
  loginUrl.searchParams.set('callbackURL', callbackUrl.toString());
  return loginUrl.toString();
}

export function setTokenCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: CONFIG.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function refreshToken(
  cookieHeader: string,
): Promise<{ token: string; payload: JwtPayload } | null> {
  return refreshSessionToken<JwtPayload>(CONFIG.authApiUrl, cookieHeader, jwtVerifier);
}

export function clearTokenCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, {
    path: '/',
  });
}

export function extractUser(
  payload: JwtPayload,
): NonNullable<App.Locals['user']> {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    image: payload.image ?? undefined,
  };
}
