# Accepted: Scene QC daily summary/items each re-run the full evidence resolver, and items paginates in memory

**Status:** Accepted (low priority) · **Area:** `erify_api` Scene QC — `SceneQcQueryService.getDailySummary` / `.listDailyItems`
**Origin:** PR #348 review discussion (Scene QC Child PR 3)

## Context

`getDailySummary` and `listDailyItems` both call `SceneQcEvidenceResolver.resolveForShows` independently. Opening the Daily Review page fires it twice on first load (once from each query), and every filter change or page turn on `items` re-runs it again. Each call is a `task.findMany` that pulls the `content` JSON for every eligible Show's Tasks for the operational day.

`listDailyItems` also applies its `review_state` filter and pagination (`filtered.slice(start, start + limit)`) **after** loading and evidence-resolving the full eligible-Show set for the day — the query-level `limit` only bounds the response, not the work done to produce it.

`SceneQcRepository.findEligibleShowsInWindow` caps the eligible-Show-per-day projection at 500 rows (`MAX_ELIGIBLE_SHOWS_PER_WINDOW`, throwing a loud `422` above that), which bounds the blast radius of both issues today.

## Why accepted (not fixed now)

- Shows-per-operational-day is small in practice (tens), so the duplicate resolution and in-memory pagination are wasted work, not a correctness or scaling problem, at current volume.
- The 500-row cap means the worst case is bounded and fails loudly rather than degrading silently.
- `review_state=blocked`/`unreviewed`/`reviewed` classification depends on evidence resolution and review-head state, neither of which is a SQL-expressible predicate against the current schema — a proper fix likely means denormalizing "has evidence" onto a queryable column (`SceneQcRepository.findClientIdsWithActiveProfile`-style bulk-read is the closest existing precedent) rather than a query-level tweak, which is real design work.

## Suggested resolution

When Show volume per operational day grows enough to matter (watch `MAX_ELIGIBLE_SHOWS_PER_WINDOW` near-misses in practice), either:

- cache/share one `resolveForShows` result across `summary` and `items` within a single request cycle, and/or
- denormalize evidence-presence (and possibly review state) onto a queryable projection so `review_state` filtering and pagination can happen in SQL instead of in memory.

## Fix trigger

Revisit if operational days routinely approach the 500-Show cap, or if `listDailyItems` latency becomes visible in practice — whichever comes first.
