# Tech Debt: Schedule-Publish-Impacts List Pages Two Sources Independently, Not Merge-Sorted

## Current Issue

`StudioShowManagementService.listSchedulePublishImpacts` (`apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`) serves `confirmed_future_*` rows and `stale_conflict` rows from two separately-paginated queries (`AuditService.findSchedulePublishImpactsForStudio` and `AuditService.findPendingStaleConflictsForStudio`) and concatenates each page's results, rather than producing one true cross-kind page sorted and paginated as a single result set.

## Why It Matters

Each source is paginated correctly on its own, but a planner paging through the combined view (e.g. requesting page 2) can see an ordering that isn't a strict cross-kind sort — the two kinds' pages are stitched together rather than interleaved by a shared sort key. `total` is the sum of both sources' totals, so counts are accurate; only the row order at page boundaries can read as slightly off relative to a single true merge sort.

This is accepted as a known simplification rather than a defect: the design spec frames `stale_conflict` volume as "narrow, real-world-rare" (past show + populated actuals + a real incoming diff), so the queue is expected to stay small enough that this boundary imperfection is unlikely to be noticed in practice.

## Desired Direction

If `stale_conflict` volume grows enough to matter, replace the two independently-paginated queries with a single purpose-built query (or a read-model projection) that unions both sources and applies one shared sort key and `skip`/`take` across the combined set.

## Trigger To Fix

- `stale_conflict` volume grows enough that a planner actually observes a missing/duplicated row across a page boundary, or the queue routinely exceeds one page.
- The list surface is otherwise revisited (e.g. for `schedule-publish-sequential-audit-writes.md`'s batching work, which touches the same code path).

## Acceptance Criteria

- Paging through `listSchedulePublishImpacts` returns a single, correctly ordered cross-kind result set with no duplicate or skipped rows at page boundaries.

## Related Context

[`apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md`](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md) § Stale Conflict Rule, [`docs/superpowers/specs/2026-07-08-schedule-publish-actuals-aware-conflict-handling-design.md`](../superpowers/specs/2026-07-08-schedule-publish-actuals-aware-conflict-handling-design.md), [`schedule-publish-sequential-audit-writes.md`](./schedule-publish-sequential-audit-writes.md) (same code path, related batching gap).
