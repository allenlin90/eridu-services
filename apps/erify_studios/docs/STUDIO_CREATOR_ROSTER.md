# Studio Creator Roster Frontend Reference

> **Status**: ✅ Implemented
> **Phase scope**: Phase 4 Wave 1
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/features/studio-creator-roster.md`](../../../docs/features/studio-creator-roster.md)
> **Depends on**: Sidebar redesign ✅ pattern available, backend roster write APIs ✅

## Purpose

Technical reference for the shipped studio creator roster page, including route access, URL-backed table state, query invalidation, roster/default mutations, and 409 conflict handling.

> **PR 14a update**: per-creator editing moved from the `edit-studio-creator-dialog` modal to the dedicated **creator detail route** `/studios/$studioId/creators/$creatorId` (Profile + Compensation tabs). Editing creator roster defaults is allowed for **`ADMIN`, `MANAGER`, and `TALENT_MANAGER`**. See [`ENTITY_DETAIL_ROUTES.md`](./ENTITY_DETAIL_ROUTES.md).

## Route And Access

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/creators` | Creator roster list surface | `ADMIN` + `MANAGER` + `TALENT_MANAGER` roster/default write |
| `/studios/$studioId/creators/$creatorId` | Creator detail layout — **Profile** tab (edit roster defaults) | edit `ADMIN` + `MANAGER` + `TALENT_MANAGER` |
| `/studios/$studioId/creators/$creatorId/compensations` | **Compensation** tab — per-creator date-range review with per-show edit dialog | `ADMIN` + `MANAGER` |

Route guard requirements:

- add `creatorRoster` to `src/lib/constants/studio-route-access.ts`
- roles: `[ADMIN, MANAGER, TALENT_MANAGER]`
- add sidebar item under the **People** group beside **Members**
- show roster write actions and Add Creator for `ADMIN`, `MANAGER`, and `TALENT_MANAGER`
- expose a "Review Compensation" action that navigates to `/studios/$studioId/creators/$creatorId/compensations` for `ADMIN` and `MANAGER`; `TALENT_MANAGER` manages roster defaults but does not get the separate compensation review tab
- the compensation route has its own `creatorCompensations` route-access key restricted to `ADMIN` and `MANAGER`

## File Structure

Follow the shipped member-roster split instead of a single route file:

- `src/routes/studios/$studioId/creators.tsx` => layout shell + `creatorRoster` route guard wrapping `<Outlet />`
- `src/routes/studios/$studioId/creators/index.tsx` => roster list page, search validation, page composition
- `src/routes/studios/$studioId/creators/$creatorId/route.tsx` => creator detail layout (single-creator GET, header, `<Link>` tab strip, `<Outlet />`)
- `src/routes/studios/$studioId/creators/$creatorId/index.tsx` => **Defaults** tab (hosts `CreatorDefaultsForm`)
- `src/routes/studios/$studioId/creators/$creatorId/compensations.tsx` => **Compensation** tab (de-chromed view) with its own `creatorCompensations` guard
- `src/features/studio-creator-roster/hooks/use-studio-creator-roster.ts` => query wiring, URL-backed table state, mutation helpers
- `src/features/studio-creator-roster/config/studio-creator-roster-search-schema.ts` => route/search schema
- `src/features/studio-creator-roster/config/studio-creator-roster-columns.tsx` => table columns
- `src/features/studio-creator-roster/components/studio-creator-roster-table.tsx` => table shell
- `src/features/studio-creator-roster/components/add-studio-creator-dialog.tsx`
- `src/features/studio-creator-roster/components/creator-defaults-form.tsx` => roster defaults form hosted by the Defaults tab (replaces the retired `edit-studio-creator-dialog`)
- `src/features/studio-creator-roster/components/studio-creator-actions-cell.tsx`
- `src/features/studio-creator-roster/components/creator-compensations-view.tsx` => presentational view shared by the route shell and tests
- `src/features/studio-creator-roster/api/studio-creator-roster.ts` => list/detail/create/update API declarations and query keys (`detail` key added for the single-creator GET)
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
- actions (`ADMIN` + `MANAGER` + `TALENT_MANAGER` Edit → navigates to the creator detail route's Profile tab; `ADMIN` + `MANAGER` "Review Compensation" → Compensation tab)

## Data And Query Model

- query key family: `studioCreatorRosterKeys`
- GET list uses URL-backed pagination/filter state and forwards `AbortSignal`
- POST/PATCH mutations invalidate:
  - creator roster list family
  - creator catalog list family
  - creator availability list family
- use shared API types from `@eridu/api-types/studio-creators`
- PATCH flows must send `version` and treat 409 as a refetch-and-review conflict path
- creator detail hydrates via `GET /studios/:studioId/creators/:creatorId` (key `studioCreatorRosterKeys.detail`), invalidated on PATCH so the Defaults tab + header stay fresh
- compensation review uses `GET /studios/:studioId/creators/:creatorId/compensations`
- assignment-term edits from review use `PATCH /studios/:studioId/shows/:showId/creators/:showCreatorId` and invalidate show creator list/summary caches

## Dialog Behavior

### Add dialog

- uses `GET /studios/:studioId/creators/catalog?include_rostered=true`
- selectable combobox options are limited to `roster_state === 'NONE' || roster_state === 'INACTIVE'`
- `roster_state === 'ACTIVE'` matches render separately as a non-actionable "Already active in this studio" list (once a search term is entered) instead of being dropped from the response, so a search for an already-active creator doesn't fall through to the empty state and nudge the user toward creating a duplicate identity
- labels `INACTIVE` results as reactivation candidates
- form fields:
  - creator
  - `default_rate`
  - `default_rate_type`
  - `default_commission_rate`
- POST does not expose an active toggle

### Defaults tab (creator detail route)

- `CreatorDefaultsForm` on `/studios/$studioId/creators/$creatorId` (index tab); reached
  from the actions cell **Edit** action (navigation, not a modal)
- editable for `ADMIN` + `MANAGER` + `TALENT_MANAGER`
- edits:
  - `default_rate`
  - `default_rate_type`
  - `default_commission_rate`
  - `is_active`
- sends `version` on PATCH; on success stays on the page (toast + query invalidation
  refresh the detail/header)
- on 409:
  - refetch roster list + creator detail
  - replace stale assumptions with fresh server state or prompt reload
  - show conflict feedback instead of silent overwrite

### Compensation review route

- opens from the row actions cell for admins and managers via TanStack `Link`
- dedicated route at `/studios/$studioId/creators/$creatorId/compensations` (mirror of the per-member route)
- URL-backed `date_from` / `date_to` (YYYY-MM-DD); default range is today through 30 days ahead
- shows per-show base, adjustment, total, and unresolved reason
- per-row drill-in opens the show detail Compensation tab `/studios/$studioId/shows/$showId/compensation` for the source show (the standalone `/creator-mapping/$showId` route was retired in PR 21.7), where the creator compensation table is paired with visible client, platform, schedule, actuals, room, status, type, standard, and show UID context
- per-row edit action still opens the `ShowCreatorCompensationDialog` for that `ShowCreator` row (inline modal, not a sub-route)
- assignment-term save edits only the show assignment snapshot, not `StudioCreator` defaults; the route refetches on dialog close

## UX Rules

- show roster write actions for `ADMIN`, `MANAGER`, and `TALENT_MANAGER`
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
- Manual smoke: add, restore inactive, update defaults, version conflict, talent-manager roster/default write behavior, inactive creator removed from assignment discovery
