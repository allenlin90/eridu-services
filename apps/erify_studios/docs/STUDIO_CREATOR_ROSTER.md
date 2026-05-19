# Studio Creator Roster Frontend Reference

> **Status**: ✅ Implemented
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/features/studio-creator-roster.md`](../../../docs/features/studio-creator-roster.md)
> **Depends on**: Sidebar redesign ✅ pattern available, backend roster write APIs ✅

## Purpose

Technical reference for the shipped studio creator roster page, including route access, URL-backed table state, query invalidation, admin-only mutations, and 409 conflict handling.

## Route And Access

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/creators` | Creator roster CRUD surface | `ADMIN` roster write, `ADMIN` + `MANAGER` + `TALENT_MANAGER` read |
| `/studios/$studioId/creators/$creatorId/compensations` | Per-creator date-range compensation review with per-show edit dialog | `ADMIN` + `MANAGER` |

Route guard requirements:

- add `creatorRoster` to `src/lib/constants/studio-route-access.ts`
- roles: `[ADMIN, MANAGER, TALENT_MANAGER]`
- add sidebar item under the **People** group beside **Members**
- hide roster write actions and add button for non-admin roles, but keep compensation data visible
- expose a "Review Compensation" action that navigates to `/studios/$studioId/creators/$creatorId/compensations` for `ADMIN` and `MANAGER`; `TALENT_MANAGER` remains read-only
- the compensation route has its own `creatorCompensations` route-access key restricted to `ADMIN` and `MANAGER`

## File Structure

Follow the shipped member-roster split instead of a single route file:

- `src/routes/studios/$studioId/creators.tsx` => layout shell + `creatorRoster` route guard wrapping `<Outlet />`
- `src/routes/studios/$studioId/creators/index.tsx` => roster list page, search validation, page composition
- `src/routes/studios/$studioId/creators/$creatorId/compensations.tsx` => dedicated compensation review page with its own `creatorCompensations` guard
- `src/features/studio-creator-roster/hooks/use-studio-creator-roster.ts` => query wiring, URL-backed table state, mutation helpers
- `src/features/studio-creator-roster/config/studio-creator-roster-search-schema.ts` => route/search schema
- `src/features/studio-creator-roster/config/studio-creator-roster-columns.tsx` => table columns
- `src/features/studio-creator-roster/components/studio-creator-roster-table.tsx` => table shell
- `src/features/studio-creator-roster/components/add-studio-creator-dialog.tsx`
- `src/features/studio-creator-roster/components/edit-studio-creator-dialog.tsx`
- `src/features/studio-creator-roster/components/studio-creator-actions-cell.tsx`
- `src/features/studio-creator-roster/components/creator-compensations-view.tsx` => presentational view shared by the route shell and tests
- `src/features/studio-creator-roster/api/*` => list/create/update API declarations and query keys

## Table And Search State

- use `useTableUrlState` for `page`, `limit`, search, and filter params
- match the member-roster route pattern with:
  - `DataTable`
  - `DataTableToolbar`
  - `DataTablePagination`
- supported URL-backed filters in v1:
  - `search`
  - `is_active`
  - `default_rate_type`
- default list view shows active creators only

Columns:

- creator name
- alias name
- default rate
- compensation type
- commission rate
- active badge
- actions (`ADMIN` roster edit; `ADMIN` and `MANAGER` "Review Compensation" link to the dedicated route)

## Data And Query Model

- query key family: `studioCreatorRosterKeys`
- GET list uses URL-backed pagination/filter state and forwards `AbortSignal`
- POST/PATCH mutations invalidate:
  - creator roster list family
  - creator catalog list family
  - creator availability list family
- use shared API types from `@eridu/api-types/studio-creators`
- PATCH flows must send `version` and treat 409 as a refetch-and-review conflict path
- compensation review uses `GET /studios/:studioId/creators/:creatorId/compensations`
- assignment-term edits from review use `PATCH /studios/:studioId/shows/:showId/creators/:showCreatorId` and invalidate show creator list/summary caches

## Dialog Behavior

### Add dialog

- uses `GET /studios/:studioId/creators/catalog?include_rostered=true`
- shows only `roster_state === 'NONE' || roster_state === 'INACTIVE'`
- labels `INACTIVE` results as reactivation candidates
- form fields:
  - creator
  - `default_rate`
  - `default_rate_type`
  - `default_commission_rate`
- POST does not expose an active toggle

### Edit dialog

- opens from the actions cell for admins only
- edits:
  - `default_rate`
  - `default_rate_type`
  - `default_commission_rate`
  - `is_active`
- sends `version` on PATCH
- on 409:
  - refetch roster list
  - replace stale assumptions with fresh server state or prompt reload
  - show conflict feedback instead of silent overwrite

### Compensation review route

- opens from the row actions cell for admins and managers via TanStack `Link`
- dedicated route at `/studios/$studioId/creators/$creatorId/compensations` (mirror of the per-member route)
- URL-backed `date_from` / `date_to` (YYYY-MM-DD); default range is today through 30 days ahead
- shows per-show base, adjustment, total, and unresolved reason
- per-row edit action still opens the `ShowCreatorCompensationDialog` for that `ShowCreator` row (inline modal, not a sub-route)
- assignment-term save edits only the show assignment snapshot, not `StudioCreator` defaults; the route refetches on dialog close

## UX Rules

- hide roster write actions for non-admin roles, but keep compensation fields visible
- keep manager compensation actions scoped to per-show assignment snapshots and line items
- keep creator-first naming and identifiers in UI copy
- do not expose raw `StudioCreator` bigint IDs; wire contract stays on UIDs only
- use the existing roster/table visual patterns; do not invent a one-off creator page layout
- show inactive state in the table when the filter is expanded beyond the default active view

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: add, restore inactive, update defaults, version conflict, manager/talent-manager read-only behavior, inactive creator removed from assignment discovery
