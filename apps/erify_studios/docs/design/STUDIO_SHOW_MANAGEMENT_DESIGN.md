# Studio Show Management — Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 1+
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/studio-show-management.md`](../../../../docs/prd/studio-show-management.md)
> **Depends on**: Existing show-operations route ✅, backend studio show management endpoints

## Purpose

Add a dedicated studio show CRUD page and keep `show-operations` focused on readiness, task generation, and assignment without falling back to `/system/shows` or admin-only lookup APIs.

## Current-State Evaluation

The current studio frontend has the operations shell, but it mixes concerns for this feature:

- `/studios/$studioId/show-operations` already exists and is guarded by the shared `shows` access policy (`ADMIN`, `MANAGER`).
- That page already serves a specific operational purpose: readiness review, bulk task generation, and assignment flows.
- There is no dedicated studio CRUD page for show lifecycle work.
- The current `useStudioShows` hook is route-bound to `/studios/$studioId/show-operations`, so reusing it as-is would leak operations URL state and defaults into the CRUD page.
- The reusable admin `features/shows` form is not safe to drop in:
  - it uses admin endpoints for clients and rooms
  - it includes creator assignment fields, which are out of scope for studio show management
  - it assumes the admin show payload shape
- `GET /studios/:studioId/shows/:showId` currently returns only the base show DTO, so edit forms cannot load assigned platforms.

## Final Design Decisions

1. Split CRUD and operations into separate studio pages.
   Show lifecycle CRUD gets its own list page. `show-operations` remains an operations-only page.

   Implementation guardrail:

   - `/studios/$studioId/show-operations` remains behaviorally unchanged in this slice
   - studio show management must not rewrite that page's layout, filters, or bulk task actions

2. Keep route access aligned with the existing `shows` policy key for reads and normal writes.
   Managers and admins can open both pages and create/update shows. Delete stays admin-only.

3. Show CRUD uses a table/list page with dialog-based create/edit/delete.
   The CRUD page owns lifecycle management. The operations page should not grow create/edit/delete controls.

4. Studio show management gets its own feature slice.
   Do not extend the admin `features/shows` forms directly. Reuse only domain-neutral pieces once they are parameterized for studio-safe lookups.

5. The studio CRUD form manages metadata and platform membership only.
   Creator assignment remains on the dedicated creator-mapping surfaces.

6. Delete uses a simple pre-start rule.
   The UI should offer delete to admins only, and the backend will reject delete when the show has already started.

7. The frontend follows the backend's last-write-wins rule.
   The form does not send a concurrency token in v1. Save success should simply refresh the shared show queries.

8. `external_id` restore is backend behavior, not an initial form field.
   The studio form does not expose `external_id` in v1. If the create API later receives it from another caller, restore-on-create remains a backend identity rule.

9. Schedule is required in normal studio UX even though BE keeps it optional.
   The studio create/edit form should require schedule selection, while the list page should also help operators find orphan shows with no schedule.

10. Shared endpoints and cache are still preferred.
   The new CRUD page and the existing operations page should reuse the same `GET /studios/:studioId/shows`, `GET /studios/:studioId/shows/:showId`, and lookup queries where possible.

11. Shared data does not mean shared route state.
    The pages should share API calls and query keys, but each route must own its own search schema, table state, and UX defaults.

## Route Plan

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/shows` | Show CRUD table view | `ADMIN`, `MANAGER` |
| `/studios/$studioId/show-operations` | Task generation, readiness, and assignment operations | `ADMIN`, `MANAGER` |
| `/studios/$studioId/show-operations/$showId/tasks` | Existing task page | Unchanged |

Navigation plan:

- add a dedicated `Shows` item that points to `/studios/$studioId/shows`
- keep `Show Operations` as a separate item pointing to `/studios/$studioId/show-operations`
- both routes may continue to share the `shows` access policy key unless product later splits permissions

## Feature Structure

Extend the existing `studio-shows` domain instead of the admin `shows` feature.

Recommended files:

```text
src/features/studio-shows/
├── api/
│   ├── create-studio-show.ts
│   ├── update-studio-show.ts
│   ├── delete-studio-show.ts
│   └── get-studio-show.ts        // updated detail type
├── components/
│   ├── studio-show-management-dialogs.tsx
│   ├── studio-show-form.tsx
│   ├── studio-show-form-fields.tsx
│   └── studio-show-row-actions.tsx
├── hooks/
│   ├── use-studio-show-management-options.ts
│   └── use-studio-show-management-dialog-state.ts
└── lib/
    └── studio-show-form-copy.ts
```

Why this boundary:

- it keeps write behavior colocated with the existing studio show list/detail queries
- it avoids cross-feature imports from the admin show module
- it lets the CRUD page and operations page stay purpose-specific instead of turning one route into a monolith

## Data And Query Plan

### Existing Keys To Reuse

- `studioShowsKeys.list(...)`
- `studioShowKeys.detail(studioId, showId)`
- `showLookupsKeys.detail(studioId)`

Cache policy:

- the CRUD page and `show-operations` should share `studioShowsKeys` and `studioShowKeys`
- do not fork duplicate query families just because the pages are separate

Contract expectations for this slice:

- shared show list/detail data should expose schedule summary fields so the CRUD page can show assignment state
- shared show list query should support an orphan-friendly `has_schedule` filter or equivalent
- `show-lookups` should include schedules for the create/edit form

### Separate Route-State Plan

Keep the low-level data layer shared, but split route-owned table state and defaults.

Required rule:

- do not reuse the current route-bound `useStudioShows()` hook as-is for the CRUD page
- keep the current `useStudioShows()` hook serving `/studios/$studioId/show-operations`

Recommended structure:

- keep `getStudioShows()` and `studioShowsKeys` as the shared fetch/cache layer
- extract route-neutral list querying into a page-agnostic hook or helper
- add one route/view-model hook for `/studios/$studioId/shows`
- keep a separate route/view-model hook for `/studios/$studioId/show-operations`

Behavior split:

- the CRUD page owns its own search/filter/pagination URL contract
- the operations page keeps its own scope date defaults, readiness filters, and selection state
- neither page should inherit the other's URL params or default table behavior

### Invalidation Rules

After create:

- invalidate `studioShowsKeys.listPrefix(studioId)`

After update:

- invalidate `studioShowsKeys.listPrefix(studioId)`
- invalidate `studioShowKeys.detail(studioId, showId)`

After delete:

- invalidate `studioShowsKeys.listPrefix(studioId)`
- remove or invalidate `studioShowKeys.detail(studioId, showId)`

## UI Plan

### Shows Page

This is the new lifecycle-management surface.

Primary elements:

- table view of studio shows
- create button
- row actions for edit/delete
- URL-backed search/filter/pagination
- no readiness snapshot or operations-specific default date scope
- no bulk task generation or assignment controls

Recommended page copy:

- title: `Shows`
- description: `Create, update, and manage studio shows.`

Recommended layout:

- keep the existing studio `PageLayout`
- render one primary full-width table section
- keep toolbar actions lightweight: search, filters, create, refresh
- avoid adding the readiness scope card or selection action bar from `show-operations`

### Show Operations Page

Keep the existing operational purpose:

- readiness summary
- bulk task generation
- assign shows/tasks
- jump into per-show task workflow

Explicitly exclude from this page:

- create show
- edit show metadata
- delete show

Implementation guardrail:

- do not change the current `show-operations` layout structure, readiness section, date scope behavior, filter set, or bulk action UX as part of this feature

### CRUD Page Filter Plan

The new CRUD page should align with the existing query/filter patterns already familiar from `/system/shows` and `/studios/$studioId/show-operations`, while staying scoped to lifecycle management rather than task operations.

Recommended toolbar filters:

- `name`
- `client_name`
- `creator_name`
- `show_type_name`
- `show_standard_name`
- `show_status_name`
- `platform_name`
- `has_schedule` (`Assigned` / `Orphan`)
- `start_date_from` / `start_date_to` as the CRUD page date-range filter

Filter exclusions on the CRUD page:

- no `needs_attention`
- no `has_tasks`
- no readiness-only quick toggles

Mapping rule:

- keep the CRUD page URL/search schema close to `/system/shows`
- map the CRUD page date-range filter to the existing studio list endpoint params without changing `show-operations`
- add an explicit orphan-friendly schedule-state filter on the CRUD page instead of pushing that recovery workflow into `show-operations`

Practical implication:

- the CRUD page can expose `start_date_from` / `start_date_to` in route state for parity with `/system/shows`
- the data hook can translate that to the shared studio list query params consumed by `GET /studios/:studioId/shows`

### CRUD Page Actions

Add a `Create Show` button to the CRUD page toolbar.

Rules:

- visible to `ADMIN` and `MANAGER`
- opens the create dialog
- keep the existing icon-only refresh button pattern

### Row-Level Actions

Add a row action trigger to the CRUD table.

Actions:

- `Edit show` for `ADMIN`, `MANAGER`
- `Delete show` for `ADMIN`

Mobile:

- include the same actions in the mobile card/menu path instead of table-only affordances

### Create / Edit Form

Fields:

| Field | Required | Source |
| --- | --- | --- |
| Name | Yes | direct input |
| Start time | Yes | direct input |
| End time | Yes | direct input |
| Client | Yes | `show-lookups.clients` |
| Schedule | Yes in normal studio UX | `show-lookups.schedules` |
| Show type | Yes | `show-lookups.show_types` |
| Show standard | Yes | `show-lookups.show_standards` |
| Status | Yes | `show-lookups.show_statuses` |
| Studio room | No | `show-lookups.studio_rooms` |
| Platforms | No | `show-lookups.platforms` |

Explicitly excluded:

- creator assignment
- live-stream-link metadata
- platform show ids
- viewer counts
- manual `external_id` entry in the v1 studio UI

The current admin form is not reused as-is because it violates all four exclusions above.

Orphan handling:

- FE should still be able to render and edit an orphan show with `schedule_id = null`
- normal create/edit submit UX should require schedule selection
- orphan rows are repaired from the CRUD page rather than treated as a separate workflow

### Delete Dialog

The dialog is a direct confirmation, not a warning-preflight flow.

Recommended copy:

- `Delete this show? Studio delete is only allowed before the show start time, and pre-start workflow data will be removed.`

Failure handling:

- if the backend returns `SHOW_ALREADY_STARTED`, keep the dialog closed and show a user-facing error explaining the show can no longer be deleted because it has started

## Studio-Safe Lookup Strategy

Use the existing `GET /studios/:studioId/show-lookups` query family as the form lookup source after the backend extends it with:

- `clients`
- `studio_rooms`
- `schedules`

This avoids introducing studio-side calls to:

- `/admin/clients`
- `/admin/studio-rooms`

Implementation rule:

- do not reuse `useClientFieldData()` or `useStudioRoomFieldData()` in the studio management form until they are rewritten to accept studio-scoped lookups

## Save Behavior

Update flow follows last-write-wins:

1. submit the latest form payload
2. on success, invalidate the shared show list/detail queries
3. close the dialog and render the refreshed server state

Known limitation:

- the UI does not detect stale form state in v1 because the backend is intentionally not returning `409` conflict responses for studio show updates

## Ordered Task List

### FE-1 Studio Show APIs

- [ ] Add `create-studio-show.ts`.
- [ ] Add `update-studio-show.ts`.
- [ ] Add `delete-studio-show.ts`.
- [ ] Update `get-studio-show.ts` to the enriched detail type.
- [ ] Keep `external_id` restore behavior backend-owned unless product later decides to expose it in the form.
- [ ] Carry `schedule_id` in studio create/update APIs.

### FE-2 Form And Dialogs

- [ ] Add studio-safe show management form fields.
- [ ] Add create dialog.
- [ ] Add edit dialog.
- [ ] Add delete confirmation dialog with pre-start rule copy.
- [ ] Exclude creator assignment fields from the studio form.
- [ ] Require schedule selection in the normal studio create/edit UX.

### FE-3 Show-Operations Integration

- [ ] Add `/studios/$studioId/shows` route as the dedicated CRUD page.
- [ ] Add CRUD table toolbar and row/mobile action menus to that page.
- [ ] Wire create/edit/delete dialog state into the CRUD route container.
- [ ] Preserve URL-backed filters and pagination behavior on the CRUD page.
- [ ] Keep `show-operations` focused on readiness/task workflows only, with no layout or filter regression.
- [ ] Reuse the same show query keys and endpoint contracts across both pages.
- [ ] Extract the current route-bound `useStudioShows()` behavior so shared fetching is decoupled from `show-operations` URL state.
- [ ] Give `/studios/$studioId/shows` its own search schema and table-state hook instead of inheriting `show-operations` defaults.
- [ ] Match CRUD page filters closely to the existing `/system/shows` and studio operations table patterns: `name`, `client_name`, `creator_name`, `show_type_name`, `show_standard_name`, `show_status_name`, `platform_name`, `has_schedule`, and start-date range.
- [ ] Surface orphan-show discovery and repair inside `/studios/$studioId/shows`.

### FE-4 Access And Conflict UX

- [ ] Gate delete action to `ADMIN` only.
- [ ] Keep create/edit available to `MANAGER`.
- [ ] Keep save behavior aligned with backend last-write-wins semantics.
- [ ] Keep `403` and `404` error states explicit.

### FE-5 Tests

- [ ] Toolbar test for role-based create action.
- [ ] Row action test for admin-only delete visibility.
- [ ] Form tests proving studio lookup data, not admin endpoints, drives the selects.
- [ ] Mutation tests for query invalidation.
- [ ] Mutation test proving successful save refreshes the shared show queries.
- [ ] Delete test proving `SHOW_ALREADY_STARTED` renders the correct error state.
- [ ] Route-level test proving CRUD actions are on `/studios/$studioId/shows`, not `show-operations`.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios test`
- `pnpm --filter erify_studios build`

## Risks And Follow-Ups

- Because the DB model still requires client/type/standard/status, the studio create dialog cannot be a lightweight name/time-only composer in this slice.
- The existing admin field hooks should not be shared into studio management until their data sources are parameterized; copying them blindly would reintroduce `/admin/*` dependency.
- Studio show edits intentionally follow last-write-wins while Google Sheets schedule upload/publish remains the dominant show-writing workflow. If manual show editing frequency rises, revisit conflict handling together with the backend concurrency strategy.
- If the CRUD page route starts growing again, extract the management-dialog state into a view-model hook first rather than inflating the route file.
