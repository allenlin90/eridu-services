# eridu_docs Authentication Design

> **PRD**: [docs/prd/eridu-docs-knowledge-base.md](../../../docs/prd/eridu-docs-knowledge-base.md)

## Overview

eridu_docs uses a Clerk-like authentication pattern: JWT stored in an httpOnly cookie, verified locally with JWKS public keys from eridu_auth. This keeps eridu_auth as the sole signing authority and requires zero shared secrets.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
│  Sends: eridu_docs_token (httpOnly) + eridu_auth session cookies │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         eridu_docs (Astro SSR)       │
│                                      │
│  middleware.ts                        │
│  ├─ Read eridu_docs_token cookie     │
│  ├─ Verify JWT with JWKS (cached)    │
│  ├─ On expiry: refresh server-side   │
│  └─ Set context.locals.user          │
│                                      │
│  /auth/callback                      │
│  ├─ Forward session cookies           │
│  ├─ Get JWT from /api/auth/token     │
│  ├─ Verify + set cookie              │
│  └─ Redirect to returnTo             │
│                                      │
│  lib/auth.ts                         │
│  ├─ JwksService + JwtVerifier        │
│  ├─ Token refresh helper             │
│  └─ Cookie management                │
└──────────────┬───────────────────────┘
               │ JWKS fetch (cached, at startup)
               │ Token exchange (callback + refresh only)
               ▼
┌──────────────────────────────────────┐
│        eridu_auth (Better Auth)      │
│                                      │
│  /api/auth/jwks   → public keys     │
│  /api/auth/token  → JWT (EdDSA)     │
│  /sign-in         → login UI        │
└──────────────────────────────────────┘
```

## Auth Flow

### First Visit (no cookie)

1. Browser requests `docs.eridu.io/any-page`
2. Middleware: no `eridu_docs_token` cookie → redirect to `eridu_auth/sign-in?callbackURL=.../auth/callback?returnTo=/any-page`
3. User logs in (or auto-redirects if already logged into eridu_auth)
4. eridu_auth redirects to `/auth/callback` (Better Auth session cookies set on `.eridu.io`)
5. Callback forwards session cookies to `eridu_auth/api/auth/token`
6. Gets JWT from response body, verifies with JWKS
7. Sets `eridu_docs_token` httpOnly cookie (15 min maxAge)
8. Redirects to `/any-page`

### Subsequent Requests (valid cookie)

1. Middleware reads `eridu_docs_token` cookie
2. Verifies JWT with cached JWKS — **zero network calls**
3. Extracts user from payload → `context.locals.user`
4. Serves page

### Token Expiry (15 min, session still active)

1. Middleware reads cookie, JWKS verification fails with `"exp" claim` error
2. Forwards Better Auth session cookies (on `.eridu.io`, sent by browser) to `eridu_auth/api/auth/token`
3. Gets fresh JWT, verifies, updates cookie
4. Serves page — **transparent to user, no redirect**

### Session Expiry (user logged out)

1. Token refresh fails (session cookies invalid)
2. Middleware redirects to login

## File Structure

```
apps/eridu_docs/src/
├── config/env.ts          ← AUTH_API_URL, AUTH_UI_URL, COOKIE_DOMAIN, BYPASS_AUTH
├── lib/auth.ts            ← Shared: JwksService, JwtVerifier, helpers
├── middleware.ts           ← Auth gate: verify, refresh, or redirect
├── pages/auth/callback.ts ← Token exchange endpoint
├── pages/auth/logout.ts   ← Sign out eridu_auth session + clear docs JWT cookie
└── env.d.ts               ← App.Locals.user type
```

## Comparison with Other Services

| Aspect | erify_api (NestJS) | erify_studios (React SPA) | eridu_docs (Astro SSR) |
| --- | --- | --- | --- |
| Token source | `Authorization: Bearer` header | In-memory (from `set-auth-jwt`) | httpOnly cookie |
| Verification | JWKS (JwtAuthGuard) | N/A (erify_api verifies) | JWKS (middleware) |
| Token refresh | N/A (client handles) | Axios interceptor → `/api/auth/token` | Middleware → `/api/auth/token` |
| Shared secret | No | No | No |
| Stateless | Yes | Yes (in-memory only) | Yes |
| Horizontally scalable | Yes | Yes (static) | Yes |

## Cookie Configuration

| Property | Value | Reason |
| --- | --- | --- |
| `httpOnly` | `true` | Prevents client-side JS access |
| `secure` | `true` in production | HTTPS only |
| `sameSite` | `lax` | Allows redirect from eridu_auth |
| `path` | `/` | Available to all routes |
| `maxAge` | `900` (15 min) | Matches JWT expiry |
| `domain` | `.eridu.io` in production | Cross-subdomain if needed |

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `AUTH_API_URL` | No | `http://localhost:3001` | eridu_auth backend URL (JWKS + token + sign-out APIs) |
| `AUTH_UI_URL` | No | `http://localhost:5173` | eridu_auth frontend login URL (`/sign-in`) |
| `AUTH_URL` | No | (none) | Legacy fallback used for both API/UI if specific vars are absent |
| `COOKIE_DOMAIN` | No | (omitted) | Cookie domain for production (e.g., `.eridu.io`) |
| `BYPASS_AUTH` | No | `false` | Skip auth in local dev |

## Security Considerations

- **No shared secrets**: eridu_auth is the sole signing authority (EdDSA private key)
- **JWKS key rotation**: JwtVerifier auto-retries with refreshed JWKS on "no matching key" errors
- **Cookie security**: httpOnly + secure + sameSite prevents XSS and CSRF
- **Trust boundary**: eridu_docs can only verify tokens, never forge them
- **Session cookies forwarded server-side**: never exposed to client-side JS in eridu_docs

## Future: Role-Based Access (Authz)

Current implementation is authentication only. When authz is needed:

1. Extend `definePayload` in eridu_auth to include roles/org membership
2. JWT payload grows — cookie stays within 4KB limit
3. Middleware reads roles from `context.locals.user`
4. Check against page frontmatter: `access: { roles: ['admin', 'manager'] }`
5. No architectural changes required
