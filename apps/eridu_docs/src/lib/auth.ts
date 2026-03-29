import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';
import type { JwtPayload } from '@eridu/auth-sdk/types';
import type { AstroCookies } from 'astro';

import { CONFIG } from '../config/env';

export const COOKIE_NAME = 'eridu_docs_token';
export const TOKEN_MAX_AGE = 900; // 15 min, matches JWT expiry

const jwksService = new JwksService({ authServiceUrl: CONFIG.authUrl });
export const jwtVerifier = new JwtVerifier({
  jwksService,
  issuer: CONFIG.authUrl,
});

jwksService
  .initialize()
  .catch((err) => console.error('Failed to prefetch JWKS:', err));

export function buildLoginUrl(origin: string, pathname: string): string {
  const callbackUrl = new URL('/auth/callback', origin);
  callbackUrl.searchParams.set('returnTo', pathname);

  const loginUrl = new URL('/sign-in', CONFIG.authUrl);
  loginUrl.searchParams.set('callbackURL', callbackUrl.toString());
  return loginUrl.toString();
}

export function setTokenCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !CONFIG.isDev,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
    ...(CONFIG.cookieDomain ? { domain: CONFIG.cookieDomain } : {}),
  });
}

export async function refreshToken(
  cookieHeader: string,
): Promise<{ token: string; payload: JwtPayload } | null> {
  try {
    const res = await fetch(`${CONFIG.authUrl}/api/auth/token`, {
      headers: { cookie: cookieHeader },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { token?: string };
    const token = data?.token;
    if (!token) return null;

    const payload = await jwtVerifier.verify(token);
    return { token, payload };
  } catch {
    return null;
  }
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
