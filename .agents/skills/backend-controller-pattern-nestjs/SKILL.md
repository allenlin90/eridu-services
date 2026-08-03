---
name: backend-controller-pattern-nestjs
description: Implement thin NestJS controllers, DTO validations, response mappings, and permission guards.
---

# NestJS Controller Procedure

Thin procedural skill for building NestJS API controllers. Canonical controller rules live in [`knowledge/architecture/backend-controller-pattern-nestjs.md`](../../../knowledge/architecture/backend-controller-pattern-nestjs.md).

## Task Workflow

1. **Keep Controllers Thin**: Ensure controllers delegate all business logic to Capability Services.
2. **DTO & Schema**: Validate request parameters using Zod schemas or NestJS validation pipes.
3. **Guard Decoration**: Decorate routes with appropriate `@UseGuards(...)` and `@RequirePermission(...)`.
4. **Verification**: Run `pnpm --filter erify_api test` for controller specs.

## Canonical Knowledge Reference

- [`knowledge/architecture/backend-controller-pattern-nestjs.md`](../../../knowledge/architecture/backend-controller-pattern-nestjs.md)
