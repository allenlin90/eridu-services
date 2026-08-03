---
name: backend-controller-pattern-nestjs
description: Build erify_api NestJS controllers with correct routes, guards, Zod responses, UID validation, and payload mapping.
---

# Controller Pattern — NestJS

Procedure for adding or changing an `erify_api` controller. Canonical controller-type table, key rules, per-audience checklists, and review list live in [`knowledge/architecture/backend-controller-pattern-nestjs`](../../../knowledge/architecture/backend-controller-pattern-nestjs.md).

## Procedure

1. Pick the controller type (Admin / Studio / Me / Backdoor) from the knowledge doc's table and extend its base controller.
2. Validate UID path params with `UidValidationPipe`.
3. Use route context as the scope authority — never trust a body-supplied studio ID.
4. Extract only the fields the service needs; translate DTO → service payload. No Prisma in the controller.
5. Serialize with `@ZodResponse` / `@ZodPaginatedResponse` / `@AdminResponse`; return paginated lists through the shared helper.
6. Apply the guard for the boundary — `@StudioProtected([STUDIO_ROLE.…])` for studio routes; `@Delete` needs its own explicit `[STUDIO_ROLE.ADMIN]` override, never an inherited class-level guard.
7. Walk the knowledge doc's review checklist before opening the PR.

For guard and role decisions, load [`erify-authorization`](../erify-authorization/SKILL.md).

## Verification

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test && pnpm --filter erify_api build
```

## Canonical Knowledge

- [`knowledge/architecture/backend-controller-pattern-nestjs`](../../../knowledge/architecture/backend-controller-pattern-nestjs.md) — types, rules, checklists, review list
- [`references/controller-rules.md`](references/controller-rules.md) — route semantics, DTO mapping, throttle profiles
- [`references/controller-examples.md`](references/controller-examples.md) — concrete code
