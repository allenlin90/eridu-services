# Ideation: erify_studios Route Query Optimization

> **Status**: Deferred from route/data-loading investigation
> **Origin**: `erify_studios` query audit (2026-03-19)
> **Related**: [task report FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [task reports builder route](../../apps/erify_studios/src/routes/studios/$studioId/task-reports/builder.tsx), [shows route](../../apps/erify_studios/src/routes/studios/$studioId/shows/index.tsx)

## What

Introduce a route-aware query orchestration pattern in `apps/erify_studios` to reduce redundant requests, remove route-level fetch duplication, and improve deep-link load behavior.

This would focus on two layers:

1. **Route loaders for first-paint data** using TanStack Router + React Query prefetching.
2. **Page-level query consolidation** so each route fetches the minimum set of datasets once, then passes them down instead of re-querying in child components.

## Why It Was Considered

- `apps/erify_studios` currently has no route loaders or `ensureQueryData` usage, so most pages wait until render before data fetching begins.
- The task report builder currently issues duplicate source-discovery queries for nearly the same scope:
  - one query without `source_templates`
  - one query with full scope
- `report-scope-filters.tsx` independently fetches show types, show standards, and clients, which increases request fan-out for the builder route.
- The shows landing route fetches:
  - shift alignment summary
  - a separate `getStudioShows(...limit=1)` request just to read `meta.total`
  - the actual paginated show list
  - lookup data for filter options
- The show tasks route deep-link still fetches show detail, task list, and memberships after mount instead of preloading the critical page data at the route boundary.

## Why It Was Deferred

1. **This is a cross-cutting frontend pattern change.** The repo has multiple route families that currently fetch in component bodies. Rolling out loaders without a shared pattern would create inconsistent implementations.
2. **Some redundancy is caused by API shape, not only FE composition.** For example, the report builder may need a backend response shape that can satisfy both template options and available-column discovery from one request.
3. **The current behavior is functionally correct.** The problem is avoidable latency and extra request volume, not correctness, so it should be promoted when the team is ready to standardize the route-data layer.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Initial navigation to a studio route consistently triggers **4+ HTTP requests** before the page is usable.
2. Deep-link routes like show tasks or report builder show visible loading churn that can be removed with route prefetching.
3. Another reporting or builder-style feature is added, making the current per-component query pattern too expensive to maintain.
4. The team decides to adopt TanStack Router loaders as a standard for first-paint route data.

## Implementation Notes (Preserved Context)

### Candidate rollout order

1. **`/studios/$studioId/task-reports/builder`**
   - Prefetch saved definition in the route loader when `definition_id` is present.
   - Replace the two `useTaskReportSources` calls with one canonical page query if the response can satisfy both:
     - source template options
     - available column catalog
   - If one endpoint cannot satisfy both cases cleanly, add a dedicated backend shape rather than keeping parallel near-duplicate FE requests.

2. **`/studios/$studioId/shows/$showId/tasks`**
   - Prefetch:
     - show detail
     - show task list
     - first-page memberships lookup
   - Hydrate page hooks from loader data so deep links paint with populated cache.

3. **`/studios/$studioId/task-templates/new` and `/studios/$studioId/task-templates/$templateId`**
   - Prefetch shared fields in the route loader.
   - On edit route, also prefetch template detail.
   - Keep `refetchOnMount: 'always'` only where freshness is explicitly required.

4. **`/studios/$studioId/shows`**
   - Stop using a separate show-list request only to derive scope total if the readiness endpoint can return `show_count`.
   - Keep the list request for the table and collapse summary/count concerns into the readiness payload when possible.

### Concrete hotspots discovered

- `report-builder.tsx`
  - duplicate source-discovery query pattern
- `report-scope-filters.tsx`
  - three independent lookup queries
- `shows/index.tsx`
  - separate scope-total query plus list query
- `use-studio-show-tasks-page-data.ts`
  - page data starts only after mount instead of route prefetch

### Proposed FE pattern

- Add route-level loader helpers that accept `queryClient`.
- Use shared query-key factories only; avoid ad hoc array literals in routes.
- For route-critical data, prefer:
  - loader prefetch
  - `useSuspenseQuery` or `useQuery` with warm cache
  - child components receiving prepared data/ids instead of issuing independent lookups

### Proposed API follow-ups

- Add a combined report-builder lookups endpoint if the current split causes unavoidable fan-out.
- Consider extending readiness summary endpoints to include `show_count` so the shows route does not need a second list-derived count query.

### Verification items (when promoted)

- Measure per-route request count before and after on:
  - report builder
  - show tasks
  - shows landing page
- Confirm route loader cache hydration eliminates blank first render on deep links.
- Confirm query invalidation still works after moving prefetch responsibility to the route boundary.
- Confirm manual refresh actions still refresh all required datasets without stale UI.
