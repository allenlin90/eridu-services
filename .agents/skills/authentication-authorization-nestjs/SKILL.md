---
name: authentication-authorization-nestjs
description: Comprehensive authentication and authorization patterns for Eridu Services. This skill should be used when implementing login flows, protecting endpoints, enforcing permissions, or designing API security for both backend and frontend.
---

# Authentication & Authorization (Comprehensive)

General auth principles and frontend auth patterns for the Eridu Services monorepo.

> **For erify_api-specific authorization** (guards, roles, `@StudioProtected`, `@AdminProtected`):
> use [erify-authorization](../erify-authorization/SKILL.md) instead.

> See [references/auth-examples.md](references/auth-examples.md) for detailed code examples.

## General Principles

### Always Protect Sensitive Operations

Require authentication for any operation that modifies user data, accesses user-specific resources, changes permissions, or accesses client/studio-specific data.

### Validate on Every Access

- Backend validates credentials/tokens on every request
- User ID comes from validated credentials, never from URL/body
- Permissions fetched from authoritative source (database)

### Token Security

- Use JWT with RS256/EdDSA, include expiration, validate via public keys
- Store in HTTP-only cookies (preferred), never in `localStorage`
- Never log tokens, expose in URLs, or hardcode secrets

## Backend Implementation

- **Token validation**: Use `@eridu/auth-sdk` and `JwtAuthGuard`
- **Role-based**: Use `AdminGuard` for system admins
- **Studio-scoped**: Use `@StudioProtected()` for studio resources
- **Service-to-service**: Use `ApiKeyGuard` for backdoor endpoints

## Frontend Implementation

### Token Handling

Use the shared `@eridu/auth-sdk` client with browser cookies. Canonical references:
- `apps/erify_studios/src/lib/auth.ts`
- `apps/erify_studios/src/lib/api/token-store.ts`
- `apps/erify_studios/src/lib/session-provider.tsx`

### Protected Routes

Use TanStack Router layouts with `SessionProvider` and `useSession`. For studio-scoped authorization, use `StudioRouteGuard` and `useStudioAccess`.

### Token Refresh

Use the app-level API client refresh flow (`apps/erify_studios/src/lib/api/client.ts`). Do not add route-local refresh logic.

### API Interceptors

Use `apiRequest` / `apiClient` from the app API layer. Do not create feature-local Axios clients.

## Common Mistakes

1. ❌ Trusting user ID from request body → ✅ Use `@CurrentUser()` from validated token
2. ❌ Storing tokens in `localStorage` → ✅ Use shared auth client with HTTP-only cookies
3. ❌ Frontend-only route protection → ✅ Backend must also enforce authorization
4. ❌ No token refresh handling → ✅ Use shared API client with automatic refresh
5. ❌ Exposing user existence in errors → ✅ Use generic "Invalid credentials" messages

## Checklist

### Backend
- [ ] 🔴 Use `@eridu/auth-sdk` for JWT validation
- [ ] 🔴 User ID from token, never from request body/params
- [ ] 🔴 Guards for role-based authorization
- [ ] Generic error messages (don't reveal user existence)

### Frontend
- [ ] 🔴 No auth tokens in `localStorage`
- [ ] 🔴 Protect sensitive routes with auth checks
- [ ] Use shared API client for automatic token refresh
- [ ] Use `SessionProvider` and `useSession` for session state

## Related Skills

- [erify-authorization](../erify-authorization/SKILL.md) — erify_api-specific guards and roles
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Protected endpoints
- [Data Validation](../data-validation/SKILL.md) — Input validation
