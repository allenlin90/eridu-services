# Ideation: Studio Performance Re-Backfill Service

> **Status**: Deferred — design only
> **Origin**: PR #137 (21.9) review — performance backfill script ([backfill-performance.ts](../../apps/erify_api/scripts/backfill-performance.ts))
> **Related**: [BullMQ Async Processing](./bullmq-async-processing.md), [platform-performance-extractors.ts](../../apps/erify_api/src/orchestration/fact-extraction/extractors/platform-performance-extractors.ts), [PHASE_4.md](../roadmap/PHASE_4.md) PR 21 meta-row

## What

Promote the one-shot `scripts/backfill-performance.ts` into a **manager-triggerable studio operation** that re-projects historical platform-performance facts (`gmv`, `view_count`, `ctr`, `cto`) from submitted task content onto `ShowPlatform` columns + `metadata.performance_templates` provenance, for a **selectable date range** — conceptually an "Elasticsearch re-index" button for performance data.

Triggered by a studio MANAGER/ADMIN, scoped to their studio, with a **dry-run preview** before apply.

## Why It Was Considered

- The standalone script requires shell + DB-URL access and an engineer to run it; managers cannot self-serve.
- After backfilling logic or precedence changes, or after correcting upstream task data, operators need a repeatable, scoped way to recompute a window of shows without a full global rerun.
- A date-range re-index matches how operators already think about corrections ("re-pull last month's shows").

## Design Decisions (captured from review session)

| Decision | Choice | Notes |
| --- | --- | --- |
| Execution model | **Async** (return a token, run in background, poll status) | Avoids HTTP timeouts on large ranges. **Blocked by infra — see constraints.** |
| Date-range filter field | **Show date** (`show.startTime` / scheduled date) | Re-backfill all performance for shows whose date falls in `[start, end]`, regardless of when the task was completed. |
| Authorization | **Studio-scoped `@StudioProtected([ADMIN, MANAGER])`** | Route under `POST /studios/:studioId/performance/backfill`; operates only on that studio's shows/platforms. |
| Safety | **Dry-run preview + apply** | Preview returns would-change counts without writing; apply performs the writes. |

## Key Constraints / Prerequisites

1. **No async job infrastructure exists in `erify_api`.** There is no BullMQ / `@nestjs/bull` / `@nestjs/schedule` / Redis queue; production fact extraction runs **inline/synchronously** during task submission (`fact-extraction.processor.ts` is a plain service, not a Bull processor). The chosen "async job" model therefore requires either:
   - promoting [BullMQ Async Processing](./bullmq-async-processing.md) first (shared decision gate), **or**
   - an in-process background execution + a DB-backed job/status row (no new infra, but execution does not survive a process restart — acceptable for an on-demand admin op, not for guaranteed delivery).
   This is the primary gate: **do not build the async surface until the queue-vs-in-process question is settled.**

2. **Reuse the production extractor, do not port the script.** The script in PR #137 re-implements the precedence logic but drops guards that [`BasePlatformPerformanceExtractor`](../../apps/erify_api/src/orchestration/fact-extraction/extractors/platform-performance-extractors.ts) documents as load-bearing: decimal scale rounding (idempotency), precision/Int4 range guards (`value_out_of_range`), string trim, `showId` cross-check, and atomic per-metric `metadata` merge. A service that re-derives facts and routes them through the existing extractor / `ShowPlatformService.updatePerformanceMetric` path stays byte-for-byte consistent with live ingestion. Extract a shared core from the extractor rather than maintaining a second copy.

3. **N+1 in the script must not carry over.** Bulk-resolve `ShowPlatform` rows for the range in one round-trip (the live `fact-extraction.service` already does this) instead of `findFirst` per content key.

4. **Strict typing.** A service cannot use the script's `prisma: any` / `as any`; it must follow the three-tier schema + repository/service separation and define request/response Zod schemas in `@eridu/api-types/performance`.

5. **Concurrency with live ingestion.** Whole-blob `metadata` replacement (as in the script) is unsafe against concurrent live writes; the atomic per-metric merge path (constraint 2) resolves this.

## Proposed Shape (when promoted)

- **API** (`@eridu/api-types/performance`): `rebackfillRequestSchema` (`start_date`, `end_date`, `dry_run`), `rebackfillResponseSchema` (token + status, or inline summary counts for dry-run).
- **Controller**: `POST /studios/:studioId/performance/backfill` on the studio-performance boundary, `@StudioProtected([ADMIN, MANAGER])`.
- **Service** `StudioPerformanceBackfillService`: resolve studio shows in `[start, end]` by show date → their `ShowPlatform`s + bound completed/review tasks → route each hydrated performance fact through the shared extractor core → aggregate processed/written/skipped.
- **Status** (if async): DB-backed job row (`status`, counts, range, requested_by) + `GET .../backfill/:token`.
- **Frontend** (`erify_studios` `/performance`): a "Re-backfill performance" manager action — date-range picker, preview (dry-run) summary, confirm-to-apply, status polling. Mirror the existing studio list/refresh patterns.

## Verification Gap (local)

The current local seed cannot exercise this path: 0 tasks carry v2 hydrated `:platform:` content keys, and the `report-simulation` seed writes plain field-id keys with `shared_field_key` rather than `system_fact_key` + hydrated keys. Any build (or even verifying the existing script writes records) first needs a seed/fixture that produces real hydrated performance submissions, or a run against a DB that already has them.

## Decision Gates for Promotion

- A concrete operator need to self-serve range corrections (support tickets / repeated manual script runs), **and**
- The async mechanism is decided (BullMQ promoted, or in-process + DB job row accepted), **and**
- A shared extractor core is available (or its extraction is in scope), **and**
- Seed/fixture support for hydrated performance submissions exists so the path is testable.

## Open Questions

- Range semantics for shows spanning a boundary or with no completed task — skip or partial?
- Should preview surface a per-show / per-metric breakdown, or only aggregate counts?
- Retention/visibility of past re-backfill runs (audit trail vs ephemeral).

---

## Prerequisite: getting performance data flowing at all (investigated 2026-06-07)

> **Status: ✅ Shipped to prod (PR #137, 2026-06-07).** Both tracks below are done — the admin-triggered re-backfill *service* (top of this doc) remains the deferred topic. Track A used the [template-system-fact-migration skill](../../.agent/skills/template-system-fact-migration/SKILL.md); Track B is `scripts/backfill-performance-from-submissions.ts`.

The re-backfill *service* above was moot until performance data actually lands on `ShowPlatform`. A DB investigation showed it did not, and the PR 21.9 hydrated-key script alone could not help, because real submissions are **show-scoped**, not the per-platform `<fieldId>:platform:<uid>` hydrated keys that script expects.

### Where performance is captured today (no `system_fact_key` bindings yet)

| Template | Fields | Shape |
| --- | --- | --- |
| **Post_production_check** (`ttpl_n6f7qAZQmPA4He6MOR-y`, the protected source) | `GMV`, `View`, `CTR`, `CTO` number fields | one value **per show** |
| **Moderator workflows** (~50 brand templates) | `gmv_l1..l8`, `views_l1..l8`, `ctr_l1..l8`, `cto_l1..l8`, `ads_cost`, `show_gpm` | **per-loop** (8 × 15-min) |
| Pre_production / On_air | none | — |

Two structural facts: **every task targets `SHOW`, never a platform**; **shows have 1 platform (~80%) or 2 (~20%)**. Verified value semantics: `gmv_l*` is **cumulative** (total = last non-empty loop, NOT a sum); `views_l*` is per-loop concurrent (non-monotonic); `ctr/cto_l*` are per-loop rates.

The core mismatch: capture is per-show / per-loop, but the model + extractor are per-`ShowPlatform`. The hydration framework is the bridge (a `platform`-scoped fact field renders one input per platform at form time), but existing templates have no bindings and existing content is show-scoped.

### Track A — Template binding (going forward) — ✅ SHIPPED

Bound **Post_production_check only**: its `GMV/View/CTR/CTO` → `show_platform_gmv / _view_count / _ctr / _cto` with **`platform` scope**. The form hydrates one input per platform → operator enters per-platform → the existing extractor writes the authoritative (protected) value on approval. Resolves 1- and 2-platform shows with zero ambiguity (attribution happens at entry). Moderator loop-8 fields are intentionally left unbound (8 loops × 4 metrics don't map to one platform fact). Applied via the [template-system-fact-migration skill](../../.agent/skills/template-system-fact-migration/SKILL.md)'s `bind_template_fact` SQL (idempotent, version-bumps + snapshots). Templates are immutable snapshots, so this affects only tasks generated from the new version.

### Track B — Backfill existing shows (derivation-aware; a DIFFERENT job from the 21.9 script) — ✅ SHIPPED

- **Derive** show-level value: GMV = last non-empty loop (post-production `GMV` wins on precedence when present); **viewer_count = peak (max across loops)** (decision); ctr/cto = last non-empty loop *(confirm)*.
- **Attribute:** 1-platform shows → assign to the single platform (unambiguous, automatable, ~88% of submitted tasks). **2-platform shows → skip + flag for manual per-platform entry** via the hydrated post-production form (decision); do not guess a revenue split.
- Write through the **real extractor path** (precedence, scale rounding, range guards, provenance) — not the divergent standalone script.

### Sequencing

1. Track A first (bind Post_production_check) so new shows self-populate.
2. Track B as the one-off historical migration for already-submitted shows (1-platform auto, 2-platform manual).
3. Only then is the admin re-backfill *service* (top of this doc) a useful operator tool, layered on the same derivation core.

Note: on prod, post-production tasks **are** populated (750 with GMV at rollout), so the backfill used post-production as the authoritative source (loop-8 as fallback). Post-production field ids differ across snapshot versions, so the backfill resolves them by label per snapshot.
