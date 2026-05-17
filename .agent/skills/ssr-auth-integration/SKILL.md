---
name: ssr-auth-integration
description: Framework-agnostic Clerk-like JWKS auth pattern for SSR apps consuming eridu_auth as IDP — JWT cookie, callback exchange, server-side refresh, using @eridu/auth-sdk/server/ssr. Use when implementing SSR authentication flows, callback exchanges, or server-side token refresh against eridu_auth.
---

# SSR Auth Integration (Clerk-like JWKS Pattern)

Authentication for server-rendered apps using eridu_auth as IDP. JWT in httpOnly cookie, verified locally via JWKS, refreshed server-side on expiry.

> See [references/ssr-auth-details.md](references/ssr-auth-details.md) for code examples, framework adapter patterns, and Astro-specific notes.

## Canonical Examples

| File | Purpose |
|---|---|
| `apps/eridu_docs/src/lib/auth.ts` | Shared JWKS/JWT setup, SDK wrappers |
| `apps/eridu_docs/src/middleware.ts` | Auth gate: verify → refresh → redirect |
| `apps/eridu_docs/src/pages/auth/callback.ts` | Token exchange after IDP login |
| `apps/eridu_docs/docs/AUTH_DESIGN.md` | Full design document |

## Middleware — Three States

```
Has valid cookie?   → Verify with JWKS (cached) → serve page [0 network calls]
Has expired cookie? → Forward session cookies to /api/auth/token → update cookie [1 call]
Has no cookie?      → Redirect to eridu_auth/sign-in
```

**Critical**: Skip auth for public paths first. Distinguish expired (→ refresh) from invalid signature (→ redirect immediately).

## Environment Variables

| Variable | Required | Purpose |
|---|:---:|---|
| `AUTH_URL` | Yes | Browser-facing eridu_auth origin |
| `AUTH_INTERNAL_URL` | No | Internal server-to-server origin |
| `BYPASS_AUTH` | No | Local dev only, never production |
| `COOKIE_SECURE` | No | Override cookie `Secure` flag |

## Anti-Patterns

- Never share `BETTER_AUTH_SECRET`
- Never set JWT via `document.cookie` in eridu_auth
- Never create Astro Sessions for auth — stateless JWKS suffices
- Never skip JWKS verification on callback
- Never inline `refreshSessionToken` logic — import from `@eridu/auth-sdk/server/ssr`

## Extending for Authz

Extend `definePayload` in eridu_auth → JWT carries roles → `extractUser()` maps fields → middleware checks roles. No architectural changes needed.

## Checklist

- [ ] Singleton JwksService/JwtVerifier (no duplicates)
- [ ] Middleware skips public paths before reading cookies
- [ ] Expired JWT → refresh, invalid signature → redirect (not conflated)
- [ ] `refreshToken` and `normalizeReturnTo` imported from `@eridu/auth-sdk/server/ssr`
- [ ] JWKS initialized at module load (non-blocking `.catch()`)
- [ ] Cookie: `httpOnly`, `secure`, `sameSite: 'lax'`
- [ ] No `BETTER_AUTH_SECRET` in SSR app env
- [ ] `HOST=0.0.0.0` in container start command (Astro)
- [ ] Runtime env vars use `import.meta.env.X ?? process.env.X` (Astro)
- [ ] `returnTo` preserved through login → callback → redirect chain

## Related Skills

- [erify-authorization](../erify-authorization/SKILL.md) — Guard/role patterns (NestJS)
- [frontend-api-layer](../frontend-api-layer/SKILL.md) — Token lifecycle (SPA)
