# PRD: Studio Show Management

> **Status**: Active
> **Phase**: 4 — Extended Scope (Studio Autonomy)
> **Workstream**: Studio self-service — show lifecycle management
> **Depends on**: None (no prerequisite features required)
> **Blocks**: Show Planning Export (studio-owned shows feed into planning export), full studio autonomy

## Problem

Shows are the core operational unit of every studio — they drive creator assignment, shift scheduling, task creation, and cost aggregation. Yet studios have **no ability to create, update, or delete shows**. Every show setup requires a system admin operating through `/admin/shows`.

Current state:

- `/admin/shows` provides full CRUD (create, update, delete) plus bulk creator/platform operations — reserved for system admins only.
- `/studios/:studioId/shows` is **read-only** with creator assignment operations only.
- Studios can assign creators to shows and read show details, but cannot control the show's own lifecycle.

Consequences today:

- A studio admin cannot create a new show without system-admin help — this is the most frequent operational action.
- Show metadata corrections (name, times, client, type, room) require escalation to system admin.
- Show cancellation (soft-delete) requires system admin intervention.
- Platform assignment/removal on shows is system-admin-only, yet studios manage their own platform relationships day-to-day.
- The studio workspace appears to "own" shows but has no write authority over them, creating a confusing authority model.

Key unanswered questions:

- *"Why does a studio admin need to ask a system admin to create a show that only that studio will operate?"*
- *"Who should own show lifecycle — the studio that operates it, or the system admin who rarely touches it after creation?"*
- *"How do we maintain cross-studio governance while granting studios routine show management?"*

## Users

- **Studio ADMIN** (primary): create, update, soft-delete shows within their studio; manage platform assignments
- **Studio MANAGER** (secondary): create and update shows (day-to-day operations); cannot delete
- **System Admin**: retains cross-studio show governance via `/admin/shows`; no longer required for routine studio show management

## Existing Infrastructure

| Surface / Model | Current Behavior | Status |
| --- | --- | --- |
| `/admin/shows` | Full CRUD + bulk creator/platform operations, system-admin only | ✅ Exists |
| `/studios/:studioId/shows` | Read-only + creator assignment operations | ✅ Exists |
| `Show` model | Studio-scoped via `studioId` FK; supports soft-delete, metadata, room assignment | ✅ Exists |
| `ShowCreator` | Creator assignment to show (studio-managed) | ✅ Exists |
| `ShowPlatform` | Platform assignment to show (admin-only today) | ✅ Exists |
| Studio show lookups | Read-only access to clients, platforms, types, standards, statuses | ✅ Exists |

## Requirements

### In Scope

1. **Studio-scoped show creation**
   - Studio admins and managers can create shows from `/studios/$studioId/shows`.
   - Show is automatically scoped to the current studio (no cross-studio creation).
   - Required fields: `name`, `startTime`, `endTime`, `clientId`, `showTypeId`, `showStandardId`, `showStatusId`
   - Optional fields: `externalId`, `studioRoomId`, `metadata`, `platformIds[]`
   - Platform assignments can be set at creation time.
   - If a soft-deleted show already exists for the same external identity, the record is restored instead of creating a duplicate row.

2. **Studio-scoped show update**
   - Studio admins and managers can update show details (name, times, client, type, standard, status, room, metadata).
   - Platform assignment management (add/remove) at studio level.
   - Updates follow last-write-wins behavior in v1.

3. **Studio-scoped show soft-delete**
   - Studio admins only (managers cannot delete).
   - Soft-delete only — historical data preserved for economics and reporting.
   - Delete is allowed only before the show's `startTime`.
   - If the show has already started, delete is rejected.

4. **Studio-scoped platform management on shows**
   - Add/remove platforms from shows at studio level.
   - Replaces current admin-only platform assignment.

5. **Preserve admin governance**
   - `/admin/shows` retains full CRUD for cross-studio management.
   - System admins can still create/update/delete any show regardless of studio.
   - Studio-scoped routes enforce studio membership and role checks.

6. **Read access unchanged**
   - All studio members continue to see shows via existing GET endpoints.
   - No change to task or creator assignment read paths.

### Out of Scope

- Cross-studio show sharing or transfer
- Show templates or cloning workflows
- Automated show creation from schedules (schedule-show linking is existing behavior)
- Show archival beyond soft-delete
- Bulk show creation from studio context (admin bulk ops remain admin-only in v1)

## Desired User Flow

1. A studio admin or manager opens `/studios/$studioId/shows`.
2. They click `Create Show`.
3. They fill in show name, times, client, type, standard, and status, then optionally select room and platforms.
4. The system creates the show scoped to the current studio.
5. The show immediately appears in the studio show list and is available for creator assignment.
6. The admin/manager can later edit the show from the same CRUD list view to update details or manage platform assignments.
7. A studio admin can soft-delete a show only before it starts.
8. Task generation, readiness review, and task assignment remain on the separate `/studios/$studioId/show-operations` workflow page.

## Product Decisions

- **Studio-scoped creation** — shows are always created within a studio context; the studio FK is set automatically from the route, not from request body.
- **Restore by `externalId`** — when create includes an `externalId` that matches a soft-deleted show identity, the system restores that row and updates its mutable fields from the latest payload instead of inserting a new record.
- **Manager write access** — managers create and update shows as a routine operational task; only admins can delete.
- **Separate FE purpose-built views** — show CRUD lives on a dedicated show-management list page; task generation/readiness/assignment stay on the existing show-operations page. They may reuse the same backend endpoints and cache families.
- **Platform assignment at studio level** — platforms are operational metadata that studios manage; no reason to keep this admin-only.
- **Soft-delete only, pre-start only** — shows accumulate historical cost and task data; hard delete would break economics and reporting, and studio delete is limited to shows that have not started yet.
- **Last-write-wins for v1 studio edits** — explicit optimistic locking is deferred because manual studio show CRUD remains a relatively rare path while Google Sheets schedule upload/publish is still the dominant show-creation flow.
- **No show transfer** — shows belong to one studio; cross-studio movement is a governance action for system admins only.

## API Shape

### New Studio Endpoints

```http
POST   /studios/:studioId/shows
PATCH  /studios/:studioId/shows/:showId
DELETE /studios/:studioId/shows/:showId
```

### Create Show

```http
POST /studios/:studioId/shows
```

Request:
```json
{
  "external_id": "erp_show_20260401_morning_live",
  "name": "Morning Live Stream",
  "start_time": "2026-04-01T09:00:00Z",
  "end_time": "2026-04-01T12:00:00Z",
  "client_id": "client_abc123",
  "show_type_id": "showtype_xyz",
  "show_standard_id": "standard_abc",
  "show_status_id": "status_draft",
  "studio_room_id": "room_a1",
  "metadata": {},
  "platform_ids": ["platform_tiktok", "platform_youtube"]
}
```

Response: canonical show DTO (same shape as existing GET response).

### Update Show

```http
PATCH /studios/:studioId/shows/:showId
```

Request: partial update of show fields.

### Delete Show

```http
DELETE /studios/:studioId/shows/:showId
```

Soft-delete. Returns 204 on success.

### Error Codes

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `SHOW_NOT_FOUND` | 404 | Show does not exist or belongs to different studio |
| `SHOW_ALREADY_STARTED` | 400 | Show `startTime` is in the past or present, so studio delete is not allowed |

## Acceptance Criteria

- [ ] Studio ADMIN and MANAGER can create shows scoped to their studio from `/studios/$studioId/shows`.
- [ ] Studio create restores a soft-deleted show when the payload carries the same `external_id`, and the restored record follows the latest payload for mutable fields.
- [ ] Studio ADMIN and MANAGER can update show details (name, times, client, type, standard, status, room, metadata).
- [ ] Studio ADMIN can soft-delete shows before start time; MANAGER cannot.
- [ ] Studio ADMIN and MANAGER can manage platform assignments on shows.
- [ ] Shows are automatically scoped to the studio from the route — no cross-studio creation.
- [ ] Studio update follows explicit last-write-wins behavior in v1, and the known overwrite risk is documented.
- [ ] All existing read endpoints and creator assignment flows remain unchanged.
- [ ] `/admin/shows` retains full capability for system admins.
- [ ] MEMBER role cannot create/update/delete shows (403).
- [ ] Soft-deleted shows are excluded from studio show list.

## Design Reference

- Backend design: create with implementation PR under `apps/erify_api/docs/design/`
- Frontend design: create with implementation PR under `apps/erify_studios/docs/design/`
- Related admin controller: `apps/erify_api/src/admin/shows/admin-show.controller.ts`
- Related studio controller: `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`
