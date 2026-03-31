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
│  middleware.ts                       │
│  ├─ Read eridu_docs_token cookie     │
│  ├─ Verify JWT with JWKS (cached)    │
│  ├─ On expiry: refresh server-side   │
│  └─ Set context.locals.user          │
│                                      │
│  /auth/callback                      │
│  ├─ Forward session cookies          │
│  ├─ Get JWT from /api/auth/token     │
│  ├─ Verify + set cookie              │
│  └─ Redirect to returnTo             │
│                                      │
│  lib/auth.ts                         │
│  ├─ JwksService + JwtVerifier        │
│  ├─ Token refresh helper (SDK)       │
│  └─ Cookie management                │
└──────────────┬───────────────────────┘
               │ JWKS fetch (cached, at startup)
               │ Token exchange (callback + refresh only)
               ▼
┌──────────────────────────────────────┐
│        eridu_auth (Better Auth)      │
│                                      │
│  /api/auth/jwks   → public keys      │
│  /api/auth/token  → JWT (EdDSA)      │
│  /sign-in         → login UI         │
└──────────────────────────────────────┘
```

## Auth Flow

### Silent SSO (no eridu_docs cookie, but active Better Auth session)

1. Browser requests `docs.eridu.io/any-page` without an `eridu_docs_token` cookie
2. Middleware attempts `refreshToken` using the Better Auth session cookies the browser carries from `.eridu.io`
3. If eridu_auth returns a JWT → set cookie, serve page — **no sign-in page shown**
4. If no active session → redirect to sign-in

This means users who are already signed in to any eridu service arrive at the docs without a prompt.

### First Visit (no cookie)

1. Browser requests `docs.eridu.io/any-page`
2. Middleware: no `eridu_docs_token` cookie → redirect to `eridu_auth/sign-in?callbackURL=.../auth/callback?returnTo=/any-page`
3. User logs in
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

## Shared Auth Module

`lib/auth.ts` is the single auth facade consumed by middleware, callback, and logout. Three of its helpers are sourced directly from `@eridu/auth-sdk/server/ssr` and wrapped to close over `CONFIG`:

| Helper                                   | Source                                               | Notes                                        |
| ---------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `refreshToken(cookieHeader)`             | `@eridu/auth-sdk/server/ssr` (`refreshSessionToken`) | Forwards session cookies, verifies fresh JWT |
| `normalizeReturnTo(value)`               | `@eridu/auth-sdk/server/ssr` (`normalizeReturnTo`)   | Re-exported directly, no wrapper             |
| `signOutFromAuth(cookieHeader, origin?)` | `@eridu/auth-sdk/server/ssr` (`signOutFromAuth`)     | Forwards sign-out request, best-effort       |

Cookie helpers (`setTokenCookie`, `clearTokenCookie`), `buildLoginUrl`, and `extractUser` remain Astro-specific in `lib/auth.ts`.

## File Structure

```
apps/eridu_docs/src/
├── config/env.ts          ← AUTH_URL, AUTH_INTERNAL_URL, BYPASS_AUTH, COOKIE_SECURE
├── pages/healthz.ts       ← Public liveness endpoint for probes
├── lib/auth.ts            ← Shared: JwksService, JwtVerifier, SDK wrappers, cookie helpers
├── middleware.ts           ← Auth gate: verify, refresh, or redirect
├── pages/auth/callback.ts ← Token exchange endpoint
├── pages/auth/logout.ts   ← Sign out eridu_auth session + clear docs JWT cookie
└── env.d.ts               ← App.Locals.user type
```

## Starlight SSR Requirement

Starlight prerenders its docs pages by default, even when Astro `output` is set to `server`. For cookie-based auth to work, `apps/eridu_docs/astro.config.mjs` must set:

- `starlight({ prerender: false, pagefind: false })`

If prerender stays enabled, docs routes are served through Starlight's `routes/static/*` entrypoints, request headers/cookies are not available reliably, and the auth middleware loops back to sign-in.

Search still uses Pagefind, but it is generated separately during `pnpm --filter eridu_docs build`:

- runtime build: SSR docs app (`prerender: false`) for auth-aware requests
- snapshot build: temporary bypass-auth prerendered output used only to generate `/pagefind/*`

Astro 6 also strips SSR renderers from the server bundle when a project only has injected external page routes. Because Starlight owns the runtime docs route, `apps/eridu_docs/src/pages/renderer-keepalive.astro` exists as a project-owned non-prerendered page so the MDX `astro:jsx` renderer stays in the SSR manifest. Removing that file reintroduces `NoMatchingRenderer` runtime failures on MDX docs pages.

## Comparison with Other Services

| Aspect                | erify_api (NestJS)             | erify_studios (React SPA)             | eridu_docs (Astro SSR)         |
| --------------------- | ------------------------------ | ------------------------------------- | ------------------------------ |
| Token source          | `Authorization: Bearer` header | In-memory (from `set-auth-jwt`)       | httpOnly cookie                |
| Verification          | JWKS (JwtAuthGuard)            | N/A (erify_api verifies)              | JWKS (middleware)              |
| Token refresh         | N/A (client handles)           | Axios interceptor → `/api/auth/token` | Middleware → `/api/auth/token` |
| Shared secret         | No                             | No                                    | No                             |
| Stateless             | Yes                            | Yes (in-memory only)                  | Yes                            |
| Horizontally scalable | Yes                            | Yes (static)                          | Yes                            |

## Cookie Configuration

| Property   | Value                | Reason                          |
| ---------- | -------------------- | ------------------------------- |
| `httpOnly` | `true`               | Prevents client-side JS access  |
| `secure`   | `true` in production | HTTPS only                      |
| `sameSite` | `lax`                | Allows redirect from eridu_auth |
| `path`     | `/`                  | Available to all routes         |
| `maxAge`   | `900` (15 min)       | Matches JWT expiry              |

## Environment Variables

| Variable            | Required in prod | Default                 | Description                                                                      |
| ------------------- | :--------------: | ----------------------- | -------------------------------------------------------------------------------- |
| `SITE_URL`          |       Yes        | —                       | Public origin of eridu_docs (e.g. `https://docs.eridu.io`). Used as the base for `/auth/callback`. Without this, Railway's internal `Host: localhost:PORT` header is used, producing a broken callbackURL. |
| `AUTH_URL`          |       Yes        | `http://localhost:3001` | Browser-facing eridu_auth origin used for redirects and JWT issuer validation    |
| `AUTH_INTERNAL_URL` |        No        | `AUTH_URL`              | Internal eridu_auth origin used for server-to-server JWKS/token/sign-out calls   |
| `BYPASS_AUTH`       |        No        | `false`                 | Skip auth for local dev (never set in production)                                |
| `COOKIE_SECURE`     |        No        | `true` in production    | Override JWT cookie `Secure` flag (auto-detected by Astro `PROD`)                |

### Runtime vs Build-time Resolution

In Astro SSR, `import.meta.env.X` for non-`PUBLIC_` variables is resolved at
**build time** by Vite. If a variable is not present during the build (e.g.
Railway env vars are only injected at runtime), it compiles to `undefined` —
the Zod `.default()` then applies, ignoring whatever the live environment says.

All env vars that must be configurable at deploy time require a `process.env`
fallback:

```typescript
AUTH_URL: import.meta.env.AUTH_URL ?? process.env.AUTH_URL,
```

Without this, setting `AUTH_URL` in Railway has no effect and redirects always
go to `http://localhost:3001`.

### Local Development

Set `BYPASS_AUTH=true`. No other variables are needed — eridu_auth does not
need to be running for local docs authoring.

The full auth flow (login → callback → cookie → refresh) is exercised in
deployed environments where `AUTH_URL` points to the live eridu_auth instance.

In clustered deployments, set `AUTH_INTERNAL_URL` to the internal service DNS
name over HTTP for server-side fetches, while keeping `AUTH_URL` on the public
HTTPS origin used by the browser.

## Health Checks

- `GET /healthz` is a public liveness endpoint that returns `200` with JSON.
- It is intentionally unauthenticated so load balancers and uptime probes can
  ping it without docs or eridu_auth cookies.
- It does not call `eridu_auth`; dependency readiness should be checked
  separately to avoid restart loops caused by external outages.

## Container Deployment (Railway)

`@astrojs/node` standalone mode binds to `localhost` (loopback) by default —
unlike Express/NestJS which bind to `0.0.0.0`. Railway's health check probe
comes from the ingress router outside the container, so it cannot reach a
server bound to loopback. The result is a deployment that appears to start
correctly locally but always fails the health check on Railway.

**Fix**: set `HOST=0.0.0.0` in the Railway start command so the server binds
to all interfaces:

```json
"startCommand": "HOST=0.0.0.0 pnpm --filter eridu_docs start"
```

This is an Astro-specific concern. Other services in this repo (erify_api,
eridu_auth) use NestJS/Hono which bind to all interfaces by default and do
not require this.

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
