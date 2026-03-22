# Studios Internal Read Traffic Hardening

## Purpose

Reduce easy-to-trigger `429 Too Many Requests` failures during normal `erify_studios` navigation without removing backend protection.

## What Shipped

- `erify_studios` default TanStack Query policy now keeps interactive reads warm for `20s` instead of treating all cached data as instantly stale.
- Global query defaults no longer refetch on window focus or reconnect for normal interactive reads.
- `429` query failures now surface a single deduped user-facing message instead of repeated generic query-error noise.
- Aborted route-change requests are treated as expected cancellations, not errors.
- Priority studios and `/me` read fetchers now accept `AbortSignal` and forward it to Axios so route changes cancel in-flight requests.
- Near-real-time `/me` reads keep a shorter freshness window (`5s`) and still refetch on window focus/reconnect.
- Backend internal read endpoints that experience burst traffic now opt into `@ReadBurstThrottle()` instead of staying on the strict global default throttle profile.

## Canonical Code References

### Frontend

- Query defaults and 429/cancel handling:
  - `apps/erify_studios/src/lib/api/query-client.ts`
- Signal-aware studios list/read fetchers:
  - `apps/erify_studios/src/features/studio-shows/api/get-studio-shows.ts`
  - `apps/erify_studios/src/features/studio-shifts/api/get-studio-shifts.ts`
  - `apps/erify_studios/src/features/tasks/api/get-studio-tasks.ts`
  - `apps/erify_studios/src/features/tasks/api/get-my-tasks.ts`
  - `apps/erify_studios/src/features/studio-shifts/api/get-my-shifts.ts`
- Signal-aware query hooks:
  - `apps/erify_studios/src/features/studio-shows/hooks/use-studio-shows.ts`
  - `apps/erify_studios/src/features/studio-show-creators/hooks/use-creator-mapping-shows.ts`
  - `apps/erify_studios/src/features/studio-shifts/hooks/use-studio-shifts.ts`
  - `apps/erify_studios/src/features/tasks/hooks/use-my-tasks.ts`
  - `apps/erify_studios/src/features/tasks/hooks/use-studio-tasks.ts`
- Shows route scope-count query now forwards cancellation:
  - `apps/erify_studios/src/routes/studios/$studioId/shows/index.tsx`

### Backend

- Throttle profile definition:
  - `apps/erify_api/src/app.module.ts`
  - `apps/erify_api/src/lib/guards/read-burst-throttle.decorator.ts`
- Studios internal read endpoints now using `@ReadBurstThrottle()`:
  - `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`
  - `apps/erify_api/src/studios/studio-task/studio-task.controller.ts`
  - `apps/erify_api/src/studios/studio-shift/studio-shift.controller.ts`
  - `apps/erify_api/src/studios/studio-shift/shift-calendar.controller.ts`
  - `apps/erify_api/src/studios/studio-lookup/studio-lookup.controller.ts`
  - `apps/erify_api/src/studios/studio-creator/studio-creator.controller.ts`
  - `apps/erify_api/src/studios/studio-task-report/studio-task-report.controller.ts`
  - `apps/erify_api/src/studios/studio-settings/studio-shared-fields.controller.ts`
  - `apps/erify_api/src/me/me-task/me-task.controller.ts`
  - `apps/erify_api/src/me/shifts/shifts.controller.ts`

## Rules

1. Do not bypass rate limiting based on `Origin`. Browser origin is not a trusted server-side identity signal in this stack.
2. Do not skip throttling entirely for internal reads. Use a named profile such as `readBurst`.
3. For navigation-heavy query hooks, always forward TanStack Query `signal` to the API fetcher.
4. Treat reference/lookup data and operational reads differently:
   - lookup/reference data can stay stale longer,
   - `/me` and other operational views should keep a shorter freshness window.
5. If a studios page starts triggering 429s again, first inspect remount/refetch behavior before raising throttle limits.
