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
