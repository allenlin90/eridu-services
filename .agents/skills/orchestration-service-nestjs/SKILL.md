---
name: orchestration-service-nestjs
description: Implement erify_api workflow coordination, transactions, idempotency, locks, and race-safe writes inside capability-owned use cases.
---

# Orchestration Service Pattern - NestJS (Superseded for placement)

> **Superseded for architecture and placement selection.**
> [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md)
> decides *where* a cross-model workflow lives — place it under the business capability
> that owns the use case rather than a generic orchestration layer. **The workflow
> correctness rules below (transactions, advisory locks, idempotency, race-safe writes,
> persisted-JSON guards) stay canonical for new and refactored `erify_api` code.**

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

### Race-Safe Writes on Persisted-Scope Entities

When an orchestrator writes to a row that lives under a scope parent (e.g. `ShowPlatform` under `Show`, `ShowCreator` under `Show`, `StudioShift` under `Studio`), reads and writes can race with concurrent soft-deletes and cross-scope reassignments. Three rules — every Codex finding on PR 12.1.2 (#103) traced back to violating one of them.

**1. Write predicates always include `{ uid, scopeParentId, deletedAt: null }`.** Use `updateMany` (not `update`), check `count === 0`, throw `HttpError.notFound(...)`. Reference: [`ShowPlatformService.updateActuals`](../../../apps/erify_api/src/models/show-platform/show-platform.service.ts).

**2. Bulk prefetch (`findActiveByUids` / similar) takes the scope parent too.** Otherwise a row reassigned to a different scope parent leaks into the cache used by the orchestrator for audit-target resolution and collision detection.

**3. Catch `NotFoundException` at both ends of the race — the initial read AND the eventual write — and collapse to a domain-specific stale outcome.** Don't catch the broader `Error` class; transient failures (Prisma outage, connection refused) must propagate so the outer service catch records them as `extractor_error` / equivalent. Pattern:

```ts
try {
  row = await this.svc.getByUid(uid);
} catch (err) {
  if (err instanceof NotFoundException) return { kind: 'noop', reason: 'target_stale' };
  throw err;
}
```

**Why this generalizes**: any orchestrator that hands a row uid through a multi-step workflow (read → validate → write) is exposed to the same races. Catching `NotFoundException` at exactly the boundaries that can race keeps domain semantics clean (`target_stale` ≠ `extractor_error`) and prevents writes against logically-deleted or reassigned rows.

### Persisted-JSON Registry Lookups

Snapshots, metadata, and task content are persisted JSON cast to a TS type at read time. **The TS type is NOT load-bearing** — mixed-version / legacy / future-binary data can carry keys this binary doesn't know.

Any enum / registry / discriminator lookup off persisted data MUST guard for `undefined`:

```ts
const definition = SYSTEM_FACT_KEY_DEFINITIONS[key];
if (!definition) continue;  // unknown key — skip silently
```

Codex P1 on PR #103 caught a single unguarded `.target` deref that aborted an entire orchestration run with `TypeError` on a mixed-version sibling task.

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
- [ ] Writes to scoped-parent rows use `{ uid, scopeParentId, deletedAt: null }` predicate + `updateMany` + `NotFoundException` on `count === 0` (see "Race-Safe Writes" section)
- [ ] Bulk prefetch helpers include the scope parent in their filter
- [ ] `try/catch (err) { if (err instanceof NotFoundException) ... ; throw err; }` around both initial read AND eventual write — never `catch {}` or `catch (err) { return fallback }`
- [ ] Every `enumLookup[k]` / discriminator on persisted JSON guarded for `undefined`

## Related Skills

- [Fact Extraction Pipeline](../fact-extraction-pipeline/SKILL.md) — extractor / paired-write / per-target collision patterns; required reading before any new `IngestionExtractor`
- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Model Service patterns
- [Database Patterns](../database-patterns/SKILL.md) — `@Transactional()`, advisory locks
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Controller patterns
