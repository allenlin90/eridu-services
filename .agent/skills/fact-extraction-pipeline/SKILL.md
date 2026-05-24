---
name: fact-extraction-pipeline
description: Patterns for adding extractors and write surfaces to the PR 12 fact-extraction pipeline (`apps/erify_api/src/orchestration/fact-extraction/`). Use BEFORE implementing any new `IngestionExtractor`, paired-atomic write, `SystemFactKey`, or hydrated-scope target type. Required reading before PR 12.2 (creator), 12.3.2 (violations), 12.4 (review surface), or any follow-on extractor work — every Codex finding on PR 12.1.2 (#103) is encoded here.
---

# Fact Extraction Pipeline

The extraction pipeline routes `COMPLETED` task content into typed indexed columns on `Show` / `ShowCreator` / `ShowPlatform` / `ShowPlatformViolation` via `IngestionExtractor` strategy objects. It is high-concurrency and audit-critical — almost every correctness bug surfaces as either silent data loss or misclassified audit rows.

## Canonical files

- **Engine** (orchestration): [`fact-extraction.service.ts`](../../../apps/erify_api/src/orchestration/fact-extraction/fact-extraction.service.ts)
- **Transactional boundary**: [`fact-extraction.processor.ts`](../../../apps/erify_api/src/orchestration/fact-extraction/fact-extraction.processor.ts)
- **Registry**: [`extractors/extractor-registry.ts`](../../../apps/erify_api/src/orchestration/fact-extraction/extractors/extractor-registry.ts)
- **Decision types**: [`extractors/extractor.types.ts`](../../../apps/erify_api/src/orchestration/fact-extraction/extractors/extractor.types.ts)
- **Show extractors** (PR 12.1.1): `show-actual-{start,end}-time.extractor.ts`
- **Platform extractors** (PR 12.1.2 — the reference for hydrated scopes): `show-platform-actual-{start,end}-time.extractor.ts`
- **Source priority resolver**: [`source-priority.ts`](../../../apps/erify_api/src/orchestration/fact-extraction/source-priority.ts)
- **Fact-key catalog**: [`packages/api-types/src/task-management/template-definition.schema.ts`](../../../packages/api-types/src/task-management/template-definition.schema.ts)
- **PRD**: [`docs/prd/task-fact-binding.md`](../../../docs/prd/task-fact-binding.md)
- **Design**: [`apps/erify_api/docs/design/TASK_INPUT_FACT_BINDING_DESIGN.md`](../../../apps/erify_api/docs/design/TASK_INPUT_FACT_BINDING_DESIGN.md)

## Outcome routing order (HARD RULE)

The per-fact loop MUST run filters in this exact order. Each later filter assumes the earlier ones short-circuited.

```
1. handledPairedKeys / handledPairedPlatformContentKeys     (paired path consumed)
2. isFactValueAbsent(rawValue)        → noop:value_absent              (no audit)
3. !extractorRegistry.resolve(key)    → skipped_no_extractor           (no audit)
4. Per-target stale check (hydrated)  → skipped_stale_target           (no audit)
5. isFactColliding(fact, colliding)   → skipped_collision              (SKIPPED audit)
6. processor.applyAndAudit(...)       → written / skipped_lower_priority (write + audit)
```

**Why `skipped_stale_target` must precede `skipped_collision`**: a stale target is unwritable by definition; emitting a `SKIPPED_LOWER_PRIORITY` audit for it would mislabel an unwritable row as a contested write. (Codex P2 on PR #103.)

**Why `skipped_no_extractor` must precede the collision check**: unregistered keys are silent no-ops by registry contract — emitting a SKIPPED audit for a key nothing in this binary can write is fictional. (Codex P2 on PR #98.)

## Predicate-on-write rule (race-safe `update*Actuals`)

Every `update*Actuals` helper on a model service MUST scope its write predicate by:

```
{ uid, <scopeParentId>, deletedAt: null }
```

Use `updateMany`, check `result.count === 0`, throw `HttpError.notFound(...)` when no row matched. Reference: [`ShowPlatformService.updateActuals`](../../../apps/erify_api/src/models/show-platform/show-platform.service.ts).

```ts
async updateActuals(uid: string, showId: bigint, payload: { ... }): Promise<void> {
  const result = await this.repo.updateMany(
    { uid, showId, deletedAt: null },
    { ...payload },
  );
  if (result.count === 0) {
    throw HttpError.notFound('ShowPlatform', uid);
  }
}
```

**Why all three filters**:
- `uid` — primary key
- `<scopeParentId>` — guards cross-scope reassignment race (Codex P1 #8 on PR #103: platform reassigned to another show between read and write would be mutated under the wrong audit context)
- `deletedAt: null` — guards concurrent soft-delete race (Codex P2 #7)

The extractor / paired processor MUST then `catch (err) { if (err instanceof NotFoundException) return { kind: 'noop', reason: 'target_stale' }; throw err; }` around the call. Same pattern goes around the initial `getByUid` read — both ends of the read-write race must collapse to `target_stale`.

## Per-target collision detection (hydrated scopes)

`CollisionTracker` has two tiers — never collapse to one:

```ts
type CollisionTracker = {
  showScope: Set<SystemFactKey>;          // show scope: one canonical target
  perTarget: Set<string>;                  // `${factKey}|${targetUid}`
};
```

- **Show scope** (`target: 'show'`): schema-only match on the sibling is sufficient (the sibling will write to the same one target).
- **Hydrated scope** (`target: 'show_creator' | 'show_platform'`): collision is per `(factKey, targetUid)`. Walk sibling **content** (NOT schema). Mark collision **only** when:
  1. The sibling value passes `!isFactValueAbsent(value)` (blank / cleared values aren't competing writes — Codex P1 #6)
  2. The parsed content key's `(factKey, targetUid)` is in the current task's writing set

**Wrong** (PR 12.1.2 pre-fix): per-fact-key collision blocked unrelated platform paired writes whenever any sibling shared the fact key, leaving valid actuals stale. (Codex P1 #5.)

Construct the helper map per sibling: `factKeyByFieldId: Map<fieldId, SystemFactKey>`. Sibling field IDs differ from the current task's — match on the canonical fact key, not the field id.

## Narrow error-class collapsing

Never `catch {}` or `catch (err) { return fallback }` blindly. Only collapse known error classes; rethrow unknowns.

```ts
try {
  row = await this.svc.getByUid(uid);
} catch (err) {
  if (err instanceof NotFoundException) {
    return { kind: 'noop', reason: 'target_stale' };
  }
  throw err;
}
```

**Why**: collapsing all errors as `target_stale` would silently swallow production incidents (Prisma outage, connection failure) as routine stale assignments. The outer service catch wraps unknowns as `extractor_error` so the failure stays visible. (Codex P1 #2.)

## Persisted-JSON registry lookups

Snapshots, metadata, and task content are persisted JSON cast to a TS type at read time. **The TS type is NOT load-bearing** — mixed-version / legacy / future-binary data can carry keys this binary doesn't know.

Every enum / registry lookup off persisted data MUST guard for `undefined`:

```ts
const definition = SYSTEM_FACT_KEY_DEFINITIONS[key];
if (!definition) continue;   // unknown key — silently skip
```

Sites that need this: `collectBoundFacts`, `findCollidingFacts`, any `metadata.actuals_source[factKey]` discriminator, any audit-action enum access off persisted JSON. (Codex P1 #9: a single unguarded `.target` deref aborted the entire `extractFromTask` run with `TypeError` on a mixed-version sibling.)

## Per-target paired atomic write

When a fact has both `*_start_time` and `*_end_time` (or any merged-validation pair), the per-extractor flow is racy — Codex P1 on PR #101 spells out why. The fix is an atomic `applyPaired{Entity}Actuals` per-target processor:

- **ONE `@Transactional()` per target** — multiple targets on the same task = multiple transactions, so a validation failure on platform A doesn't roll back platform B's already-written pair.
- **Merged-pair validation gated on EFFECTIVE write** (`startCanWrite && !startUnchanged`), not `canWrite`. Otherwise a no-op resubmission against a stored pair that's already inverted (because `updateShow` itself doesn't enforce range ordering) surfaces as `extractor_error`. (Codex P2 on PR #101.)
- **Catch `NotFoundException` from `updateActuals`** → `target_stale` on both sides (Codex P2 on PR #103).
- **Caller filters** absent / unparseable / colliding / stale BEFORE invoking; the processor's contract is "both sides are writable values."

Reference template: [`applyPairedShowPlatformActuals`](../../../apps/erify_api/src/orchestration/fact-extraction/fact-extraction.processor.ts) + [`tryAtomicPairedShowPlatformActuals`](../../../apps/erify_api/src/orchestration/fact-extraction/fact-extraction.service.ts).

## Adding a new extractor — checklist

For PR 12.2 (creator), 12.3.2 (violations), or any future extractor. Each box maps to a real Codex finding from PRs #91 / #101 / #103.

**Catalog + schema**:
- [ ] Add fact key + definition to `SYSTEM_FACT_KEY_DEFINITIONS` (`packages/api-types/.../template-definition.schema.ts`)
- [ ] Schema migration + model field exists from PR 12.0.2 — verify before extractor work
- [ ] Add target type to `AuditTargetType` enum if it's a new scope

**Model service**:
- [ ] `getByUid(uid)` that throws `HttpError.notFound`
- [ ] `findActiveByUids(uids, scopeParentId)` for bulk pre-resolution — MUST include the scope parent (e.g., `showId`)
- [ ] `ensureValidRange(...)` if the fact has a paired counterpart
- [ ] `update*Actuals(uid, scopeParentId, payload)` using `updateMany` with `{ uid, scopeParentId, deletedAt: null }` + `NotFoundException` on `count === 0`

**Extractor class**:
- [ ] Absent-value short-circuit BEFORE any DB read
- [ ] `parseValue` short-circuit BEFORE any DB read (malformed values are operator submission issues, not pipeline failures)
- [ ] `try/catch NotFoundException` around `getByUid` → `target_stale`
- [ ] Cross-scope defence-in-depth (`row.scopeParentId !== ctx.scopeParentId` → `target_stale`)
- [ ] Priority resolver via `canResolverOverwrite(ctx.source, recordedSource)`
- [ ] Idempotency short-circuit BEFORE validation (currentValue equality + same source → `value_unchanged`)
- [ ] `try/catch NotFoundException` around `update*Actuals` → `target_stale`

**Service wiring**:
- [ ] Register extractor in `ExtractorRegistry` constructor + module providers
- [ ] Extend `resolveAuditTargetIds` to handle the new scope (use the bulk-resolved cache, not a fresh DB read per fact)
- [ ] Add bulk resolution call in `extractFromTask` (mirror `findActiveByUids` for the new scope)
- [ ] Insert stale-target pre-filter BEFORE collision routing in the per-fact loop
- [ ] If paired: add `applyPaired{Entity}Actuals` per-target processor + `tryAtomicPaired{Entity}Actuals` in the service

**Collision detection** (`findCollidingFacts`):
- [ ] If new scope is hydrated: walk sibling content (NOT just schema), filter blanks, key by `${factKey}|${targetUid}`
- [ ] Guard `SYSTEM_FACT_KEY_DEFINITIONS[k]` for `undefined` (persisted-JSON safety)

**Tests** (mirror the regression coverage on PR #103):
- [ ] CREATE / UPDATE / skip-lower-priority / value_absent / value_unchanged / target_stale per extractor
- [ ] Inverted-stored-pair idempotency
- [ ] `NotFoundException` from `getByUid` → `target_stale`
- [ ] Non-NotFound errors propagate (cover both `getByUid` and `updateActuals`)
- [ ] Cross-scope reassignment → `target_stale`
- [ ] Per-target paired write (full UPDATE, MANAGER-pinned one-side, merged-pair validation rollback, both-unchanged no-op, NotFound from `updateActuals` → `target_stale` on both sides)
- [ ] Service: bulk lookup called with correct `scopeParentId`
- [ ] Service: stale target with colliding sibling → `skipped_stale_target` (NOT `skipped_collision`)
- [ ] Service: same fact key for DIFFERENT target on sibling → no collision, write proceeds
- [ ] Service: sibling with empty content / blank values → no collision
- [ ] Service: sibling with unknown `system_fact_key` → no throw, write proceeds
- [ ] Processor: `NotFoundException` from `updateActuals` → `target_stale` on both sides; non-NotFound propagates

## Field-id naming in tests

`FIELD_ID_PART = /^fld_[a-z0-9]{10,}$/` in `parseHydratedContentKey`. Underscores after `fld_` are NOT allowed and silently fail to parse — `fld_plat_start` won't produce facts. Use `fld_platstart1` (10+ lowercase alphanumeric only). Spent real debugging time on this during PR 12.1.2.

## Outcome → audit table

| Outcome | Audit written? | Notes |
|---|---|---|
| `written` | ✅ CREATE / UPDATE | Pairs with column write inside same transaction |
| `skipped_lower_priority` | ✅ SKIPPED_LOWER_PRIORITY | Records the attempt + losing source |
| `skipped_collision` | ✅ SKIPPED_LOWER_PRIORITY | `collision_reason: 'cross_task_same_fact_key'` in metadata |
| `skipped_stale_target` | ❌ no audit | Unwritable row — no contested-write record |
| `skipped_no_extractor` | ❌ no audit | Silent registry contract |
| `noop / value_absent` | ❌ no audit | Operator left field blank |
| `noop / value_unchanged` | ❌ no audit | Idempotent resubmission |
| `noop / target_stale` | ❌ no audit | Stale-target race after a DB read |
| `noop / extractor_error` | ❌ no audit | Logged + swallowed by outer service catch |

## Related skills

- [orchestration-service-nestjs](../orchestration-service-nestjs/SKILL.md) — `TaskOrchestrationService.submitTaskContent` is the canonical caller; "Race-Safe Writes on Persisted-Scope Entities" section is required reading
- [service-pattern-nestjs](../service-pattern-nestjs/SKILL.md) — model service surface
- [database-patterns](../database-patterns/SKILL.md) — `@Transactional()` + CLS
- [backend-testing-patterns](../backend-testing-patterns/SKILL.md) — Jest module wiring with CLS-transactional
