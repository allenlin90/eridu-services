---
name: orchestration-service-nestjs
description: Patterns for implementing Orchestration Services in NestJS. Use when coordinating multiple model services for complex workflows like bulk task generation, show assignment, or any operation spanning multiple domain models.
---

# Orchestration Service Pattern - NestJS

Orchestration Services coordinate multiple Model Services for workflows spanning multiple domain models.

## Canonical Examples

- **Orchestration Service**: [task-orchestration.service.ts](../../../apps/erify_api/src/task-orchestration/task-orchestration.service.ts)
- **Processor Service**: [task-generation-processor.service.ts](../../../apps/erify_api/src/task-orchestration/task-generation-processor.service.ts)
- **Module**: [task-orchestration.module.ts](../../../apps/erify_api/src/task-orchestration/task-orchestration.module.ts)

> See [references/orchestration-examples.md](references/orchestration-examples.md) for full code examples.

## When to Use

Use an Orchestration Service when:
- Operation spans **2+ domain models**
- **Bulk operations** with per-item logic
- **Cross-domain validation** (e.g., verify studio membership before assigning)
- **Idempotent processing** (skip already-created pairs)
- Needs **scoped advisory locking** or multi-model transactions

Do NOT use for: simple single-model CRUD or thin delegation.

## Architecture

```
Controller → OrchestrationService → ModelService A, B, C
                                  → ProcessorService (@Transactional boundary)
```

### Why a Separate Processor Service?

`@Transactional()` works via DI proxy — it CANNOT intercept `this.method()` within the same class. Extract the transactional boundary to a dedicated `*Processor` service.

## Key Patterns

### Idempotency (Three-Case Resume)

For each item, handle three cases using `{ includeDeleted: true }`:
1. **Active exists** → skip
2. **Soft-deleted** → resume (restore, reset status, update snapshot)
3. **Missing** → create new

### Partial Success

Catch per-item errors and continue the loop. Return `{ status: 'error' }` for failed items alongside successful ones.

### Cross-Domain Validation

Extract repeated lookups into private helpers (e.g., `resolveStudioMember()`). Validate before the mutation loop.

## Module Rules

- Export the Orchestration Service — controllers import it
- Do NOT export the Processor — internal implementation detail
- Import `PrismaModule` if Processor uses advisory locks

## Error Handling

| Scenario | Approach |
|---|---|
| Bad input | `throw HttpError.badRequest(...)` |
| Cross-domain constraint | `throw HttpError.forbidden(...)` or `badRequest` |
| Per-item failure | Catch, push `{ status: 'error' }`, continue |
| Transaction failure | Let propagate (CLS rolls back) |

## Naming Conventions

| Type | Pattern | Example |
|---|---|---|
| Orchestration Service | `{Domain}OrchestrationService` | `TaskOrchestrationService` |
| Processor Service | `{Domain}{Action}Processor` | `TaskGenerationProcessor` |
| Module | `{Domain}OrchestrationModule` | `TaskOrchestrationModule` |

## Checklist

- [ ] Injects only Model Services (no Repository imports)
- [ ] `@Transactional()` on Processor, not Orchestration Service
- [ ] Processor NOT exported from module
- [ ] Idempotency with `{ includeDeleted: true }` for three-case resume
- [ ] Advisory lock when concurrent calls possible
- [ ] Per-item errors caught (partial success)
- [ ] Cross-domain validation before mutation loop
- [ ] Logger for per-item errors

## Related Skills

- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Model Service patterns
- [Database Patterns](../database-patterns/SKILL.md) — `@Transactional()`, advisory locks
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Controller patterns
