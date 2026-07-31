# Accepted: every report/records-detail request re-derives the day's current eligible set to resolve CURRENT vs STALE

**Status:** Accepted (low priority) · **Area:** `erify_api` Scene QC — `SceneQcReportService.getReport`, `SceneQcRecordsQueryService.getRecordDetail`
**Origin:** Scene QC Child PR 4 breakdown, OQ-42

## Context

`hasLaterRevision` cheaply yields `SUPERSEDED` (a single indexed count query). But when a confirmation revision is still the day's latest, distinguishing `CURRENT` from `STALE` requires re-running `SceneQcRepository.findEligibleShowsInWindow` + `.findReviewHeadsForShows` for the confirmation's own (immutable) window, then diffing against the confirmation's pinned item scope via `resolveSceneQcRevisionStatus`. Both `SceneQcReportService.getReport` and `SceneQcRecordsQueryService.getRecordDetail` do this independently — one extra pair of indexed reads per request.

## Why accepted (not fixed now)

- Reports and Records detail are not polled surfaces (§8.4 refresh policy: `staleTime: Infinity` for the report, no `refetchInterval` for Records) — this cost is paid once per user-initiated open, not on a timer.
- `SceneQcRepository.findEligibleShowsInWindow` caps the eligible-Show-per-operational-day projection at 500 rows, bounding the worst case.
- A cached/denormalized "confirmed scope status" would require either storing a derived flag on the confirmation row (contradicting the append-only, historically-immutable design of `SceneQcDailyConfirmation`) or a separate read-model table — real design work, not a query-level tweak.

## Suggested resolution

If reports become a frequently-loaded surface, or operational days routinely approach the 500-Show cap, consider a denormalized "is this revision still current" read-model refreshed on confirmation write and on the underlying Show/Review mutations that can invalidate it, rather than recomputing per request.

## Fix trigger

Revisit if report/Records-detail latency becomes visible in practice, or if the operational-day Show count routinely approaches the 500-row cap — whichever comes first.
