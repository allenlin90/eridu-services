# Service Pattern — NestJS

Procedure for adding or changing an `erify_api` service. Canonical rules, checklist, and error-handling matrix live in [`knowledge/architecture/service-pattern-nestjs`](../../../../knowledge/architecture/service-pattern-nestjs.md).

> **Placement first.** [`erify-api-capability-refactoring`](../../erify-api-capability-refactoring/SKILL.md) decides where the service lives and whether persistence stays inline or moves behind a private provider. This skill applies once that is settled.

## Procedure

1. Read [`knowledge/architecture/service-pattern-nestjs`](../../../../knowledge/architecture/service-pattern-nestjs.md) — §2 (No ORM Coupling) and §3 (never call Zod `.parse()`) are the two rules most often broken.
2. Check [`REFACTORING_TARGETS.md`](../../../../apps/erify_api/docs/REFACTORING_TARGETS.md) for the touched surface; record applicable target IDs and trigger outcome in the plan and PR.
3. Define payload types in the module's schema file. Never put `Prisma.*` in a public service signature.
4. Extend `BaseModelService` for model services (`UID_PREFIX`, no trailing underscore); use `@Transactional()` on orchestration, not on repositories.
5. Return `null` for not-found from model services; let the controller convert via `ensureResourceExists()`.
6. Walk the knowledge doc's checklist before opening the PR.

## Verification

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test && pnpm --filter erify_api build
```

## Canonical Knowledge

- [`knowledge/architecture/service-pattern-nestjs`](../../../../knowledge/architecture/service-pattern-nestjs.md) — rules, error matrix, checklist
- [`references/service-examples.md`](service-examples.md) — code examples
- [`apps/erify_api/docs/ARCHITECTURE.md`](../../../../apps/erify_api/docs/ARCHITECTURE.md) — capability and persistence matrix
