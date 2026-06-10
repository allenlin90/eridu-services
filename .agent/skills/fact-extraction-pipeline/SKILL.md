---
name: fact-extraction-pipeline
description: Patterns for adding extractors and write surfaces to the PR 12 fact-extraction pipeline (`apps/erify_api/src/orchestration/fact-extraction/`). Use BEFORE implementing any new `IngestionExtractor`, paired-atomic write, `SystemFactKey`, numeric performance fact, or hydrated-scope target type. Required reading before adding any new extractor or follow-on work. The "State-transition handoff between co-submitted facts" section is mandatory before adding ANY fact whose write semantics depend on another fact's value in the same submission.
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
- **Platform performance extractors** (PR 21.4 — the reference for numeric/Decimal facts + template-based precedence): `platform-performance-extractors.ts`
- **Source priority resolver**: [`source-priority.ts`](../../../apps/erify_api/src/orchestration/fact-extraction/source-priority.ts)
- **Fact-key catalog**: [`packages/api-types/src/task-management/template-definition.schema.ts`](../../../packages/api-types/src/task-management/template-definition.schema.ts)
- **Feature**: [`docs/features/task-fact-binding.md`](../../../docs/features/task-fact-binding.md)
- **Design**: [`apps/erify_api/docs/TASK_INPUT_FACT_BINDING.md`](../../../apps/erify_api/docs/TASK_INPUT_FACT_BINDING.md)

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

## Provenance assignment at the submission boundary

`ActualsSource` (the `source` the resolver compares via `canResolverOverwrite`) is decided **upstream of the engine**, in [`TaskOrchestrationService.submitTaskContent`](../../../apps/erify_api/src/task-orchestration/task-orchestration.service.ts) — NOT inside `fact-extraction.service.ts`. The engine only consumes it. Get this wrong and every downstream priority decision is wrong while every test that asserts only "extraction fired" stays green.

Rules (PR 12.4.6):

- **`MANAGER` (rank 4) is reserved for an actual manager *override*** — `options.mode === 'admin'` AND `payload.content !== undefined` (the actor changed content) AND the role is `STUDIO_ROLE.ADMIN`/`STUDIO_ROLE.MANAGER`. Everything else — a plain approval, and **every bulk approval** (`bulkApproveTasks` routes through `submitTaskContent` with `{ status }` only, no content) — stays `OPERATOR` (rank 1) so a later `PLATFORM` sync (rank 3) can still overwrite it. Tagging plain approvals `MANAGER` would permanently freeze actuals against platform truth.
- **`auditContext.actorRole` is a lowercase `StudioRole`** (`'admin'`/`'manager'`, from `request.studioMembership.role`). Compare against the `STUDIO_ROLE` constants, **never** uppercase literals like `'ADMIN'` — that comparison is silently always-false and collapses every write back to `OPERATOR`. Type the field as `StudioRole`, not `string`, so the compiler catches it.
- **Tests MUST assert the resolved `source`** (`extractFromTask` called with `expect.objectContaining({ source: 'MANAGER' })`), not merely that extraction was invoked — a "did it fire" assertion cannot catch a provenance regression.

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

## Numeric / Decimal-backed facts (PR 21.4)

Performance metrics (`show_platform_{gmv,view_count,ctr,cto}`) are the first **numeric** facts (`field_type: 'number'`). Rules that don't apply to datetime/checkbox extractors:

- **Build `Prisma.Decimal` from the RAW value, never from `Number(rawValue)`.** Round-tripping a monetary GMV or a percentage through a JS float silently truncates precision (`Number('1250.123456789012345')` loses digits) and then re-introduces float drift on the column. Construct `new Prisma.Decimal(fact.rawValue as Prisma.Decimal.Value)` directly, inside a `try/catch` that collapses an unparseable value to `noop:value_absent`. **Trim string input first** (`typeof raw === 'string' ? raw.trim() : raw`) — `parseNumberValue`/the prefilter accept a whitespace-padded `' 1250.5 '`, but bare `Prisma.Decimal` throws on surrounding whitespace, so without the trim the gate and the extractor disagree and a valid value is dropped. Only the integer `viewerCount` goes through `Number()`. (This + the rounding review on PR #132.)
- **Round to the column scale, and reject values that overflow the column precision.** The columns are low-scale `numeric(p,s)` (`gmv Decimal(12,2)`, `ctr`/`cto Decimal(5,2)`), and Postgres silently rounds to `scale` on write. Round the incoming Decimal to that scale (`toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP)`) BEFORE the idempotency check, the write, and the audit `newValue`, then reuse that one rounded Decimal for all three — otherwise the audit records a precision the column never stored, and (worse) every resubmission re-reads the rounded value, fails `Decimal.equals`, and re-writes forever so `value_unchanged` never fires. A value whose integer part exceeds `precision - scale` digits (e.g. a `ctr` ≥ 1000 on `Decimal(5,2)`) would raise `numeric field overflow` on the write; reject it up front as `noop:value_out_of_range` so it doesn't surface as an unhandled `extractor_error`. (PR #132 review.)
- **Idempotency compares decimals with `Decimal.equals`, not `===` on `Number(...)`.** `5.25 === 5.250` via float works by luck; `.equals` is the correct, drift-free comparison and keeps `value_unchanged` honest — but only after rounding both sides to the column scale (above), since the stored value is already rounded.
- **The `number` field-type needs a prefilter parser.** `isFactValueParseable` had no `number` case, so it defaulted to `true` and let `'abc'` / whitespace into `writingFacts` → a false `skipped_collision` audit for a value the extractor would noop on. The shared `parseNumberValue` (`extractors/number-value.ts`) is now used by BOTH the extractor's value gate and the prefilter so they agree exactly — the same invariant as #4 in "State-transition handoff". (Codex P2 on PR #132.)
- **Use `Prisma.Decimal` (decimal.js) on the backend, NOT `big.js`.** `Prisma.Decimal` is already an arbitrary-precision decimal and is the type the Prisma column write requires, so it's the house convention for backend money/percentages (cf. `studio-shift.service.ts`). `big.js` is a frontend-only dependency for display formatting (`erify_creators` / `erify_studios`) and isn't installed in `erify_api`; routing through it would just force a `Big → string → Prisma.Decimal` conversion for zero precision gain. The real precision frontier is upstream: if `task.content` stores the value as a JSON number, `JSON.parse` already bounded it before any extractor sees it — only a string-typed submission preserves full precision end-to-end.

### Template-based precedence (vs. source-priority resolver)

This family does NOT use `canResolverOverwrite(ctx.source, recordedSource)` — every Phase 4 submission writes as `OPERATOR`, so source rank can't distinguish a post-production wrap-up from a loop-8 moderation write. Precedence is instead keyed on the **template UID** that last wrote each metric, persisted in `ShowPlatform.metadata.performance_templates[factKey]`. Once `POST_PRODUCTION_TEMPLATE_UID` owns a metric, only the post-production template may overwrite it; a lower-priority template returns `skip:SKIPPED_LOWER_PRIORITY`. When adding metrics to this family, thread `ctx.templateUid` (sourced from `task.template?.uid` in `fact-extraction.service.ts`) and write it into the metadata map alongside the column.

**Never read-modify-write the whole `metadata` blob to record provenance.** Two concurrent task submissions writing DIFFERENT metrics each read `metadata`, build a full replacement, and last-write-wins drops the sibling's `performance_templates` entry — which can leave a protected post-production value overwriteable by a loop-8 task (Codex P1 on PR #132). `ShowPlatformRepository.updatePerformanceMetric` instead writes the column and merges ONLY its own `factKey` via a single `jsonb` `||` UPDATE, evaluated against the row's current value, so no sibling entry is ever lost. The same UPDATE predicate also re-checks current `performance_templates[factKey]` and rejects lower-priority writes if post-production took ownership after the extractor's earlier read, closing the same-metric TOCTOU.

## Adding a new extractor — checklist

For any new extractor. These checks cover the failure modes that have caused
silent no-ops, incorrect audit rows, stale-target writes, and lost provenance in
the extraction pipeline.

**Catalog + schema**:
- [ ] Add fact key + definition to `SYSTEM_FACT_KEY_DEFINITIONS` (`packages/api-types/.../template-definition.schema.ts`)
- [ ] Schema migration + model field exists from PR 12.0.2 — verify before extractor work
- [ ] Add target type to `AuditTargetType` enum if it's a new scope
- [ ] For hydrated child-record replacements, scope source rows by the hydrated `contentKey`, not the template `sourceFieldId`; otherwise one platform/creator target can supersede sibling target rows from the same template field. PR 12.3.2's `ShowPlatformViolation` extractor uses `sourceFieldId = fact.contentKey` for this reason.
- [ ] **Co-submission audit**: does this fact and another fact key write to the same column under a mutually-exclusive state derivation? (E.g., `creator_attendance_missing` and `creator_actual_start_time` both write `attendanceReason` but only one is "active" at a time per the read-side derivation rule.) If yes, read "State-transition handoff between co-submitted facts" below BEFORE writing extractor code — the cross-fact transition handoff is where every Codex finding on PR 12.2 came from

**Model service**:
- [ ] `getByUid(uid)` that throws `HttpError.notFound`
- [ ] `findActiveByUids(uids, scopeParentId)` for bulk pre-resolution — MUST include the scope parent (e.g., `showId`)
- [ ] `ensureValidRange(...)` if the fact has a paired counterpart
- [ ] `update*Actuals(uid, scopeParentId, payload)` using `updateMany` with `{ uid, scopeParentId, deletedAt: null }` + `NotFoundException` on `count === 0`

**Extractor class**:
- [ ] Absent-value short-circuit BEFORE any DB read
- [ ] `parseValue` short-circuit BEFORE any DB read (malformed values are operator submission issues, not pipeline failures)
- [ ] For numeric/Decimal facts: build `Prisma.Decimal` from the raw value (not `Number(rawValue)`) and compare with `Decimal.equals` — see "Numeric / Decimal-backed facts"
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
- [ ] If the new field-type isn't already handled by `isFactValueParseable`, extend it with the matching parser — the pre-flight filter must reject unparseable values OR `coSubmittedFactKeysForTarget` will lie to sibling extractors

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

## State-transition handoff between co-submitted facts

PR 12.2 (creator actuals + attendance) shipped after **eight Codex iterations**. Reading them now, the column itself is fine: `ShowCreator.attendanceReason` holds either the **LATE** reason (`creator_actual_start_time > Show.startTime`) or the **MISSING** reason (`attendanceMissing = true`), and those states are **mutually exclusive** under the read-side derivation rule in `TASK_INPUT_FACT_BINDING.md`. In any steady state, only one writer's reason is semantically meaningful.

The real bug pattern was **the cross-fact handoff during state transitions in the same submission**. A submission can simultaneously toggle `attendance_missing = false` AND set `actual_start_time > show.startTime` — that's a legitimate `MISSING → LATE` transition, and the late extractor's reason needs to take the column while the missing extractor's `false`-write must NOT clear it. Each extractor runs in its own transaction with no shared context, so the coordination had to be threaded through `ExtractedFact.coSubmittedFactKeysForTarget` — and every iteration uncovered a new way that signal could be wrong.

### Mandatory rules when two facts derive from mutually-exclusive states

These are the invariants the inference scheme depends on. Break any one of them and a state-transition submission silently loses the operator's context.

1. **Resolve column values as `operator-provided > preserve-existing > fallback`.** Never `trimmedReason || FALLBACK` — a retry that omits the sidecar would downgrade a real operator reason to placeholder text. The fallback only seeds the FIRST write into an empty column.

2. **Detect drift before writing.** A same-time / same-flag resubmission with a different reason MUST flush the column; the equality short-circuit cannot mask reason corrections. Conversely, a write whose resolved value matches storage MUST short-circuit to `value_unchanged` to avoid audit noise + idempotent rewrites that hide bugs.

3. **Co-submission ownership must be derived from the CURRENT RUN's writing-eligible facts** — never from persisted `metadata.actuals_source`. Historical metadata records "ever happened," not "happening in this submission"; relying on it traps stale reasons on creators whose state has long since transitioned.

4. **A fact's pre-flight writing-eligibility filter (`writingFacts`) MUST include every condition the extractor uses to noop.** Currently:
   - `!isFactValueAbsent(rawValue)` (null/undefined/empty)
   - `extractorRegistry.has(factKey)` (registered)
   - `isFactValueParseable(fact)` — parser-aware check keyed on `SYSTEM_FACT_KEY_DEFINITIONS[factKey].field_type` (datetime → `parseDateTimeValue`, checkbox → `parseBooleanValue`)
   - Priority skips are an accepted residual gap (cannot be predicted without reading current state)

   If you add a new field-type or a new noop reason inside an extractor, ALSO extend the pre-flight filter or `coSubmittedFactKeysForTarget` will lie to siblings.

5. **Clearing a shared column requires explicit co-submission check.** When fact A toggles off and would normally clear the column, check whether fact B is co-submitted IN THIS RUN. If yes, leave the column alone — fact B will write its own reason as part of the transition. The `coSubmittedFactKeysForTarget` set on `ExtractedFact` exists for this; populate it from `writingFacts` only.

### Hydrated content-key sidecar parsing

`parseHydratedContentKey`'s `UID_PART = /^[\w-]+$/` regex accepts underscores, so sidecar keys like `fld_x:creator:<uid>__reason` parse as valid hydrated facts with a target UID suffixed by `__reason`. **Always filter known suffixes (`TASK_CONTENT_REASON_SUFFIX`, `TASK_CONTENT_EXTRA_SUFFIX`) before calling `parseHydratedContentKey`** in `collectBoundFacts`. The hydration layer's own validator already guards these suffixes — the extraction layer must too.

### When this pattern applies (and when it doesn't)

Apply these rules whenever **two or more fact keys write to the same column AND the read-side derivation treats them as mutually exclusive**. The shared column is correct design — the work is to keep the cross-fact handoff coherent during transitions.

If you're considering adding a THIRD fact key to such a column, stop. Two-writer coordination is already at the limit of what runtime inference can express coherently (eight iterations on PR 12.2 is the evidence). Three writers means six pairwise transitions to model, with no symmetry to lean on — at that point split the column or introduce explicit per-write source attribution.

### Why this section exists

The full iteration log is in PR #104's commit history: `f9014f84` → `8d2e84d8` → `2fae3daa` → `7d117b61` → `5cae322c` → `6f1daf02` → `7098371e` → `25f6719c`. Each fix exposed the next layer of the same root cause: an implicit invariant in the cross-fact handoff that hadn't been encoded yet. Reading the commits in order is the fastest way to internalize why the rules above are absolute.

## Related skills

- [orchestration-service-nestjs](../orchestration-service-nestjs/SKILL.md) — `TaskOrchestrationService.submitTaskContent` is the canonical caller; "Race-Safe Writes on Persisted-Scope Entities" section is required reading
- [service-pattern-nestjs](../service-pattern-nestjs/SKILL.md) — model service surface
- [database-patterns](../database-patterns/SKILL.md) — `@Transactional()` + CLS
- [backend-testing-patterns](../backend-testing-patterns/SKILL.md) — Jest module wiring with CLS-transactional
