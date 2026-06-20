---
name: backend-controller-pattern-nestjs
description: NestJS controller patterns for erify_api. Use when adding, changing, or reviewing admin, studio, me, backdoor, or integration controllers, including route shape, guards, Zod responses, UID validation, DTO-to-service payload mapping, pagination, and throttle profile decisions.
---

# NestJS Controller Patterns

Controller-layer patterns for `apps/erify_api`. Controllers validate/translate HTTP input, apply auth, call services, and serialize responses.

## First Read

- Canonical controllers: [admin-client](../../../apps/erify_api/src/admin/clients/admin-client.controller.ts), [studio-task-template](../../../apps/erify_api/src/studios/studio-task-template/studio-task-template.controller.ts), [me-task](../../../apps/erify_api/src/me/me-task/me-task.controller.ts)
- Base controllers: [base-admin](../../../apps/erify_api/src/admin/base-admin.controller.ts), [base-studio](../../../apps/erify_api/src/studios/base-studio.controller.ts), [base](../../../apps/erify_api/src/lib/controllers/base.controller.ts)
- Detailed rules: [controller-rules.md](references/controller-rules.md) | Examples: [controller-examples.md](references/controller-examples.md)

## Choose The Controller Type

| Route type | Prefix | Base/auth | Use when |
|---|---|---|---|
| Admin | `admin/<resource>` | `BaseAdminController` | System admins manage global resources |
| Studio | `studios/:studioId/<resource>` | `BaseStudioController` + `@StudioProtected` | Resource belongs to one studio |
| Me | `me/<resource>` | `BaseController` + `@CurrentUser()` | User acts on own resources |
| Backdoor | `backdoor/<resource>` | `BaseBackdoorController` | Service-to-service API-key calls |

## Workflow

1. Pick controller type → 2. Validate UID params with `UidValidationPipe` → 3. Use route context as scope authority → 4. Extract only service-needed fields → 5. Call service (no Prisma) → 6. Serialize with Zod decorators → 7. Return paginated lists with shared helper

## Key Rules

- One canonical collection route per mutable resource under its auth boundary
- `@ZodResponse`/`@ZodPaginatedResponse`/`@AdminResponse` for all responses
- Semantic action endpoints (`POST .../resolve-cancellation`) over generic `PATCH`
- Services must not accept HTTP DTOs, request/response objects, or Nest exceptions
- Admin mutations use domain write paths, not nested Prisma creates
- `@Delete` routes default to `ADMIN`-only via an explicit per-route `@StudioProtected([STUDIO_ROLE.ADMIN])` override — never inherit a broader class-level guard meant for reads/writes (e.g. `StudioMembersController.removeMember`). A role broadly authorized to edit a resource (e.g. `ACCOUNT_MANAGER` on a catalog) isn't automatically authorized to hard-delete it; that needs its own explicit decision.

## Checklists

**Admin**: extends `BaseAdminController`, `admin/<resource>` prefix, `@AdminResponse`, `UidValidationPipe`, `ensureResourceExists()`, reuses domain write path.

**Studio**: extends `BaseStudioController`, validates `studioId` + resource UID, `@StudioProtected([roles])`, scopes by route `studioId` (rejects body-supplied studio IDs).

**Me**: `me/` prefix, `@CurrentUser()` only, dedicated `Me{Domain}Service`, JWT `ext_id` resolved in me service, ownership in query predicate.

**Backdoor**: extends `BaseBackdoorController`, no `@CurrentUser()`.

## Review

- [ ] Correct boundary, base class, and guard
- [ ] No internal DB IDs exposed, all Zod serialization
- [ ] UID params use `UidValidationPipe`
- [ ] DTOs translated to service payloads
- [ ] Studio/user ownership enforced at query level
- [ ] Lists paginated and bounded
- [ ] High-frequency reads use `@ReadBurstThrottle()`
- [ ] No Prisma queries in controller
- [ ] `@ZodResponse(...)` schema matches handler return shape — pass the transformer DTO when the handler returns the raw aggregate, or the public response schema (`@eridu/api-types`) when the handler already called `xxxDto.parse(...)`. Lock with a `Reflect.getMetadata('ZOD_SERIALIZER_DTO_OPTIONS', Controller.prototype.method)` assertion in the spec. See [controller-rules.md §`@ZodResponse(...)` must match the controller's return shape](references/controller-rules.md#zodresponse-must-match-the-controllers-return-shape).

## Open References

- [controller-rules.md](references/controller-rules.md) — route semantics, DTO mapping, throttle profiles
- [controller-examples.md](references/controller-examples.md) — concrete code
- [erify-authorization](../erify-authorization/SKILL.md) — guard/role decisions
