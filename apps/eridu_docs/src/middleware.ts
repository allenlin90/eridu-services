import { defineMiddleware } from 'astro:middleware';
import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';

import { CONFIG } from './config/env';

// Initialize the shared auth SDK verifier globally so JWKS is cached across requests
const jwksService = new JwksService({ authServiceUrl: CONFIG.auth.url });
const jwtVerifier = new JwtVerifier({ jwksService, issuer: CONFIG.auth.url });

// Prefetch JWKS to prime the cache (non-blocking)
jwksService.initialize().catch(err => console.error("Failed to prefetch JWKS:", err));

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Skip auth check for static assets (images, css, etc.)
  if (context.url.pathname.startsWith('/_astro/') || context.url.pathname.match(/\.(png|jpg|jpeg|gif|css|js|ico|svg)$/)) {
    return next();
  }

  // 2. Dev & Local Bypass (Put BEFORE reading headers/cookies to avoid Astro SSR warnings on prerendered pages)
  if (CONFIG.isDev || CONFIG.bypassAuth) {
    if (context.url.pathname === '/') {
      // Only warn on the root so we don't spam the terminal on every chunk load
      console.warn("🔐 [DEV] Auth Token Bypassed for local docs dev.");
    }
    return next();
  }

  // 3. Extract the token (Bearer Token only)
  const token = context.request.headers.get("Authorization")?.replace("Bearer ", "");

  // 4. Fallback: If no token, redirect to login
  if (!token) {
    // Redirect unauthenticated user to Login
    const loginUrl = new URL(CONFIG.urls.login);
    loginUrl.searchParams.set('callbackURL', context.url.href);
    return context.redirect(loginUrl.toString(), 302);
  }

  // 5. Verify Token Signature via SDK (JWKS)
  try {
    await jwtVerifier.verify(token);
    return next();
  } catch (err: unknown) {
    console.error("🔑 Invalid JWT Signature:", err instanceof Error ? err.message : err);
    
    // Redirect unauthenticated user
    const loginUrl = new URL(CONFIG.urls.login);
    loginUrl.searchParams.set('callbackURL', context.url.href);
    return context.redirect(loginUrl.toString(), 302);
  }
});
