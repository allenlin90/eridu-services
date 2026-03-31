# Ideation: auth-sdk Server-Side Auth Client

> **Status**: Deferred from feat/eridu-docs (eridu_docs scaffold + JWKS auth)
> **Origin**: PR #31 review, eridu_docs sign-out implementation, March 2026
> **Related**: [ssr-auth-integration skill](../../.agent/skills/ssr-auth-integration/SKILL.md), [eridu_docs AUTH_DESIGN](../../apps/eridu_docs/docs/AUTH_DESIGN.md)

## What

Add a server-side auth client to `@eridu/auth-sdk` that wraps all server-to-server
calls to eridu_auth's Better Auth endpoints (`/api/auth/token`, `/api/auth/sign-out`,
etc.) using the SDK's own `BETTER_AUTH_ENDPOINTS` constants. SSR consumers import
this client instead of calling `fetch` directly against hardcoded or individually
configured endpoint strings.

## Why It Was Considered

The current `@eridu/auth-sdk/server/ssr` module exposes three helpers
(`refreshSessionToken`, `signOutFromAuth`, `normalizeReturnTo`) that make raw `fetch`
calls. Two issues:

1. **Hardcoded paths** — `sign-out.ts` and `token-refresh.ts` construct endpoint URLs
   by string concatenation (`${authApiUrl}/api/auth/sign-out`). The SDK already has
   `BETTER_AUTH_ENDPOINTS.AUTH.SIGN_OUT` and `BETTER_AUTH_ENDPOINTS.TOKEN` in
   `constants.ts`. If Better Auth changes its base path or endpoint structure, every
   SSR consumer must be updated separately instead of a single SDK fix.

2. **No shared client instance** — each SSR app (eridu_docs today, hypothetical
   Next.js/SvelteKit apps tomorrow) constructs its own fetch calls. A server-side
   auth client in the SDK would centralise headers, error handling, and retries in
   one place, consistent with how `JwksService` already centralises JWKS management.

Ideal shape:

```typescript
// @eridu/auth-sdk/server/auth-client
import { BETTER_AUTH_ENDPOINTS } from '../constants.js';

export class ServerAuthClient {
  constructor(private readonly authUrl: string) {}

  async getToken(cookieHeader: string): Promise<string | null> { ... }
  async signOut(cookieHeader: string, origin?: string): Promise<void> { ... }
}
```

SSR consumers then do:

```typescript
// eridu_docs/src/lib/auth.ts
import { ServerAuthClient } from '@eridu/auth-sdk/server/auth-client';
const authClient = new ServerAuthClient(CONFIG.authUrl);

export const refreshToken = (cookieHeader: string) =>
  authClient.getToken(cookieHeader).then(token => token ? jwtVerifier.verify(token) : null);
```

## Why It Was Deferred

1. **Only one SSR consumer exists today.** With a single consumer, the duplication
   cost is low. The abstraction is premature until a second SSR app is being built.

2. **Current code works correctly.** The raw `fetch` calls in `server/ssr` are
   functional. The only maintenance risk is path drift, which is low — Better Auth's
   base path has been stable.

3. **Scope.** This PR was scoped to scaffold eridu_docs auth, not redesign the SDK.
   A new class in `@eridu/auth-sdk` with proper tests is a non-trivial change that
   deserves its own PR.

## Decision Gates for Promotion

Promote to implementation (no full PRD needed — this is a focused SDK refactor) when
**any** of these are true:

1. A second SSR framework app (Next.js, SvelteKit, etc.) is being built and would
   reuse the same token/sign-out fetch pattern.
2. Better Auth changes its endpoint paths or introduces a server-side client API that
   `@eridu/auth-sdk` should wrap.
3. A bug or behaviour change in eridu_auth's sign-out or token endpoints requires
   coordinated updates across more than one consumer.

## Implementation Notes (Preserved Context)

**Package boundary already established:**
`packages/auth-sdk/src/server/ssr/` contains `token-refresh.ts` and `sign-out.ts`.
The refactor moves the fetch logic into a `ServerAuthClient` class in
`packages/auth-sdk/src/server/auth-client.ts` and updates `server/ssr/` to delegate
to it. The public API of `server/ssr` exports stays the same — only the internals change.

**Constants to use:**
- `BETTER_AUTH_ENDPOINTS.TOKEN` → `/api/auth/token`
- `BETTER_AUTH_ENDPOINTS.AUTH.SIGN_OUT` → `/api/auth/sign-out`

Both are already defined in `packages/auth-sdk/src/constants.ts`.

**Minimal fix available now (no deferral needed):**
Even without the full `ServerAuthClient`, `token-refresh.ts` and `sign-out.ts` should
use `BETTER_AUTH_ENDPOINTS` constants instead of inline strings. This is a 2-line
change per file and eliminates the path-drift risk without introducing a new class.

**New subpath export needed:**
`"./server/auth-client"` with `types` + `default` fields, following the same pattern
as `"./server/ssr"` added in this PR.

**Testing:**
`ServerAuthClient` methods are pure fetch wrappers — unit tests should mock `fetch`
and assert correct URL construction, header forwarding, and null return on non-ok
responses.
