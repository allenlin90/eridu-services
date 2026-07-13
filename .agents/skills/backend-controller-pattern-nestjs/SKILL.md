---
name: backend-controller-pattern-nestjs
description: Build erify_api NestJS controllers with correct routes, guards, Zod responses, UID validation, and payload mapping.
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
- When checking whether a route exists, account for NestJS's prefix + method-path composition — `@Controller('studios/:studioId')` plus `@Get('clients')` on a method composes to `GET /studios/:studioId/clients`. Grepping for the full combined path as one literal `@Controller(...)` string misses this and produces a false "route doesn't exist" (caught a codex review false-positive this way on PR 20.4 — `StudioLookupController`'s `clients` lookup route was real, just not findable by that search).

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
- [ ] A per-resource authorization gate documented as applying to "every route, including reads" (e.g. a manual studio↔client linkage check beyond the role guard) actually has the call in every handler on the controller — when a new read-only route (e.g. a coverage/detail endpoint) is added later, it's easy to copy the happy-path body from a sibling handler and forget the gate call, since the class-level doc comment doesn't enforce it at compile time. Grep the controller for the gate-check method name and diff it against the handler list. See `studio-client-mechanic.controller.ts`'s `getCoverage` (PR 20.6 review) for a caught instance.

## Open References

- [controller-rules.md](references/controller-rules.md) — route semantics, DTO mapping, throttle profiles
- [controller-examples.md](references/controller-examples.md) — concrete code
- [erify-authorization](../erify-authorization/SKILL.md) — guard/role decisions
