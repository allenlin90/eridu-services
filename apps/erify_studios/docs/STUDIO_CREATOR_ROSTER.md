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
| `/studios/$studioId/creators` | Creator roster CRUD surface | `ADMIN` write, `MANAGER` + `TALENT_MANAGER` read |

Route guard requirements:

- add `creatorRoster` to `src/lib/constants/studio-route-access.ts`
- roles: `[ADMIN, MANAGER, TALENT_MANAGER]`
- add sidebar item under the **Creators** group before **Creator Mapping**
- hide row actions and add button for non-admin roles, but keep compensation data visible

## File Structure

Follow the shipped member-roster split instead of a single route file:

- `src/routes/studios/$studioId/creators.tsx` => route container, guard, search validation, page composition
- `src/features/studio-creator-roster/hooks/use-studio-creator-roster.ts` => query wiring, URL-backed table state, mutation helpers
- `src/features/studio-creator-roster/config/studio-creator-roster-search-schema.ts` => route/search schema
- `src/features/studio-creator-roster/config/studio-creator-roster-columns.tsx` => table columns
- `src/features/studio-creator-roster/components/studio-creator-roster-table.tsx` => table shell
- `src/features/studio-creator-roster/components/add-studio-creator-dialog.tsx`
- `src/features/studio-creator-roster/components/edit-studio-creator-dialog.tsx`
- `src/features/studio-creator-roster/components/studio-creator-actions-cell.tsx`
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
- actions (admin only)

## Data And Query Model

- query key family: `studioCreatorRosterKeys`
- GET list uses URL-backed pagination/filter state and forwards `AbortSignal`
- POST/PATCH mutations invalidate:
  - creator roster list family
  - creator catalog list family
  - creator availability list family
- use shared API types from `@eridu/api-types/studio-creators`
- PATCH flows must send `version` and treat 409 as a refetch-and-review conflict path

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

## UX Rules

- hide write actions for non-admin roles, but keep compensation fields visible
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
