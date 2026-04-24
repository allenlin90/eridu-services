---
name: backend-controller-pattern-nestjs
description: NestJS controller patterns for erify_api. Use when adding, changing, or reviewing admin, studio, me, backdoor, or integration controllers, including route shape, guards, Zod responses, UID validation, DTO-to-service payload mapping, pagination, and throttle profile decisions.
---

# NestJS Controller Patterns

Use this skill for controller-layer work in `apps/erify_api`. Keep controllers thin: validate and translate HTTP input, apply the correct auth boundary, call services, serialize responses, and map resource absence to the established HTTP response helpers.

## First Read

- Existing implementation closest to the route type:
  - Admin: [admin-client.controller.ts](../../../apps/erify_api/src/admin/clients/admin-client.controller.ts)
  - Studio: [studio-task-template.controller.ts](../../../apps/erify_api/src/studios/studio-task-template/studio-task-template.controller.ts)
  - Me: [me-task.controller.ts](../../../apps/erify_api/src/me/me-task/me-task.controller.ts)
  - Base controllers: [base-admin.controller.ts](../../../apps/erify_api/src/admin/base-admin.controller.ts), [base-studio.controller.ts](../../../apps/erify_api/src/studios/base-studio.controller.ts), [base.controller.ts](../../../apps/erify_api/src/lib/controllers/base.controller.ts)
- Detailed rules: [controller-rules.md](references/controller-rules.md)
- Full examples: [controller-examples.md](references/controller-examples.md)

## Choose The Controller Type

| Route type | Prefix | Base/auth pattern | Use when |
| --- | --- | --- | --- |
| Admin | `admin/<resource>` | `BaseAdminController` | System admins manage global resources |
| Studio | `studios/:studioId/<resource>` | `BaseStudioController`, optional `@StudioProtected([roles])` | A resource belongs to one studio |
| Studio lookup | `studios/:studioId/<lookup>` | `BaseStudioController`, `@StudioProtected()` | Studio members read global lookup/reference data through a studio guard |
| Me | `me/<resource>` | `BaseController`, `@CurrentUser()` | A signed-in user acts on their own resources |
| Backdoor | `backdoor/<resource>` | `BaseBackdoorController` | Service-to-service or internal API-key calls |
| Integration | integration-specific | Integration-specific base/decorator | External integrations such as Google Sheets or webhooks |

## Controller Workflow

1. Pick the controller type from the route boundary above.
2. Validate all UID params with `UidValidationPipe`.
3. Use the route context as the authority for scoping (`studioId`, `@CurrentUser()`, API key identity).
4. Extract only the fields required by the service contract; do not pass whole DTOs through.
5. Call a service or orchestration service; do not query Prisma from the controller.
6. Serialize all responses with Zod decorators.
7. Return paginated lists with the shared pagination helper.
8. Apply a named throttle profile only when the endpoint is a high-frequency read path.

## Shared Rules

- Use `@ZodResponse(schema, status?)` for standard responses.
- Use `@ZodPaginatedResponse(schema)` for list endpoints.
- Use `@AdminResponse()` and `@AdminPaginatedResponse()` for admin routes.
- Use `PaginationQueryDto` or a feature-specific query schema that extends the shared pagination shape.
- For deletes, use `@ZodResponse(undefined, HttpStatus.NO_CONTENT)`.
- For semantic state transitions, prefer action endpoints such as `POST .../resolve-cancellation` over generic `PATCH`.
- Keep services transport-agnostic: services must not accept HTTP DTOs, request objects, response objects, or Nest exceptions as public contracts.

## Controller-Type Checklists

### Admin

- [ ] Extends `BaseAdminController`.
- [ ] Route prefix is `admin/<resource>`.
- [ ] Uses `@AdminResponse()` or `@AdminPaginatedResponse()`.
- [ ] Uses `UidValidationPipe` for resource UID params.
- [ ] Uses base helpers such as `ensureResourceExists()` for not-found responses.

### Studio

- [ ] Extends `BaseStudioController`.
- [ ] Route prefix is `studios/:studioId/<resource>`.
- [ ] Validates both `studioId` and resource UID params.
- [ ] Applies role restrictions with `@StudioProtected([roles])` when membership alone is insufficient.
- [ ] Scopes every read, update, and delete by the route `studioId`.
- [ ] Create operations connect the studio relation from the route `studioId`.
- [ ] Ignores or rejects client-supplied studio IDs in body/query; route `studioId` is authoritative.

### Studio Lookup

- [ ] Uses `@StudioProtected()` so only studio members can read lookups through a studio route.
- [ ] Prefixes unused route params with `_` when the guard validates the studio but the global lookup service is unscoped.
- [ ] Does not export the lookup module from `StudiosModule` unless another module injects its providers.

### Me

- [ ] Route prefix starts with `me/`.
- [ ] Uses `@CurrentUser()` and never trusts a user ID from params or body.
- [ ] Uses a dedicated `Me{Domain}Service` when internal DB user resolution or ownership scoping is needed.
- [ ] Resolves JWT `ext_id` to the internal user in the me service, not in the controller.
- [ ] Enforces ownership in the query predicate, not as a post-query check.

### Backdoor And Integration

- [ ] Backdoor routes extend `BaseBackdoorController` and use the `backdoor/<resource>` prefix.
- [ ] Backdoor routes do not use `@CurrentUser()`.
- [ ] Integration routes use their integration-specific base class and auth decorator.
- [ ] External integration responses keep the expected wire format, including snake_case where required.

## Open References When Needed

- Open [controller-rules.md](references/controller-rules.md) when deciding route semantics, DTO mapping, me-service ownership, studio lookups, or throttle profiles.
- Open [controller-examples.md](references/controller-examples.md) when writing or reviewing concrete controller code.
- Open [../erify-authorization/SKILL.md](../erify-authorization/SKILL.md) when choosing studio/admin guards or roles.
- Open [../data-validation/SKILL.md](../data-validation/SKILL.md) when changing schemas, pipes, or response serialization.
- Open [../service-pattern-nestjs/SKILL.md](../service-pattern-nestjs/SKILL.md) when shaping the service payload contract.

## Review Checklist

- [ ] Correct controller boundary and base class.
- [ ] Correct guard/decorator for the route audience.
- [ ] No internal database IDs exposed.
- [ ] All responses use Zod serialization.
- [ ] UID params use `UidValidationPipe`.
- [ ] DTOs are explicitly translated to service payloads.
- [ ] Studio/user ownership is enforced at query level.
- [ ] Lists are paginated and bounded.
- [ ] High-frequency reads use `@ReadBurstThrottle()` instead of skipping throttling.
- [ ] No Prisma queries or domain workflows live in the controller.
