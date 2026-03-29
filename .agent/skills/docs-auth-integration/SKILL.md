---
name: docs-auth-integration
description: Clerk-like JWKS auth pattern for Astro SSR apps consuming eridu_auth as IDP — JWT cookie, callback exchange, server-side refresh
metadata:
  priority: 3
  applies_to: [eridu_docs, astro, auth, ssr]
---

# Docs Auth Integration (Clerk-like JWKS Pattern for SSR)

Authentication pattern for server-rendered Astro apps that use eridu_auth as the identity provider without sharing secrets. JWT is stored in an httpOnly cookie, verified locally with JWKS, and refreshed server-side on expiry.

## Canonical Examples

Study these implementations as the source of truth:

| File | What it demonstrates |
| --- | --- |
| `apps/eridu_docs/src/lib/auth.ts` | Shared JWKS/JWT setup, token refresh, cookie helpers |
| `apps/eridu_docs/src/middleware.ts` | Auth gate: verify → refresh → redirect |
| `apps/eridu_docs/src/pages/auth/callback.ts` | Token exchange endpoint after IDP login |
| `apps/eridu_docs/src/config/env.ts` | Environment config (AUTH_URL, COOKIE_DOMAIN, BYPASS_AUTH) |
| `apps/eridu_docs/docs/AUTH_DESIGN.md` | Full design document with architecture diagram |

## Core Pattern

### 1. Shared Auth Module (`lib/auth.ts`)

All auth logic lives in one module, consumed by both middleware and callback:

```typescript
import { JwksService } from '@eridu/auth-sdk/server/jwks/jwks-service';
import { JwtVerifier } from '@eridu/auth-sdk/server/jwt/jwt-verifier';

// Module-level singletons — JWKS cached across requests
const jwksService = new JwksService({ authServiceUrl: CONFIG.authUrl });
export const jwtVerifier = new JwtVerifier({ jwksService, issuer: CONFIG.authUrl });

// Prime cache at startup (non-blocking)
jwksService.initialize().catch(console.error);
```

Key exports:
- `jwtVerifier` — verifies JWT with cached JWKS
- `refreshToken(cookieHeader)` — forwards session cookies to `/api/auth/token`, verifies fresh JWT
- `setTokenCookie(cookies, token)` — sets httpOnly cookie with correct options
- `buildLoginUrl(origin, pathname)` — constructs IDP redirect URL with callback/returnTo
- `extractUser(payload)` — maps JwtPayload → App.Locals.user

### 2. Middleware — Three States

```
Has valid cookie?     → Verify with JWKS (cached) → serve page [0 network calls]
Has expired cookie?   → Forward session cookies to /api/auth/token → update cookie → serve [1 call]
Has no cookie?        → Redirect to eridu_auth/sign-in
```

🔴 **Critical**: Always check `isPublicPath` first — skip auth for `/_astro/`, `/auth/`, and static assets.

🔴 **Critical**: Detect expired vs invalid JWT. Expired → attempt refresh. Invalid signature → redirect immediately.

### 3. Callback Endpoint (`/auth/callback`)

Purpose: Exchange Better Auth session cookies for a verified JWT after IDP login.

```
Browser → /auth/callback?returnTo=/page
  → Forward request cookies to eridu_auth/api/auth/token
  → Verify JWT with JWKS
  → Set httpOnly cookie
  → 302 → /page
```

🟡 **Recommended**: Reuse `refreshToken()` from `lib/auth.ts` — it already does fetch + verify.

### 4. Token Refresh (Server-Side)

This is the SSR equivalent of erify_studios' Axios interceptor:

| erify_studios (SPA) | eridu_docs (SSR) |
| --- | --- |
| Axios response interceptor | Middleware catch block |
| `authClient.client.token()` | `fetch(authUrl/api/auth/token, { headers: { cookie } })` |
| `setCachedToken(token)` | `setTokenCookie(cookies, token)` |

The refresh works because Better Auth cross-subdomain session cookies (on `.eridu.io`) are sent by the browser to `docs.eridu.io`. The middleware forwards them server-side to eridu_auth.

## Cookie Configuration

| Property | Value | Why |
| --- | --- | --- |
| `httpOnly` | `true` | No client-side JS access |
| `secure` | `true` in production | HTTPS only |
| `sameSite` | `lax` | Allows redirect from eridu_auth |
| `maxAge` | `900` (15 min) | Matches JWT expiry from Better Auth |
| `domain` | `.eridu.io` in prod | Cross-subdomain (omit for localhost) |

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTH_URL` | `http://localhost:3000` | eridu_auth base URL |
| `COOKIE_DOMAIN` | (omitted) | Production cookie domain |
| `BYPASS_AUTH` | `false` | Skip auth for local dev |

## Anti-Patterns

❌ **Never share `BETTER_AUTH_SECRET`** — collapses trust boundary, eridu_auth must remain sole signing authority

❌ **Never set JWT via `document.cookie` in eridu_auth** — couples IDP to consumer, bypasses cookie security

❌ **Never add `jwtClient` to eridu_auth's client** — that was a workaround for the old cookie approach

❌ **Never create Astro Sessions for auth** — adds storage driver dependency (fs/redis) when stateless JWKS verification suffices

❌ **Never skip JWKS verification** on the callback — always verify the JWT even though it just came from eridu_auth (defense in depth)

## Extending for Authz

Current scope is authentication only. To add authorization:

1. Extend `definePayload` in eridu_auth to include roles/org membership
2. JWT payload automatically carries the new fields
3. `extractUser()` maps the fields to `context.locals.user`
4. Middleware checks roles against page frontmatter:

```mdx
---
title: Manager Guide
access: { roles: ['admin', 'manager'] }
---
```

No architectural changes — same JWT, same verification, richer payload.

## Related Skills

- `erify-authorization` — Guard/role patterns for erify_api (NestJS)
- `frontend-api-layer` — Token lifecycle in erify_studios (SPA)
- `secure-coding-practices` — Input validation, secret management

## Best Practices Checklist

- [ ] 🔴 `lib/auth.ts` exports singleton JwksService/JwtVerifier (no duplicate instances)
- [ ] 🔴 Middleware skips auth for public paths before reading cookies
- [ ] 🔴 Expired JWT triggers refresh, invalid signature triggers redirect — never conflate
- [ ] 🔴 No `BETTER_AUTH_SECRET` in eridu_docs env
- [ ] 🔴 No modifications to eridu_auth for eridu_docs integration
- [ ] 🟡 JWKS initialized at module load (non-blocking `.catch()`)
- [ ] 🟡 Cookie uses `httpOnly`, `secure`, `sameSite: 'lax'`
- [ ] 🟡 `BYPASS_AUTH` only for local dev, never in production
- [ ] 🟡 `returnTo` preserved through login → callback → redirect chain
