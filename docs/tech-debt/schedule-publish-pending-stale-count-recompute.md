# Tech Debt: Pending-Stale-Conflict Count Recomputes the Full Result Set

## Current Issue

`AuditRepository.countPendingStaleConflictsForStudio` (`apps/erify_api/src/models/audit/audit.repository.ts`) has no DB-side count: it delegates to the same private `pendingStaleConflictsForStudio` helper as the list and returns `.length`. That helper fetches every latest-per-show `stale_conflict` `AuditTarget` row for the studio (Prisma `distinct` + `orderBy`), then filters to `lifecycle: 'opened'` (and any change-time/publish-run filters) in application code.

## Why It Matters

Cost scales with the studio's total historical stale-conflict row count, not the page size. One KPI-summary render of `/schedule-publish-impacts` triggers the computation twice — once for the list request, once for the summary's count — because the list and summary are separate HTTP requests sharing the same builders.

This is a deliberate correctness trade-off, not an oversight: "latest row per show, then keep only `lifecycle: 'opened'`" cannot be expressed as a plain Prisma `count({ where })`, and filtering before the latest-per-show computation can misreport an already-resolved conflict as pending (see the in-code comment on `pendingStaleConflictsForStudio`). The queue is also expected to stay small (see `schedule-publish-impacts-list-not-merge-sorted.md` for the volume rationale).

## Desired Direction

Push the latest-per-show + lifecycle filter into the database with a raw-SQL `SELECT count(*)` over a `DISTINCT ON (show_id) ... ORDER BY show_id, created_at DESC, id DESC` subquery (referencing `@@map` table names per the repo raw-SQL rule, with a regression test asserting the literal table name), and share it between the list's `total` and the summary count.

## Trigger To Fix

- A studio's cumulative stale-conflict audit history grows large enough that the impacts list or summary endpoint shows measurable latency.
- The merge-sorted pagination rework in `schedule-publish-impacts-list-not-merge-sorted.md` happens — a single purpose-built query should solve both at once.

## Acceptance Criteria

- Pending-stale count is computed in the database without materializing every historical row in application memory, and list/summary still agree with the latest-per-show `lifecycle: 'opened'` semantics (existing regression tests keep passing).

## Related Context

[`schedule-publish-impacts-list-not-merge-sorted.md`](./schedule-publish-impacts-list-not-merge-sorted.md) (same code path, same volume rationale), [`apps/erify_api/docs/SCHEDULE_CONTINUITY.md`](../../apps/erify_api/docs/SCHEDULE_CONTINUITY.md) § Confirmed Show Review Queue.
