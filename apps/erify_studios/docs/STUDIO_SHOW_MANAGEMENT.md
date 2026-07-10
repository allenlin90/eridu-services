# Studio Show Management Frontend Reference

> **Status**: ✅ Implemented
> **Phase scope**: Phase 4 Wave 1+
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/features/studio-show-management.md`](../../../docs/features/studio-show-management.md)
> **Depends on**: backend studio show management endpoints, existing task-setup flows

## Purpose

Technical reference for the shipped studio show-management UI, including the dedicated CRUD route, dialog-based create/edit/delete flows, studio-safe searchable lookups, and the operations page for task readiness, show actuals, and current-view export.

## Route And Access

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/shows` | Show lifecycle CRUD page | `ADMIN`, `MANAGER` |
| `/studios/$studioId/task-setup` | Readiness, bulk generation, assignment, show actuals, and current-view export operations | `ADMIN`, `MANAGER` |

Access rules:

- both routes use the shared `shows` policy key
- `ADMIN` and `MANAGER` can create and update shows
- delete affordance is shown to `ADMIN` only
- `MEMBER`, `DESIGNER`, `MODERATION_MANAGER`, and `TALENT_MANAGER` remain outside the CRUD route

## Key Frontend Modules

- `src/routes/studios/$studioId/shows.tsx`
- `src/routes/studios/$studioId/shows/index.tsx`
- `src/features/studio-shows/hooks/use-studio-show-management.ts`
- `src/features/studio-shows/hooks/use-studio-show-form-lookup-options.ts`
- `src/features/studio-shows/components/studio-show-management-columns.tsx`
- `src/features/studio-shows/components/studio-show-management-form.tsx`
- `src/features/studio-shows/api/get-studio-show.ts`
- `src/features/studio-shows/api/get-studio-shows.ts`

## Data And Query Model

- list/detail queries stay shared with the existing studio show domain:
  - `studioShowsKeys`
  - `studioShowKeys`
- the CRUD page gets its own route/view-model hook: `useStudioShowManagement()`
- the operations page keeps its existing route/view-model hook: `useStudioShows()`
- show-level actuals are edited through the existing studio show update mutation (`PATCH /studios/:studioId/shows/:showId`); task-submission extraction may later write creator participation actuals to `ShowCreator`, platform stream/performance facts to `ShowPlatform`, and platform violations to child records
- the operations page supports `actuals_state=missing|complete` as URL-backed server filtering for the missing-actuals queue
- current-view export calls `getAllStudioShowsForExport()`, which pages through every result matching the current server-side filters, caps exports at 5000 rows, batches concurrent page fetches at 4 at a time (no `Promise.all` fan-out so a single click cannot burst dozens of requests), forwards `AbortSignal` and bails between batches when aborted, and serializes CSV/JSON through the shared `csv` and `file-download` primitives. The trigger button renders a `Loader2` spinner with "Exporting…" while pagination runs.
- shared `show-lookups` stays lightweight for list/filter surfaces; searchable schedule and room inputs use dedicated studio endpoints instead
- successful create/update/delete invalidates the shared studio show list family and task-related dependent queries via `invalidate-studio-task-queries.ts`

## CRUD Page Behavior

- the toolbar owns URL-backed search, pagination, and lifecycle-oriented filters
- `schedule_name` supports the `orphans` shortcut to surface shows without schedules
- create/edit runs in dialogs from the shows page rather than reusing the operations route
- the form exposes:
  - create-only optional `external_id`
  - required schedule selection in normal UI flow
  - studio-safe searchable lookups for client, schedule, room, show type, status, standard, and platforms
- edit mode can still repair legacy orphan shows by clearing or reassigning `schedule_id`
- delete uses an admin-only confirm dialog; backend remains the source of truth for the pre-start rule

## UX Rules

- keep `task-setup` focused on readiness, task generation, assignment, show actuals, and operational export
- do not mix admin-only `/system/shows` assumptions into the studio CRUD page
- keep route guard and sidebar visibility aligned through the shared access-policy source
- keep schedule search remote and documented; no dead local-only search affordances
- keep show-level actuals scoped to `Show.actual_start_time` / `Show.actual_end_time`; creator participation actuals, platform stream/performance facts, and platform violation records are separate task-input workstream concerns and must not be folded into the show update payload

## Schedule Publish Impacts

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/schedule-publish-impacts` | Reviews upcoming and stale-conflict impacts of a Google Sheets schedule publish | `ADMIN`, `MANAGER` |

`stale_conflict` rows — sheet edits the backend held back because the show already has recorded actuals, per `apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md` § Stale Conflict Rule — get a `Review` action alongside the two existing FYI impact kinds (`confirmed_future_updated`, `confirmed_future_pending_resolution`), which stay read-only. `Review` opens a docked panel showing the `held_back` diff and a required-reason Apply/Dismiss form.

### Key Frontend Modules

- `src/components/responsive-sheet.tsx` — desktop right-docked sheet / mobile bottom drawer swap, sibling to `responsive-dialog.tsx`
- `src/features/shows/api/resolve-schedule-conflict.ts` — `useResolveScheduleConflict` mutation hook
- `src/features/shows/components/held-back-diff.tsx` — pure presentational diff renderer
- `src/features/shows/components/schedule-conflict-review-panel.tsx` — hosts the diff, reason field, and Apply/Dismiss actions inside `ResponsiveSheet`

### UX Rules

- Apply/Dismiss stay disabled until the reason field is non-empty; the reason is recorded on the show's audit history
- a resolved `stale_conflict` row stays visible, dimmed (`getRowClassName` on the shared `DataTable`), rather than disappearing immediately — the planner sees the outcome of their action
- `SHOW_NO_LONGER_ELIGIBLE` shows an inline banner and does not close the panel (the conflict was auto-resolved server-side); the list is invalidated rather than cache-patched since there is no updated row to patch with
- `held_back.show_creators[]`/`show_platforms[]` render a bare creator/platform uid, not a name — the shipped payload carries no display name for these entries (tracked in [`docs/tech-debt/schedule-conflict-held-back-creators-platforms-no-display-name.md`](../../../docs/tech-debt/schedule-conflict-held-back-creators-platforms-no-display-name.md)); a uid is safe to display per this app's external-ID strategy, just not human-readable
