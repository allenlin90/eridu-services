---
name: erify-authorization
description: Patterns for implementing authorization in erify_api with current StudioMembership + AdminGuard behavior, plus planned RBAC references. Use when implementing or reviewing guards, permissions, role-based access, or studio-scoped endpoint protection.
---

# erify_api Authorization Patterns

Current authorization implementation patterns for erify_api.

**Related references:**
- [Authorization Guide](../../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)
- [Planned RBAC patterns](references/planned-rbac.md) — future reference only, not implemented
- `authentication-authorization-nestjs` for broader auth guidance
- `backend-controller-pattern-nestjs` for controller/decorator usage

## Implementation Status

| Pattern | Status |
|---|---|
| `isSystemAdmin` bypass | ✅ Implemented |
| `@AdminProtected()` decorator | ✅ Implemented |
| `@StudioProtected([roles])` | ✅ Implemented |
| `StudioGuard` with membership check | ✅ Implemented |
| JSONB `roles`/`permissions` on User | ⏳ Planned — see [references/planned-rbac.md](references/planned-rbac.md) |
| Granular permission strings | ⏳ Planned |

## Studio Role Model

`StudioMembership.role` currently has 7 values:

| Role | Scope | Can manage memberships |
|---|---|---|
| `ADMIN` | Full access + membership management | ✅ |
| `MANAGER` | Full access (no membership management) | ❌ |
| `TALENT_MANAGER` | Creator mapping, catalog, roster, availability | ❌ |
| `DESIGNER` | Dashboard, own tasks, own shifts | ❌ |
| `MODERATION_MANAGER` | Dashboard, own tasks, own shifts | ❌ |
| `MEMBER` | Dashboard, own tasks, own shifts | ❌ |
| `ACCOUNT_MANAGER` | Client mechanic catalog (write, client-linked only); read-only on task templates, shows, creator mapping with money redacted | ❌ (only `ADMIN` can grant it) |

### `ACCOUNT_MANAGER`: read-only-with-money-redacted, not a smaller `MANAGER`

`ACCOUNT_MANAGER` is not "MANAGER minus some routes" — it's read-only everywhere except the client mechanic catalog, and money fields must never reach it even on routes it's otherwise allowed to read. Two failure modes recur when adding it to an existing route, both caught by review rather than by type errors:

1. **Sharing a frontend access key with a narrower-scoped page.** `STUDIO_ROUTE_ACCESS` keys gate entire route subtrees; adding `ACCOUNT_MANAGER` to a key also grants every other page that happens to reuse that key (e.g. adding it to `shows` silently granted Task Setup, a mutation surface, because `task-setup.tsx` reused `routeKey="shows"`). Before adding a role to an access key, grep for every route/nav-item consumer of that key, not just the one route you're changing.
2. **A money field that can't be allow-list-redacted because it isn't `.nullable()`.** `projectAllowList()` (`apps/erify_api/src/lib/utils/allow-list-projection.util.ts`, Finance Guardrails §10) forces non-allow-listed fields to `null` — which throws if the schema doesn't accept `null` for that field (e.g. `studioShiftDto.hourly_rate: z.string()`), or if the money lives inside an unstructured `metadata`/`content` blob with no fixed field name to allow-list against. In both cases, gate the whole route/field via `@StudioProtected(...)` excluding `ACCOUNT_MANAGER` instead of attempting redaction — see `StudioShiftController`'s GET routes and `StudioShowController.tasks()` for reference call sites, each with a comment explaining why gating was chosen over redaction.

## Endpoint Role Conventions

```typescript
@StudioProtected()                                           // All members
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])  // Creator ops
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])   // Manager-level ops
@StudioProtected([STUDIO_ROLE.ADMIN])                        // Admin-only
```

> `getAllAndOverride` means method-level `@StudioProtected` always wins over class-level.

## Core Principles

1. **Separation**: Authentication (`eridu_auth`) handles identity. Authorization (`erify_api`) handles permissions.
2. **Never add authorization claims to JWT** — keep JWTs minimal with identity claims only.
3. **Multi-scope access**: Creators access own shows via `ShowMC`. Studio members access via `StudioMembership` role.

### Workflow Action Authorization

For workflow actions (e.g., show resolution), authorization must be scope-specific:
1. Actor has required role in target scope
2. Resource belongs to the scoped entity
3. No cross-scope/system-only fallback for normal studio operations

## Best Practices

**DO:** Use roles for onboarding, custom permissions for edge cases, granular strings (`users:read`), `isSystemAdmin` for full access, keep permission logic in backend.

**DON'T:** Add permissions to JWT, create roles for every edge case, use coarse permissions (`admin:read`), duplicate logic between frontend and backend.

## Related Skills

- [Authentication Authorization NestJS](../authentication-authorization-nestjs/SKILL.md) — Comprehensive auth patterns
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Auth decorators usage
- [Data Validation](../data-validation/SKILL.md) — Input validation
