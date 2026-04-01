# Ideation: eridu_docs Logout Investigation

> **Status**: Known bug, active investigation (2026-04-01)
> **Origin**: Post-implementation validation of `eridu_docs` SSR auth/logout flow (2026-04-01)
> **Related**: [AUTH_DESIGN](../../apps/eridu_docs/docs/AUTH_DESIGN.md), [ssr-auth-integration skill](../../.agent/skills/ssr-auth-integration/SKILL.md), [auth-sdk Server-Side Auth Client](./auth-sdk-ssr-server-client.md)

## Known Bug

`eridu_docs` now uses the correct broad shape for logout:

1. Browser hits [`/auth/logout`](../../apps/eridu_docs/src/pages/auth/logout.ts)
2. Browser `POST`s directly to `eridu_auth/api/auth/sign-out`
3. Browser then lands on [`/auth/logout/complete`](../../apps/eridu_docs/src/pages/auth/logout/complete.ts)
4. Astro clears `eridu_docs_token`

That direction is correct, but the flow still does not reliably log the user out as expected in real browser use. Treat logout as a known bug until the end-to-end behavior is proven on deployed domains.

## Expected Behavior

After clicking logout from `eridu_docs`:

1. The shared Better Auth session should be cleared.
2. The local `eridu_docs_token` cookie should be cleared.
3. A fresh visit to a protected docs route should require a real sign-in, not silent re-entry via leftover auth cookies.

## Current Risk

The current implementation can clear the local docs cookie while still leaving the shared Better Auth session alive. If that happens, `eridu_docs` middleware can immediately mint a new docs JWT via silent SSO on the next request, which makes logout appear ineffective or inconsistent.

This is especially easy to mask because [`logout.ts`](../../apps/eridu_docs/src/pages/auth/logout.ts) always continues to `/auth/logout/complete` in `.finally(...)`, even if the cross-origin sign-out request failed or only partially completed.

## Investigation Task

Confirm the real failure mode and harden the flow before treating logout as a stable contract.

### Required checks

1. Verify whether the raw browser `fetch()` to `POST /api/auth/sign-out` matches what Better Auth expects in production:
   - request shape
   - credentials mode
   - headers/content type
   - redirect behavior
   - any CSRF/origin requirements
2. Inspect the browser network trace on deployed domains and confirm whether the sign-out response actually clears the shared `eridu_auth` cookies.
3. Compare the docs flow with the working SPA logout path (`authClient.client.signOut()` in `erify_studios` / `erify_creators`) and identify any missing client behavior.
4. Verify whether immediately redirecting `/auth/logout/complete` back into `buildLoginUrl(...)` is semantically correct, or whether docs needs a signed-out landing page that does not instantly re-enter the login flow.
5. Confirm whether silent SSO in [`middleware.ts`](../../apps/eridu_docs/src/middleware.ts) is recreating the docs JWT after an incomplete sign-out.
6. Validate deployed cookie-domain and trusted-origin configuration in `eridu_auth`, not just localhost assumptions.

## Exit Criteria

Treat the investigation as complete only when all of these are true:

1. Clicking logout from a signed-in docs page removes both the local docs JWT and the shared Better Auth session.
2. Refreshing or revisiting a protected docs route after logout does not silently re-authenticate the user.
3. The flow is verified on the real deployed domains, not only in local development with `BYPASS_AUTH=true`.
4. Failure handling is explicit: if shared-session sign-out fails, the UI/flow does not misleadingly present logout as fully successful.

## Preserved Context

- Local docs JWT is `HttpOnly`, so only `eridu_docs` can clear it.
- Shared Better Auth cookies are cross-subdomain cookies, so the browser must accept the cookie-clearing response from `eridu_auth`.
- `eridu_docs` middleware intentionally attempts silent SSO when no local JWT exists, which is correct for login but makes partial logout failures very visible.
