# Studio Schedule Management Frontend Design

> **Status**: ⏸️ Deferred from Phase 4 (2026-04-22). Retained for reference.
> **Phase scope**: Revisit as part of the Client Portal workstream
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/studio-schedule-management.md`](../../../../docs/prd/studio-schedule-management.md)
> **Depends on**: studio show management shipped on `master`, backend studio-native schedule contract, shared table URL-state patterns

> **Deferral note**: This design was reviewed in April 2026 and deferred from Phase 4. Planners continue to operate schedules via the Google Sheets flow, which remains stable and ergonomically preferred. Studio-native schedule UX is paused pending Client Portal direction. Content below is preserved unchanged as reference.

## Purpose

Define the `erify_studios` workflow for studio-native schedule management:

- schedule list and lifecycle actions
- a schedule detail workspace for assignment, validation, and publish
- snapshot history for admins/managers
- read-only published schedule visibility for members

This should feel like a purpose-built studio workspace, not a thin wrapper around `/system/schedules`.

## UX Goals

1. **Schedules are workspace containers, not hidden metadata.**
   - Operators need a place to see the current schedule, current assigned shows, and the backlog they can pull from.

2. **Published view and live view must not be conflated.**
   - Admins/managers work against live membership.
   - Members see the latest published snapshot only.

3. **Assignment must be actionable without dead-search controls.**
   - Every searchable surface needs an explicit remote data source.
   - The backlog must be filterable enough to be usable for real studios.

4. **Chronological order is explicit.**
   - V1 does not fake drag-and-drop or custom sort.
   - The UI should describe the order as start-time order.

5. **Unpublished changes are visible.**
   - If a published schedule has changed since the last publish, admins/managers should see that immediately.

## Route Plan

| Route                                                | Purpose                                                 | Access                       |
| ---------------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| `/studios/$studioId/schedules`                       | Schedule list and lifecycle entry point                 | `ADMIN`, `MANAGER`, `MEMBER` |
| `/studios/$studioId/schedules/$scheduleId`           | Schedule detail workspace or published read-only detail | `ADMIN`, `MANAGER`, `MEMBER` |
| `/studios/$studioId/schedules/$scheduleId/snapshots` | Snapshot history and drill-in list                      | `ADMIN`, `MANAGER`           |

Recommended route files:

```text
src/routes/studios/$studioId/schedules.tsx
src/routes/studios/$studioId/schedules/index.tsx
src/routes/studios/$studioId/schedules/$scheduleId/index.tsx
src/routes/studios/$studioId/schedules/$scheduleId/snapshots/index.tsx
```

`MEMBER` should be allowed into the list/detail routes, but the data mode is published-only and the action affordances are removed.

## Primary Screens

### 1. Schedule List

The list page is the shared entry point for all schedule roles.

Admin/manager behavior:

- paginated searchable schedule list
- create dialog
- edit dialog
- duplicate dialog
- delete action for admins only
- row click to open detail workspace
- status and unpublished-change indicator in the table

Member behavior:

- published schedules only
- no create/edit/delete/publish/duplicate actions
- row click opens published detail view

### 2. Schedule Detail Workspace

This is the core admin/manager surface.

Recommended layout:

1. header card
   - schedule name
   - client
   - date range
   - status
   - live show count
   - published metadata
   - unpublished-changes banner when `has_unpublished_changes = true`
2. scheduled shows section
   - current schedule membership
   - chronological table
   - unassign action per row
3. backlog section
   - unscheduled show pool
   - assign action
   - searchable/filterable table
4. validation panel
   - latest validation summary
   - errors vs warnings
5. publish panel
   - publish CTA for admins only
   - snapshot history link

### 3. Published Read-Only Detail

For `MEMBER`, the same detail route renders a published snapshot view:

- header from published snapshot
- read-only show list from published snapshot
- no validation panel
- no backlog
- no live unpublished-change banner

This must not render live linked shows, even if the admin/manager has changed the schedule since the last publish.

### 4. Snapshot History

Admin/manager-only page showing published snapshots:

- snapshot version
- created at
- published by
- show count
- snapshot detail drawer or expandable row

V1 does not need diff visualization.

## Data Sources

Searchable controls and tables must use explicit backend sources.

### Schedule list

Source:

- `GET /studios/:studioId/schedules`

Used by:

- list page table
- show-management schedule combobox compatibility path

URL-backed filters:

- `name`
- `client_name`
- `status`
- `start_date_from`
- `start_date_to`

### Schedule detail header

Source:

- `GET /studios/:studioId/schedules/:scheduleId`

Used by:

- live workspace header for admin/manager
- published snapshot header for member

### Scheduled shows table

Source:

- `GET /studios/:studioId/schedules/:scheduleId/shows`

Used by:

- live scheduled shows section
- published read-only member shows section

Expected behavior:

- backend returns `start_time ASC`
- admin/manager mode returns live membership
- member mode returns latest published snapshot membership

### Backlog table

Source:

- `GET /studios/:studioId/shows`

Required backend filters for schedule workspace use:

- `has_schedule=false`
- `client_id=<schedule.client_id>` when schedule is client-linked
- `has_client=false` when schedule is client-less
- `search`
- `date_from`
- `date_to`
- `show_status_name`

Reason:

- the backlog is a full table, not a small lookup
- reusing the studio show list avoids inventing a second show-read model
- schedule workspace needs the same searchable/filterable behavior as show management

This data source must be documented in the implementation because AGENTS requires every searchable control to have an explicit source.

### Create / edit / duplicate dialogs

Sources:

- `GET /studios/:studioId/clients`
- existing schedule row detail for edit/duplicate defaults

No client-side stub lists.

### Validation

Source:

- `POST /studios/:studioId/schedules/:scheduleId/validate`

### Publish

Source:

- `POST /studios/:studioId/schedules/:scheduleId/publish`

### Snapshot history

Sources:

- `GET /studios/:studioId/schedules/:scheduleId/snapshots`
- `GET /studios/:studioId/snapshots/:snapshotId`

## UI State Model

### List route state

Use the shared pagination stack:

- `useTableUrlState`
- `DataTablePagination`
- `placeholderData: keepPreviousData`

Suggested search schema for `/studios/$studioId/schedules`:

- `page`
- `limit`
- `name`
- `client_name`
- `status`
- `start_date_from`
- `start_date_to`

### Detail route state

Keep the route shareable, but do not overload it with every transient toggle.

URL-backed state:

- `scheduled_search`
- `backlog_search`
- `backlog_date_from`
- `backlog_date_to`
- `backlog_show_status_name`

Local UI state:

- latest validation result
- selected backlog rows
- selected scheduled rows
- dialog open states

### Cached query families

Recommended keys:

```text
studioSchedulesKeys.list(studioId, filters)
studioSchedulesKeys.detail(studioId, scheduleId)
studioSchedulesKeys.shows(studioId, scheduleId, viewMode)
studioSchedulesKeys.snapshots(studioId, scheduleId, filters)
studioSchedulesKeys.snapshotDetail(studioId, snapshotId)
```

Keep studio schedules separate from existing admin `schedules` keys. The behaviors and role assumptions are different enough that sharing keys will create accidental invalidation bugs.

## Mutation UX

### Create

Open from the list page.

Form fields:

- `name`
- `client_id` optional
- `start_date`
- `end_date`

Result:

- close dialog
- invalidate schedule list
- optionally route to new detail workspace

### Edit

Open from list or detail header.

Form fields:

- `name`
- `client_id`
- `start_date`
- `end_date`
- `status` with only `draft` and `review`

Do not expose `published` as a manual select option in the edit form. Publish stays a dedicated action.

### Duplicate

Open from row action.

Fields:

- `name`
- `start_date`
- `end_date`
- optional `client_id`

The dialog should prefill from the source schedule, but the user edits the new period before submission. This matches the backend decision that duplicate creates an empty draft for the next period, not an exact clone of the old calendar window.

### Delete

Admin only.

Delete confirmation should explain that delete is allowed only for empty schedules. If the backend returns `SCHEDULE_HAS_ASSIGNED_SHOWS`, surface a specific message telling the user to unassign or move shows first.

### Assign / Unassign

Assignments happen from the detail workspace tables.

Rules to surface clearly in UI:

- assign only from backlog table
- unassign only from scheduled table
- moving from another schedule is allowed only when initiated from an explicit move flow later; V1 workspace focuses on backlog-to-schedule and schedule-to-unscheduled

V1 recommendation:

- keep direct schedule-to-schedule move in the existing show edit form
- keep schedule workspace focused on assign from backlog and unassign from current schedule

This avoids turning the initial detail workspace into a cross-schedule transfer UI. Backend still supports controlled moves for correctness and future UX, but the first FE surface stays simpler.

### Validate

Validation should be a visible explicit action in the detail workspace.

Display model:

- blocking errors in destructive styling
- warnings in muted/warning styling
- validation timestamp

Keep the latest validation result on screen until:

- membership changes
- schedule metadata changes
- publish succeeds

At that point, mark the validation state stale rather than silently clearing it.

### Publish

Admin only.

Publish card behavior:

- show current published metadata
- show unpublished-changes state
- require a fresh successful validation result before enabling publish
- allow publish when only warnings exist
- block publish when validation errors exist

After publish:

- invalidate detail, list, shows, and snapshots queries
- keep the user on the same page
- replace validation banner with publish success state

## Role Behavior

| Capability                | ADMIN          | MANAGER        | MEMBER                  |
| ------------------------- | -------------- | -------------- | ----------------------- |
| View schedule list        | live           | live           | published snapshot only |
| View schedule detail      | live workspace | live workspace | published read-only     |
| Create / edit / duplicate | yes            | yes            | no                      |
| Delete                    | yes            | no             | no                      |
| Validate                  | yes            | yes            | no                      |
| Publish                   | yes            | no             | no                      |
| View snapshots            | yes            | yes            | no                      |

The FE must not rely on hidden buttons alone. Route loaders and action hooks should still respect backend role failures.

## Workspace Composition

Create a dedicated feature area instead of extending the admin schedules feature until the concerns blur together.

Recommended structure:

```text
src/features/studio-schedules/
  ├── api/
  │   ├── get-studio-schedules.ts
  │   ├── get-studio-schedule.ts
  │   ├── create-studio-schedule.ts
  │   ├── update-studio-schedule.ts
  │   ├── delete-studio-schedule.ts
  │   ├── duplicate-studio-schedule.ts
  │   ├── validate-studio-schedule.ts
  │   ├── publish-studio-schedule.ts
  │   ├── assign-studio-schedule-shows.ts
  │   ├── unassign-studio-schedule-shows.ts
  │   ├── get-studio-schedule-shows.ts
  │   ├── get-studio-schedule-snapshots.ts
  │   └── get-studio-schedule-snapshot.ts
  ├── components/
  │   ├── studio-schedules-table.tsx
  │   ├── studio-schedule-form-dialog.tsx
  │   ├── studio-schedule-duplicate-dialog.tsx
  │   ├── studio-schedule-header-card.tsx
  │   ├── studio-schedule-shows-table.tsx
  │   ├── studio-schedule-backlog-table.tsx
  │   ├── studio-schedule-validation-panel.tsx
  │   ├── studio-schedule-publish-card.tsx
  │   └── studio-schedule-snapshot-list.tsx
  ├── hooks/
  │   ├── use-studio-schedules-page-controller.ts
  │   ├── use-studio-schedule-detail-controller.ts
  │   └── use-studio-schedule-snapshots.ts
  └── lib/
      ├── studio-schedules-query-keys.ts
      └── get-studio-schedule-error-message.ts
```

Reuse selectively:

- current admin schedule date/status form controls where they are presentation-only
- shared `DataTable`, `DataTableToolbar`, `DataTablePagination`

Do not reuse:

- admin `features/schedules/hooks/use-schedules.ts`
- admin mutation hooks
- admin route assumptions

Studio schedule behavior differs too much in role model and live-vs-published semantics.

## Relationship to Studio Show Management

The existing studio show-management route remains important.

Shared behavioral rules from the shipped show-management feature:

- show-side schedule reassignment remains possible
- show-side update is still last-write-wins
- schedule status does not hard-block show reassociation

Frontend implication:

- after any show mutation that changes `schedule_id`, invalidate both studio-show queries and affected studio-schedule queries
- schedule detail should not assume it is the only writer of schedule membership

## Query Invalidation Rules

On create / edit / duplicate / delete:

- invalidate studio schedule list
- invalidate monthly overview if it exists in cache

On assign / unassign / publish:

- invalidate studio schedule detail
- invalidate studio schedule shows
- invalidate studio schedule list
- invalidate studio schedule snapshots when publish runs
- invalidate studio show list and detail queries because schedule names/statuses surface there

On show-side schedule change:

- invalidate affected studio schedule list/detail/show queries from the show mutation hooks as well

## Mobile and Responsiveness

The detail workspace should not collapse into an unusable dual-table page on mobile.

Recommended behavior:

- desktop: scheduled shows and backlog can render as stacked sections on one page
- mobile: use tabs or segmented controls between:
  - `Scheduled`
  - `Backlog`
  - `Validation`

Keep refresh controls icon-only with `aria-label`, matching repo guidance.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios test`
- `pnpm --filter erify_studios build`

Targeted frontend tests:

- list page pagination/filter URL behavior
- admin/manager action visibility
- member published-only list/detail mode
- unpublished-changes banner rendering
- scheduled shows sorted chronologically
- backlog data source honors client-linked vs client-less schedule mode
- validation panel stale-state behavior after membership change
- publish success invalidation and snapshot refresh
