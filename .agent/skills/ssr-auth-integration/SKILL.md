---
name: ssr-auth-integration
description: Framework-agnostic Clerk-like JWKS auth pattern for SSR apps consuming eridu_auth as IDP — JWT cookie, callback exchange, server-side refresh, using @eridu/auth-sdk/server/ssr
metadata:
  priority: 3
  applies_to: [eridu_docs, astro, next.js, auth, ssr]
---

# SSR Auth Integration (Clerk-like JWKS Pattern)

Authentication pattern for server-rendered apps that use eridu_auth as the identity provider without sharing secrets. JWT is stored in an httpOnly cookie, verified locally with JWKS, and refreshed server-side on expiry. Framework-specific glue is kept minimal; the core helpers live in `@eridu/auth-sdk/server/ssr`.

## Canonical Examples

Study these implementations as the source of truth:

| File | What it demonstrates |
| --- | --- |
| `apps/eridu_docs/src/lib/auth.ts` | Astro: shared JWKS/JWT setup, SDK wrappers, cookie helpers |
| `apps/eridu_docs/src/middleware.ts` | Astro: auth gate — verify → refresh → redirect |
| `apps/eridu_docs/src/pages/auth/callback.ts` | Astro: token exchange endpoint after IDP login |
| `apps/eridu_docs/src/pages/auth/logout.ts` | Astro: browser-initiated sign-out page for Better Auth |
| `apps/eridu_docs/src/pages/auth/logout/complete.ts` | Astro: local JWT cookie cleanup + redirect back to sign-in |
| `apps/eridu_docs/src/config/env.ts` | Environment config (`AUTH_URL`, `BYPASS_AUTH`) |
| `apps/eridu_docs/docs/AUTH_DESIGN.md` | Full design document with architecture diagram |

## Package Boundary

The `@eridu/auth-sdk/server/ssr` subpath provides the key framework-agnostic primitives used by SSR consumers:

| Export | File | What it does |
| --- | --- | --- |
| `refreshSessionToken<T>` | `token-refresh.ts` | Forwards session cookies to `/api/auth/token`, verifies JWT |
| `normalizeReturnTo` | `redirect-guard.ts` | Validates `returnTo` param against open-redirect attacks |

**What stays framework-specific** (not in the SDK):
- Cookie read/write helpers (API differs: Astro `AstroCookies`, Next.js `cookies()`, etc.)
- `buildLoginUrl` — constructs the IDP redirect with `callbackURL`
- Browser-driven sign-out flow when Better Auth must clear shared-domain cookies itself
- `extractUser` — maps `JwtPayload` → app-local user shape
- Module-level singleton wiring (`JwksService`, `JwtVerifier`)

## Core Pattern

### 1. Shared Auth Module

All auth logic lives in one module, consumed by both middleware and callback. The shared SDK functions are wrapped to close over the app's `CONFIG` so callers don't pass URLs on every call:

```typescript
import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';
import {
  normalizeReturnTo,
  refreshSessionToken,
} from '@eridu/auth-sdk/server/ssr';

// Module-level singletons — JWKS cached across requests
const jwksService = new JwksService({ authServiceUrl: CONFIG.authApiUrl });
export const jwtVerifier = new JwtVerifier({ jwksService, issuer: CONFIG.authIssuerUrl });

// Prime cache at startup (non-blocking)
if (!CONFIG.bypassAuth) {
  jwksService.initialize().catch(console.error);
}

// Re-export SDK helper directly (no wrapper needed)
export { normalizeReturnTo };

// Thin wrappers that close over CONFIG
export async function refreshToken(cookieHeader: string) {
  return refreshSessionToken<JwtPayload>(CONFIG.authApiUrl, cookieHeader, jwtVerifier);
}
```

Key exports:
- `jwtVerifier` — verifies JWT with cached JWKS
- `refreshToken(cookieHeader)` — wraps `refreshSessionToken`, closes over config
- `normalizeReturnTo(value)` — re-exported from SDK directly
- `setTokenCookie / clearTokenCookie` — framework-specific cookie helpers
- `buildLoginUrl(origin, pathname)` — constructs IDP redirect URL with callback/returnTo
- `extractUser(payload)` — maps JwtPayload → app-local user shape

### 2. Middleware — Three States

```
Has valid cookie?     → Verify with JWKS (cached) → serve page [0 network calls]
Has expired cookie?   → Forward session cookies to /api/auth/token → update cookie → serve [1 call]
Has no cookie?        → Redirect to eridu_auth/sign-in
```

**Critical**: Always check `isPublicPath` first — skip auth for `/_astro/`, `/auth/`, and static assets.

**Critical**: Detect expired vs invalid JWT. Expired → attempt refresh. Invalid signature → redirect immediately.

### 3. Callback Endpoint (`/auth/callback`)

Purpose: Exchange Better Auth session cookies for a verified JWT after IDP login.

```
Browser → /auth/callback?returnTo=/page
  → Forward request cookies to eridu_auth/api/auth/token
  → Verify JWT with JWKS
  → Set httpOnly cookie
  → 302 → /page
```

Reuse `refreshToken()` from the shared auth module — it already does fetch + verify via `refreshSessionToken`.

### 4. Logout (Browser-Initiated)

For Better Auth logout, prefer a browser-initiated flow:

```
Browser → /auth/logout?returnTo=/page
  → Astro serves a tiny page with inline JS
  → Browser POSTs directly to eridu_auth/api/auth/sign-out with credentials
  → Better Auth clears its shared-domain cookies in the browser response
  → Browser navigates to /auth/logout/complete?returnTo=/page
  → Astro clears the SSR app's own httpOnly JWT cookie
  → 302 → eridu_auth/sign-in?callbackURL=.../auth/callback?returnTo=/page
```

Why this split route works:
- Shared Better Auth cookies must be cleared by a browser response from `eridu_auth`
- The SSR app's JWT cookie is `HttpOnly`, so only the SSR app can clear it
- Separating the two avoids shared secrets and avoids relying on an unexpired JWT during logout

### 5. Token Refresh (Server-Side)

This is the SSR equivalent of erify_studios' Axios interceptor:

| erify_studios (SPA) | eridu_docs (SSR) |
| --- | --- |
| Axios response interceptor | Middleware catch block |
| `authClient.client.token()` | `refreshSessionToken(authApiUrl, cookieHeader, verifier)` |
| `setCachedToken(token)` | `setTokenCookie(cookies, token)` |

The refresh works because Better Auth cross-subdomain session cookies (on `.eridu.io`) are sent by the browser to `docs.eridu.io`. The middleware forwards them server-side to eridu_auth.

## Framework Adapter Pattern

Any SSR framework can use the same SDK utilities by wrapping them with its own config and cookie API:

### Hypothetical Next.js Example

```typescript
// app/lib/auth.ts (Next.js App Router)
import { cookies } from 'next/headers';
import { refreshSessionToken, normalizeReturnTo } from '@eridu/auth-sdk/server/ssr';
import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';

const jwksService = new JwksService({ authServiceUrl: process.env.AUTH_URL! });
export const jwtVerifier = new JwtVerifier({ jwksService, issuer: process.env.AUTH_URL! });

export { normalizeReturnTo };

export async function refreshToken(cookieHeader: string) {
  return refreshSessionToken(process.env.AUTH_URL!, cookieHeader, jwtVerifier);
}

// Next.js-specific: read the cookie from the request store
export async function getTokenCookie() {
  return (await cookies()).get('my_app_token')?.value ?? null;
}
```

The shared SDK primitives (`refreshSessionToken`, `normalizeReturnTo`) are identical across frameworks. Only the cookie plumbing, config wiring, and browser logout glue change.

## Cookie Configuration

| Property | Value | Why |
| --- | --- | --- |
| `httpOnly` | `true` | No client-side JS access |
| `secure` | `true` in production | HTTPS only |
| `sameSite` | `lax` | Allows redirect from eridu_auth |
| `maxAge` | `900` (15 min) | Matches JWT expiry from Better Auth |

## Environment Variables

| Variable            | Required in prod | Default                 | Purpose                                                                     |
| ------------------- | :--------------: | ----------------------- | --------------------------------------------------------------------------- |
| `AUTH_URL`          | Yes              | `http://localhost:3001` | Browser-facing eridu_auth origin used for redirects and JWT issuer checks   |
| `AUTH_INTERNAL_URL` | No               | `AUTH_URL`              | Internal eridu_auth origin used for server-to-server JWKS/token/sign-out    |
| `BYPASS_AUTH`       | No               | `false`                 | Skip auth for local dev (never set in production)                           |
| `COOKIE_SECURE`     | No               | `true` in production    | Override JWT cookie `Secure` flag                                           |

**Recommended**: For local docs work in this repo, prefer `BYPASS_AUTH=true` instead of trying to reproduce the full cross-domain auth flow on localhost.

**Recommended**: In clustered deployments, keep `AUTH_URL` on the public HTTPS
browser origin and point `AUTH_INTERNAL_URL` at the internal service DNS name
over HTTP for server-side fetches.

## Astro-Specific Notes

**Critical**: In Astro SSR, `import.meta.env.X` for non-`PUBLIC_` variables is resolved at **build time** by Vite, not at runtime. If an env var is not set during the build (e.g. Railway env vars are only available at runtime), it compiles to `undefined` and any `.default()` in Zod kicks in — ignoring whatever the runtime environment says. Always add a `process.env` fallback for vars that must be configurable at runtime:

```typescript
// env.ts — correct pattern for runtime-configurable vars
const parsed = envSchema.parse({
  AUTH_URL: import.meta.env.AUTH_URL ?? process.env.AUTH_URL,
  AUTH_INTERNAL_URL: import.meta.env.AUTH_INTERNAL_URL ?? process.env.AUTH_INTERNAL_URL,
  BYPASS_AUTH: import.meta.env.BYPASS_AUTH ?? process.env.BYPASS_AUTH,
  COOKIE_SECURE: import.meta.env.COOKIE_SECURE ?? process.env.COOKIE_SECURE,
});
```

This is not needed for `PUBLIC_` variables — Vite embeds those correctly in both client and server bundles.

**Critical**: Behind a reverse proxy (Railway, nginx, etc.), `context.url.origin` reflects the raw `Host` header the container receives — typically `localhost:PORT`, not the public domain. Never use `context.url.origin` directly as the base for OAuth callback URLs. Always use a `SITE_URL` env var:

```typescript
// lib/auth.ts
export function buildLoginUrl(origin: string, pathname: string): string {
  const callbackBase = CONFIG.siteUrl ?? origin; // origin only as local-dev fallback
  const callbackUrl = new URL('/auth/callback', callbackBase);
  ...
}
```

**Critical**: Middleware should attempt a silent token exchange before redirecting to sign-in. Users already signed in via Better Auth carry session cookies on the shared domain (`.eridu.io`) — forwarding those to `/api/auth/token` gives a JWT without showing the sign-in page:

```typescript
if (!token) {
  const cookieHeader = context.request.headers.get('cookie') ?? '';
  const silentAuth = await refreshToken(cookieHeader);
  if (silentAuth) {
    setTokenCookie(context.cookies, silentAuth.token);
    context.locals.user = extractUser(silentAuth.payload);
    return next();
  }
  return context.redirect(buildLoginUrl(context.url.origin, returnTo), 302);
}
```

**Critical**: `@astrojs/node` standalone mode defaults to binding on `localhost` (loopback interface), unlike Express/NestJS which default to `0.0.0.0`. In a container deployment (Railway, Docker, etc.) the health check probe comes from outside the container and cannot reach loopback. Always set `HOST=0.0.0.0` in the start command:

```json
"startCommand": "HOST=0.0.0.0 node ./dist/server/entry.mjs"
```

Without this the server starts normally and responds to local `curl` on the same machine, but Railway's ingress router gets connection refused and the deployment never passes its health check. NestJS/Express services do not need this because they bind to `0.0.0.0` by default.

**Critical**: If `eridu_docs` uses Starlight, set `starlight({ prerender: false, pagefind: false })`. Starlight prerenders by default even in server mode, which routes pages through `routes/static/*` and breaks cookie/header-based auth middleware.

**Recommended**: If you still need Pagefind search, generate it in a separate bypass-auth snapshot build and keep the runtime docs app on SSR.

**Recommended**: Keep at least one project-owned non-prerendered Astro page route in `eridu_docs` when Starlight owns the main docs route. Astro 6 can otherwise optimize the SSR renderer manifest down to `renderers = []`, which breaks MDX docs pages at runtime with `NoMatchingRenderer`. The current safeguard is `src/pages/renderer-keepalive.astro`.

## Anti-Patterns

**Never share `BETTER_AUTH_SECRET`** — collapses trust boundary, eridu_auth must remain sole signing authority

**Never set JWT via `document.cookie` in eridu_auth** — couples IDP to consumer, bypasses cookie security

**Never add `jwtClient` to eridu_auth's client** — that was a workaround for the old cookie approach

**Never create Astro Sessions for auth** — adds storage driver dependency (fs/redis) when stateless JWKS verification suffices

**Never skip JWKS verification** on the callback — always verify the JWT even though it just came from eridu_auth (defense in depth)

**Never inline `refreshSessionToken` logic** in the app — import from `@eridu/auth-sdk/server/ssr`; duplicating this logic across apps defeats the package boundary

## Extending for Authz

Current scope is authentication only. To add authorization:

1. Extend `definePayload` in eridu_auth to include roles/org membership
2. JWT payload automatically carries the new fields
3. `extractUser()` maps the fields to the app's user context
4. Middleware checks roles against page frontmatter or route config

No architectural changes — same JWT, same verification, richer payload.

## Related Skills

- `erify-authorization` — Guard/role patterns for erify_api (NestJS)
- `frontend-api-layer` — Token lifecycle in erify_studios (SPA)
- `secure-coding-practices` — Input validation, secret management

## Best Practices Checklist

- [ ] Shared auth module exports singleton JwksService/JwtVerifier (no duplicate instances)
- [ ] Middleware skips auth for public paths before reading cookies
- [ ] Expired JWT triggers refresh, invalid signature triggers redirect — never conflate
- [ ] `AUTH_URL` is configured for browser redirects and JWT issuer validation
- [ ] `AUTH_INTERNAL_URL` is configured when server-side traffic should stay on the cluster network
- [ ] No `BETTER_AUTH_SECRET` in SSR app env
- [ ] No modifications to eridu_auth for SSR consumer integration
- [ ] `refreshToken` and `normalizeReturnTo` imported from `@eridu/auth-sdk/server/ssr` (not re-implemented)
- [ ] JWKS initialized at module load (non-blocking `.catch()`)
- [ ] Cookie uses `httpOnly`, `secure`, `sameSite: 'lax'`
- [ ] `HOST=0.0.0.0` set in the container start command (Astro node standalone binds to loopback by default — Railway health checks cannot reach it otherwise)
- [ ] All runtime-configurable env vars use `import.meta.env.X ?? process.env.X` (Astro bakes `import.meta.env` at build time; without the fallback, Railway env vars are silently ignored)
- [ ] `SITE_URL` is set in production to the app's public origin — used as the base for `/auth/callback` in `buildLoginUrl`; without it, Railway's internal `Host: localhost:PORT` header produces a broken callbackURL
- [ ] Middleware attempts silent token exchange (`refreshToken`) before redirecting to sign-in — users already signed in via Better Auth should reach the app without a login prompt
- [ ] Logout clears Better Auth cookies from the browser first, then clears the SSR app's own `HttpOnly` JWT cookie server-side
- [ ] `BYPASS_AUTH` only for local dev, never in production
- [ ] `returnTo` preserved through login → callback → redirect chain
- [ ] `normalizeReturnTo` used before redirecting to any user-supplied path
