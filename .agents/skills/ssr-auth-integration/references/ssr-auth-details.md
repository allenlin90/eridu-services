# SSR Auth Integration — Detailed References

Extended code examples, framework adapter patterns, and Astro-specific deployment notes.

## Package Boundary

`@eridu/auth-sdk/server/ssr` exports:

| Export | File | Purpose |
|---|---|---|
| `refreshSessionToken<T>` | `token-refresh.ts` | Forwards session cookies to `/api/auth/token`, verifies JWT |
| `normalizeReturnTo` | `redirect-guard.ts` | Validates `returnTo` against open-redirect attacks |

**Framework-specific** (NOT in SDK):
- Cookie read/write helpers
- `buildLoginUrl` — constructs IDP redirect with `callbackURL`
- Browser-driven sign-out flow
- `extractUser` — maps `JwtPayload` → app-local user shape
- Module-level singleton wiring

## Shared Auth Module Pattern

```typescript
import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';
import { normalizeReturnTo, refreshSessionToken } from '@eridu/auth-sdk/server/ssr';

const jwksService = new JwksService({ authServiceUrl: CONFIG.authApiUrl });
export const jwtVerifier = new JwtVerifier({ jwksService, issuer: CONFIG.authIssuerUrl });

if (!CONFIG.bypassAuth) {
  jwksService.initialize().catch(console.error);
}

export { normalizeReturnTo };

export async function refreshToken(cookieHeader: string) {
  return refreshSessionToken<JwtPayload>(CONFIG.authApiUrl, cookieHeader, jwtVerifier);
}
```

## Callback Endpoint (`/auth/callback`)

```
Browser → /auth/callback?returnTo=/page
  → Forward request cookies to eridu_auth/api/auth/token
  → Verify JWT with JWKS
  → Set httpOnly cookie
  → 302 → /page
```

## Logout (Browser-Initiated)

```
Browser → /auth/logout?returnTo=/page
  → Serve tiny page with inline JS
  → Browser POSTs to eridu_auth/api/auth/sign-out (clears Better Auth cookies)
  → Browser navigates to /auth/logout/complete?returnTo=/page
  → Server clears SSR app's own httpOnly JWT cookie
  → 302 → eridu_auth/sign-in?callbackURL=.../auth/callback?returnTo=/page
```

## Token Refresh (Server-Side)

| erify_studios (SPA) | eridu_docs (SSR) |
|---|---|
| Axios response interceptor | Middleware catch block |
| `authClient.client.token()` | `refreshSessionToken(authApiUrl, cookieHeader, verifier)` |
| `setCachedToken(token)` | `setTokenCookie(cookies, token)` |

## Framework Adapter Pattern (Next.js Example)

```typescript
import { cookies } from 'next/headers';

import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';
import { normalizeReturnTo, refreshSessionToken } from '@eridu/auth-sdk/server/ssr';

const jwksService = new JwksService({ authServiceUrl: process.env.AUTH_URL! });
export const jwtVerifier = new JwtVerifier({ jwksService, issuer: process.env.AUTH_URL! });
export { normalizeReturnTo };

export async function refreshToken(cookieHeader: string) {
  return refreshSessionToken(process.env.AUTH_URL!, cookieHeader, jwtVerifier);
}
```

## Cookie Configuration

| Property | Value | Why |
|---|---|---|
| `httpOnly` | `true` | No client-side JS access |
| `secure` | `true` in production | HTTPS only |
| `sameSite` | `lax` | Allows redirect from eridu_auth |
| `maxAge` | `900` (15 min) | Matches JWT expiry |

## Astro-Specific Notes

### `import.meta.env` vs `process.env`
Astro SSR bakes `import.meta.env.X` (non-`PUBLIC_`) at build time. Always add `process.env` fallback for runtime-configurable vars:
```typescript
AUTH_URL: import.meta.env.AUTH_URL ?? process.env.AUTH_URL,
```

### Reverse Proxy `context.url.origin`
Behind Railway/nginx, `context.url.origin` = `localhost:PORT`, not public domain. Always use `SITE_URL` env var for callback URLs.

### Silent Token Exchange
Middleware should attempt `refreshToken` before redirecting to sign-in — users with existing Better Auth cookies should not see the login page.

### Container Host Binding
`@astrojs/node` defaults to `localhost` (not `0.0.0.0`). Set `HOST=0.0.0.0` in start command for container deployments.

### Starlight SSR
Set `starlight({ prerender: false, pagefind: false })` to avoid cookie/header-based auth middleware being bypassed by prerendered routes.

### Renderer Keepalive
Keep at least one non-prerendered Astro page route to prevent Astro 6 from optimizing away the SSR renderer.
