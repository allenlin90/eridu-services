# Studio Show Management — Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 1+
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/studio-show-management.md`](../../../../docs/prd/studio-show-management.md)
> **Depends on**: Existing show-operations route ✅, backend studio show management endpoints

## Purpose

Add studio-owned create/edit/delete workflows to the existing show-operations surface without falling back to `/system/shows` or admin-only lookup APIs.

## Current-State Evaluation

The current studio frontend has the right route shell but not the right write path:

- `/studios/$studioId/show-operations` already exists and is guarded by the shared `shows` access policy (`ADMIN`, `MANAGER`).
- The page already lists shows, caches studio lookups, and links to task/detail flows.
- There is no create button, no row action menu, and no studio-scoped show mutations.
- The reusable admin `features/shows` form is not safe to drop in:
  - it uses admin endpoints for clients and rooms
  - it includes creator assignment fields, which are out of scope for studio show management
  - it assumes the admin show payload shape
- `GET /studios/:studioId/shows/:showId` currently returns only the base show DTO, so edit forms cannot load assigned platforms.

## Final Design Decisions

1. Reuse the existing show-operations route.
   No new top-level studio route is added. Show management stays inside `/studios/$studioId/show-operations`.

2. Keep route access aligned with the existing `shows` policy key.
   Managers and admins can open the page; only admins can delete.

3. Create/edit lives in modal dialogs, not separate routes.
   This preserves the existing list/filter/search context and keeps the implementation local to the current route.

4. Studio show management gets its own feature slice.
   Do not extend the admin `features/shows` forms directly. Reuse only domain-neutral pieces once they are parameterized for studio-safe lookups.

5. The studio form manages metadata and platform membership only.
   Creator assignment remains on the dedicated creator-mapping surfaces.

6. Delete confirmation uses a preflight query.
   The dialog should show warning counts before confirming delete, not after a destructive call.

7. `409` is handled as a refetch-and-review flow.
   If the update version is stale, the dialog refetches the latest show detail, shows a conflict banner, and keeps the user in context to review/resubmit.

## Route Plan

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/show-operations` | List shows, readiness, create/edit/delete actions | `ADMIN`, `MANAGER` |
| `/studios/$studioId/show-operations/$showId/tasks` | Existing task page | Unchanged |

No navigation move is required for this slice. The route already maps to the `shows` access key and existing sidebar grouping.

## Feature Structure

Extend the existing `studio-shows` domain instead of the admin `shows` feature.

Recommended files:

```text
src/features/studio-shows/
├── api/
│   ├── create-studio-show.ts
│   ├── update-studio-show.ts
│   ├── delete-studio-show.ts
│   ├── get-studio-show-delete-impact.ts
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
    └── studio-show-conflict-copy.ts
```

Why this boundary:

- it keeps write behavior colocated with the existing studio show list/detail queries
- it avoids cross-feature imports from the admin show module
- it lets the route stay a composition boundary instead of turning into a monolith

## Data And Query Plan

### Existing Keys To Reuse

- `studioShowsKeys.list(...)`
- `studioShowKeys.detail(studioId, showId)`
- `showLookupsKeys.detail(studioId)`

### New Keys

- `['studio-show-delete-impact', studioId, showId]`

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

### Page-Level Actions

Add a `Create Show` button to the show-operations toolbar.

Rules:

- visible to `ADMIN` and `MANAGER`
- opens the create dialog
- keep the existing icon-only refresh button pattern

### Row-Level Actions

Add a row action trigger to the studio show table.

Actions:

- `Edit show` for `ADMIN`, `MANAGER`
- `Delete show` for `ADMIN` only

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

The current admin form is not reused as-is because it violates all four exclusions above.

### Delete Dialog

Before enabling confirm:

1. fetch `GET /studios/:studioId/shows/:showId/delete-impact`
2. render warning copy when either count is non-zero

Recommended copy:

- `This show still has 3 active tasks and 2 submitted reports. Deleting it will preserve history but remove it from active studio lists.`

## Studio-Safe Lookup Strategy

Use the existing `GET /studios/:studioId/show-lookups` query family as the form lookup source after the backend extends it with:

- `clients`
- `studio_rooms`

This avoids introducing studio-side calls to:

- `/admin/clients`
- `/admin/studio-rooms`

Implementation rule:

- do not reuse `useClientFieldData()` or `useStudioRoomFieldData()` in the studio management form until they are rewritten to accept studio-scoped lookups

## Conflict Handling

Update flow on `409 SHOW_VERSION_CONFLICT`:

1. keep the dialog open
2. refetch `studioShowKeys.detail(studioId, showId)`
3. replace form state with the latest server record
4. render a banner explaining the show changed on another session
5. let the user review and resubmit

Do not silently discard the mutation or auto-close the dialog.

## Ordered Task List

### FE-1 Studio Show APIs

- [ ] Add `create-studio-show.ts`.
- [ ] Add `update-studio-show.ts`.
- [ ] Add `delete-studio-show.ts`.
- [ ] Add `get-studio-show-delete-impact.ts`.
- [ ] Update `get-studio-show.ts` to the enriched detail type.

### FE-2 Form And Dialogs

- [ ] Add studio-safe show management form fields.
- [ ] Add create dialog.
- [ ] Add edit dialog.
- [ ] Add delete confirmation dialog with preflight warning copy.
- [ ] Exclude creator assignment fields from the studio form.

### FE-3 Show-Operations Integration

- [ ] Add `Create Show` toolbar action.
- [ ] Add row/mobile action menus.
- [ ] Wire create/edit/delete dialog state into the route container.
- [ ] Preserve all existing URL-backed filters and pagination behavior.

### FE-4 Access And Conflict UX

- [ ] Gate delete action to `ADMIN`.
- [ ] Keep create/edit available to `MANAGER`.
- [ ] Handle `409` with refetch-and-review flow.
- [ ] Keep `403` and `404` error states explicit.

### FE-5 Tests

- [ ] Toolbar test for role-based create action.
- [ ] Row action test for manager/admin delete visibility.
- [ ] Form tests proving studio lookup data, not admin endpoints, drives the selects.
- [ ] Mutation tests for query invalidation.
- [ ] Conflict test proving dialog stays open on `409`.
- [ ] Delete dialog test proving preflight warning counts render.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios test`
- `pnpm --filter erify_studios build`

## Risks And Follow-Ups

- Because the DB model still requires client/type/standard/status, the studio create dialog cannot be a lightweight name/time-only composer in this slice.
- The existing admin field hooks should not be shared into studio management until their data sources are parameterized; copying them blindly would reintroduce `/admin/*` dependency.
- If the page route starts growing again, extract the management-dialog state into a view-model hook first rather than inflating the route file.
