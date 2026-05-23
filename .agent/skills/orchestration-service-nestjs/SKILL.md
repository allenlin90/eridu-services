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
- A **model mutation must trigger a side effect into another domain** (e.g., task transition → fact extraction → audit fan-out)

Do NOT use for: simple single-model CRUD or thin delegation.

## Side-Effects on Model Mutations — Don't Reach for `forwardRef`

When a model service mutation needs to fan out into another domain (e.g. `TaskService.update*` completing a task should fire `FactExtractionService.extractFromTask`), the wrong fix is to inject the downstream service back into the model service with `@Inject(forwardRef(...))`. That:

- Bleeds the downstream domain into the model service's concerns
- Forces every test of the model service to mock the downstream chain
- Creates a circular module dependency that `forwardRef` papers over at runtime cost
- Hides the dependency direction in `imports: [forwardRef(...)]`, breaking module reasoning

**Pattern:** put the workflow in the orchestration service that already composes both. Model services stay atomic. The orchestrator method takes the same args the caller would have given the model service, dispatches to the model, then triggers the side effect on success.

Reference: `TaskOrchestrationService.submitTaskContent` ([task-orchestration.service.ts](../../../apps/erify_api/src/task-orchestration/task-orchestration.service.ts)) wraps `TaskService.updateTaskContentAndStatus{,AsAdmin}` and fires `FactExtractionService.extractFromTask` on a fresh transition into `COMPLETED`. All three call sites (`MeTaskService`, `StudioTaskController`, future paths) route through it — calling `TaskService.update*` directly silently bypasses extraction, which the orchestrator's doc-comment calls out.

**Rule of thumb:** if you find yourself reaching for `forwardRef`, an orchestrator method is what you actually want. The only legitimate `forwardRef` cases are true two-way operational dependencies (rare), not "service A's update should fire service B."

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
- [ ] No `forwardRef` between this module and the model modules it composes — if you reached for one, you're missing an orchestrator method (see "Side-Effects" section above)

## Related Skills

- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Model Service patterns
- [Database Patterns](../database-patterns/SKILL.md) — `@Transactional()`, advisory locks
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Controller patterns
