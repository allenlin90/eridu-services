# Feature: Internal Knowledge Base (`eridu_docs`)

> **Status**: ✅ Implemented — Phase 4 Extended Scope, 2026-04-01
> **Workstream**: Internal tooling — authenticated documentation for Eridu users
> **Canonical docs**: [Auth design](../../apps/eridu_docs/docs/AUTH_DESIGN.md)
> **Implementation refs**: [App README](../../apps/eridu_docs/README.md), [package.json](../../apps/eridu_docs/package.json), [middleware](../../apps/eridu_docs/src/middleware.ts), [auth lib](../../apps/eridu_docs/src/lib/auth.ts), [env config](../../apps/eridu_docs/src/config/env.ts)

## Problem

Internal documentation was scattered across repo files and app-local docs with no authenticated, centralized reading surface. Teams needed a monorepo-native knowledge base that:

- restricts access to authenticated users
- reuses the existing `eridu_auth` trust model
- stays stateless and cheap to operate
- leaves room for future role-based access controls

## Users

| Role | Need |
| --- | --- |
| All authenticated users | Browse internal feature docs, workflows, and guides in one place |
| Content authors | Publish Markdown/MDX docs from the monorepo without a separate CMS |
| System admin (future) | Add document-level access policies when authz is introduced |

## What Was Delivered

### Monorepo docs app

- `apps/eridu_docs` ships as a standalone Astro SSR app using Starlight.
- Documentation content lives in-repo and builds with the rest of the monorepo.
- Search indexing is generated during build without weakening the runtime auth model.

### JWKS-based SSR auth

- `eridu_docs_token` is stored in an `httpOnly` cookie.
- Middleware verifies JWTs locally with cached JWKS keys from `eridu_auth`.
- Valid-cookie page loads avoid network calls to `eridu_auth`.
- No shared signing secret is introduced into `eridu_docs`.

### Login, refresh, and logout flow

- First visit redirects through `eridu_auth` and returns through `/auth/callback`.
- Middleware performs silent SSO when Better Auth session cookies already exist.
- Expired JWTs are refreshed server-side in middleware without a user-visible redirect.
- `auth/logout` and `auth/logout/complete` clear the docs cookie while preserving the browser-driven Better Auth sign-out pattern.

### Local and deployment support

- `BYPASS_AUTH=true` supports local content authoring without running `eridu_auth`.
- `SITE_URL`, `AUTH_URL`, and `AUTH_INTERNAL_URL` support Railway/container deployment correctly.
- The app includes the Starlight SSR and renderer-keepalive safeguards needed for authenticated MDX docs to render reliably.

## Key Product Decisions

- **JWT cookie + JWKS verification**: keeps `eridu_auth` as the sole signing authority while avoiding per-request auth round trips.
- **Stateless SSR**: no Astro session store or shared secret was introduced for v1.
- **Monorepo-first authoring**: docs remain Markdown/MDX in git, not an external CMS.
- **Auth first, authz later**: the shipped slice authenticates all users now and leaves role-based page gating for a later phase.

## Acceptance Record

- [x] `eridu_docs` builds and deploys as a standalone Astro SSR app
- [x] Unauthenticated users are redirected to `eridu_auth` login
- [x] After login, users are redirected back to the originally requested page
- [x] Subsequent page loads require zero network calls to `eridu_auth` on the happy path
- [x] JWT expiry triggers transparent server-side refresh
- [x] Session expiry redirects to login
- [x] No changes to `eridu_auth` server config were required
- [x] `erify_api` and `erify_studios` auth chains remain unaffected
- [x] Local dev supports `BYPASS_AUTH=true` for content authoring

## Forward References

- Role-based and attribute-based document access
- Interactive workflow walkthroughs embedded in docs pages
- Content governance and publishing workflow
- Access-scoped search results
