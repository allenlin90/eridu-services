# PRD: Internal Knowledge Base (eridu_docs)

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Internal tooling — knowledge base for authenticated users
> **Depends on**: eridu_auth SSO, @eridu/auth-sdk JWKS verification
> **Blocks**: Role-based document access, content governance workflows

## Problem

Internal documentation (feature specs, workflows, operational guides) lives across scattered tools and is either fully public or requires manual access provisioning. There is no authenticated, centralized knowledge base that:

- Restricts access to verified users only
- Uses the existing SSO (eridu_auth) without architectural exceptions
- Can later gate content by user role, team, or attribute

## Users

| Role | Need |
| --- | --- |
| All authenticated users | Browse internal knowledge base (features, workflows, guides) |
| Content authors | Publish documentation via markdown/MDX in the monorepo |
| System admin (future) | Configure document-level access policies |

## Existing Infrastructure

- **eridu_auth**: Better Auth SSO with JWT plugin (EdDSA, 15-min expiry), JWKS endpoint, cross-subdomain session cookies on `.eridu.io`
- **@eridu/auth-sdk**: JwksService (JWKS fetch/cache), JwtVerifier (asymmetric JWT verification), shared across erify_api
- **erify_api auth pattern**: JWKS-based JWT verification at startup, stateless per-request validation
- **erify_studios auth pattern**: Better Auth client captures `set-auth-jwt` header, in-memory token cache, Axios interceptor refresh on expiry

## Requirements

### In-Scope (v1)

- [x] Astro + Starlight knowledge base with SSR mode in the monorepo
- [x] Clerk-like auth: JWT stored in httpOnly cookie, verified locally with JWKS
- [x] Callback endpoint for initial token exchange after IDP login
- [x] Server-side token refresh in middleware (transparent to user on JWT expiry)
- [x] Zero network calls on happy path (cached JWKS verification)
- [x] No shared secrets — eridu_auth remains the sole signing authority
- [x] No changes to eridu_auth server config, erify_api, or erify_studios
- [x] Revert prior eridu_auth client-side hacks (jwtClient plugin, document.cookie)

### Out-of-Scope (future)

- Role-based or attribute-based document access (authz layer)
- Interactive workflow walkthroughs (see Forward References below)
- Content authoring workflow (approval, review, publishing pipeline)
- Search indexing with access-scoped results
- Logout endpoint on eridu_docs (session expires naturally)
- Multi-instance session sharing (single-instance deployment is sufficient initially)

## Design Clarifications

### Why Clerk-like pattern, not shared secret or per-request forwarding

| Option | Rejected because |
| --- | --- |
| Share `BETTER_AUTH_SECRET` | Collapses trust boundary — eridu_docs could forge tokens. Increases blast radius. Breaks JWKS-only pattern used by erify_api. |
| Forward cookies to eridu_auth per request | Network call on every page load. Acceptable for low-traffic, but unnecessary when JWKS verification is free after cache. |
| OAuth redirect + Astro Sessions | Requires session storage driver (fs/redis). Adds infrastructure for a knowledge base that can stay stateless. |

### Chosen: JWT cookie + JWKS (Clerk-like)

- **Login**: redirect to eridu_auth → callback → exchange session cookies for JWT → set httpOnly cookie → redirect to original page
- **Happy path**: middleware reads cookie → verifies JWT with cached JWKS → zero network calls
- **Token expiry**: middleware detects expired JWT → forwards session cookies server-side to `/api/auth/token` → updates cookie → transparent to user
- **Session expiry**: token refresh fails → redirect to login

This mirrors how erify_api works (JWKS verification, no shared secret) but adapted for SSR context where the browser needs to carry the token automatically (cookie vs Bearer header).

### Extensibility for authz

The middleware sets `context.locals.user` with the verified JWT payload. When role-based access is needed:

1. Extend `definePayload` in eridu_auth to include roles/org membership
2. Middleware reads roles from verified payload
3. Check against page frontmatter metadata (e.g., `access: { roles: ['admin'] }`)

No architectural change — just richer data in the same JWT.

## Acceptance Criteria

- [ ] `eridu_docs` builds and deploys as a standalone Astro SSR app
- [ ] Unauthenticated users are redirected to eridu_auth login
- [ ] After login, users are redirected back to the originally requested page
- [ ] Subsequent page loads require zero network calls to eridu_auth
- [ ] JWT expiry triggers transparent server-side refresh (no user-visible redirect)
- [ ] Session expiry redirects to login
- [ ] No changes to eridu_auth server config
- [ ] erify_api and erify_studios auth chains are unaffected
- [ ] Local dev supports `BYPASS_AUTH=true` for content authoring without running eridu_auth

## Forward References

### Interactive Workflow Walkthroughs

**Purpose**: Complement static documentation with embedded, interactive demos that let readers experience actual UI flows with mock data. Primary use case is **onboarding** — new team members learn workflows by interacting with realistic UI, not just reading about them.

**Approach**: Astro islands (`client:load`) embed React components from `@eridu/ui` inside workflow MDX pages. Demo shells provide a `QueryClientProvider` with pre-seeded fixture data so components render without a live backend.

**Structure**:
```
apps/eridu_docs/src/
├── demos/
│   ├── providers/
│   │   └── mock-query-provider.tsx   ← QueryClient + fixture cache
│   ├── fixtures/                     ← realistic mock data per domain
│   └── workflows/
│       └── {workflow-name}/          ← step-by-step demo components
```

**Key decisions (deferred)**:
- Build demos with `@eridu/ui` primitives directly (pragmatic start) vs. extract shared feature components into a package (cleaner reuse, higher effort)
- Fixture data strategy: hand-crafted vs. generated from API schemas
- Step navigation UX: inline per-section vs. guided stepper

**Depends on**: Knowledge base v1 (this PRD) shipped and stable.

**Separate PRD required** when this workstream is prioritized.
