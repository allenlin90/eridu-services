# Studio Show Management Frontend Reference

> **Status**: ✅ Implemented
> **Phase scope**: Phase 4 Wave 1+
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/features/studio-show-management.md`](../../../docs/features/studio-show-management.md)
> **Depends on**: backend studio show management endpoints, existing show-operations flows

## Purpose

Technical reference for the shipped studio show-management UI, including the dedicated CRUD route, dialog-based create/edit/delete flows, studio-safe searchable lookups, and the separation from the existing operations page.

## Route And Access

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/shows` | Show lifecycle CRUD page | `ADMIN`, `MANAGER` |
| `/studios/$studioId/show-operations` | Readiness, bulk generation, and assignment operations | `ADMIN`, `MANAGER` |

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

- keep `show-operations` focused on readiness, task generation, and assignment
- do not mix admin-only `/system/shows` assumptions into the studio CRUD page
- keep route guard and sidebar visibility aligned through the shared access-policy source
- keep schedule search remote and documented; no dead local-only search affordances
