---
name: studio-show-management-patterns
description: Studio Show Management (feat/phase4-1e-show-management-design, PR #36) — full multi-cycle review history, backend+frontend, final APPROVED state
metadata:
  type: project
---

## Final state (sixth review cycle, 2026-04-05/06, 702/702 tests) — APPROVED
All prior blocking issues resolved. Remaining deferred items (non-blocking):
1. `findByUidAndStudioUid` on `ShowRepository` lacks `// Engineering decision:` comment (compound studio-scope filter
   with generic include parameter — justifiable, undocumented).
2. `Show` model still missing `version` field (last-write-wins by design decision).
3. `getShowLookups` endpoint hard-caps at 200 records with no search on clients/platforms — silently truncates for
   large datasets.

## Backend persistence
- `hardDeleteByShowId` (task-target.repository.ts) / `hardDeleteByIds` (task.repository.ts) — use `this.delegate`
  (txHost) correctly (earlier notes claiming `this.prisma` direct use were INCORRECT; fixed before 5th cycle). Intent
  (pre-start disposable-state cleanup) documented in `STUDIO_SHOW_MANAGEMENT.md` line 64; inline
  `// Engineering decision:` comment still missing from the repo code itself — WARNING.
- `findByShowAndPlatform` (ShowPlatformRepository) and `findPaginatedWithTaskSummary` (ShowRepository, complex
  multi-filter OR/date-range/boolean-join `where` builder) both lack `// Engineering decision:` comments — WARNING,
  pre-existing pattern debt not introduced by this PR.
- Thin-wrapper cleanup applied (2026-04-04): removed `ShowRepository.findByName/findActiveShows/findShowsByClient/
  findShowsByStudioRoom`, `ShowPlatformRepository.findByShow/findByPlatform`,
  `TaskTargetRepository.findByShowId/findAllByShowId/findByTaskId` — services now call `findMany` directly. Kept with
  justification: `findShowsByDateRange` (two-sided date bound), `TaskTargetRepository.findByShowIds` (cross-model join
  filter on `task.deletedAt`). Service method names/signatures unchanged — only internals moved to `findMany`.
- `ShowWithPayload<T>` defined in `show.schema.ts` (schema layer, Prisma-ok); management service imports as
  `import type` for a PRIVATE method return type only — accepted. `ShowCreateData`/`ShowUpdateData` type aliases
  (`Parameters<ShowRepository['create'/'update']>[N]`) effectively alias Prisma input types without importing Prisma
  directly, used only in private builder methods — accepted gray area. Private builders construct Prisma relation
  objects (`{ connect: { uid } }`) inside the service — accepted since not in public signatures.
- `StudioShowManagementService` injects `ShowRepository` directly alongside `ShowService`, calling
  `showRepository.update`/`findByUidAndStudioUid` directly to avoid extra `findShowOrThrow` round-trips — intentional
  optimization, accepted gray area for management/orchestration services.
- `publishingService`: `matchingShows` query (no `deletedAt` filter) finds all shows by clientId+externalId globally,
  safe because `@@unique([clientId, externalId])` guarantees at most one row. `currentScheduleShows` (with
  `deletedAt: null`) finds shows in the current schedule only. Used separately and correctly.
- Deleted show restored via schedule publish (`wasDeleted=true`) does NOT call `resumeSoftDeletedTasksAndTargets` —
  intentional, deleted shows start a new lifecycle. Only `wasCancelled` triggers task resumption.
- Schedule status does NOT block show CRUD — deliberate policy. `ensureScheduleBelongsToStudioAndClient` validates
  ownership (studio+client) only, not status. This guard (added to also check `schedule.client.uid` against
  `dto.clientId`) is a good security addition — but broke a test mock missing `client: { uid: 'cli_1' }` in one case
  (fixed).
- `ScheduleRepository.findActiveByStudioUid` uses `this.prisma` directly — acceptable, read-only, never in a
  transaction. `ScheduleService.listActiveSchedulesByStudioUid` is a service-level named method wrapping `findMany`
  with a flat `where` — correct pattern (service-level, not repository-level, so no proliferation violation).

## Frontend
- `studioShowDetailDto` uses `.pipe(studioShowDetailSchema as any)` — Zod 4 `.extend()` breaks pipe-compatibility due
  to internal branded types; the `as any` is intentional and documented in a comment. Accepted.
- Two form schemas resolve the orphan-show edit UX bug: `studioShowCreateFormSchema` (schedule_id required,
  `startsWith(UID_PREFIXES.SCHEDULE)`) vs `studioShowEditFormSchema` (schedule_id optional, empty string allowed).
  Submit handler strips `schedule_id` entirely (not `null`) when editing an orphan show so the backend's `undefined`
  path preserves the existing (absent) schedule association. RESOLVED, was a blocking bug in an earlier cycle.
- `useUpdateStudioShow` does NOT invalidate `showLookupsKeys` on success; `useCreateStudioShow` does — intentional,
  creating may add to lookup lists, updating doesn't change lookup data.
- `useDeleteStudioShow` was MISSING `queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) })`
  — `onSuccess` only called `removeQueries` on the detail key, so the deleted row stayed in the table. Real runtime
  bug, flagged and expected fixed.
- `useStudioShowStatusOptions` intentionally ignores the search string when calling `getShowStatuses` (finite set,
  backend has no name filter, filtering is client-side via `filterOptions()`). A test asserting `{ name: 'live',
  limit: 20 }` was WRONG — should assert `{ limit: 10 }` (DEFAULT_LOOKUP_LIMIT only).
- `useStudioSearchQuery` shared helper correctly collects `search` state into `queryKey` and forwards `signal` from
  `queryFn` context — all 7 exported lookup hooks use it correctly.
- Route/sidebar: parent layout `shows.tsx` wraps `Outlet` with `StudioRouteGuard(routeKey="shows")`; child page
  renders full CRUD. Sidebar `shows`/`show-operations` entries and the route guard reference the same
  `hasStudioRouteAccess(role, 'shows')` policy source — single-origin, correct.
- `invalidateStudioTaskQueries` uses `refetchType: 'active'` on show-task invalidation — correct, avoids ghost fetches
  on non-mounted queries.
- `getMutationErrorMessage` (`get-mutation-error-message.ts`) is a clean shared helper — good pattern candidate for
  extraction to shared `lib/` if other features need it.
