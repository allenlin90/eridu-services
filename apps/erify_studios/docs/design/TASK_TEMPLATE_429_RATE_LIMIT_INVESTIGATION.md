# Task Template 429 Investigation (Studios)

Date: 2026-03-14
Branch: `feat/task-template-rate-limit-audit`

## Scope

Investigated burst traffic against `GET /studios/:studioId/task-templates` that could trigger `429 Too Many Requests` when:

1. A user loads many infinite-scroll pages then switches routes quickly.
2. A user rapidly navigates in/out of task-template routes.
3. Bulk task generation dialog repeatedly opens/closes after draining all template pages.

## Baseline Method

Measured with deterministic request-flow reasoning from the current TanStack Query behavior and local hook-level tests:

- Global query default is `staleTime: 0`.
- Infinite query with N cached pages revalidates each cached page on remount/focus.
- Bulk picker infinite query drained all pages and revalidated on remount.

## Baseline vs Refactor Metrics

| Scenario | Baseline (before) | After refactor |
|---|---:|---:|
| Return to task-template list after loading 10 pages | ~10 revalidation requests | 1 revalidation request |
| Rapid route switch while list requests are in-flight | in-flight requests continue until completion | previous in-flight requests aborted via `signal` |
| Reopen bulk picker after fully draining pages | revalidates all cached pages again (N requests) | 0 automatic remount revalidation requests (unless invalidated) |

## Implemented Changes

- Added task-template query key factory and migrated list/detail/picker hooks.
- Added infinite-cache compaction to page 1 for list route unmount and manual refresh.
- Passed abort `signal` through task-template list API fetchers.
- Replaced broad query resets with targeted `setQueryData` / `setQueriesData` plus inactive-prefix invalidation.
- Bulk picker query now avoids mount/focus/reconnect multi-page revalidation; still drains once while open.
- Added global named throttle profiles (`default`, `readBurst`), custom tracker identity (`user.ext_id + ip`), and route-level read-burst override for studio task-template index.
- Added list `limit` hard cap (`max(100)`) in shared API schema.

## Expected UX and Protection Outcome

- UX: no visible stale-data regressions for normal list/detail flows.
- FE performance: avoids unnecessary N-page remount refetch bursts.
- API protection: strict default throttle remains for most endpoints while heavy-read endpoint uses dedicated read-burst profile.

