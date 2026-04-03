# PRD: Studio Schedule Management

> **Status**: Active
> **Phase**: 4 — Extended Scope (Studio Autonomy)
> **Workstream**: Studio self-service — schedule lifecycle management
> **Depends on**: Studio Show Management (schedules group shows; studios must own show lifecycle first)
> **Blocks**: Studio Economics Review schedule grouping, Show Planning Export, full studio operational autonomy

## Problem

Schedules are the primary organizational unit for grouping shows into publishable work periods (typically weekly or per-client). Studios have **zero visibility or control over schedules** — there are no studio-scoped schedule endpoints at all.

Current state:

- `/admin/schedules` provides full CRUD, bulk operations, validation, publishing, duplication, snapshot history, and monthly overview — all reserved for system admins.
- Studios have **no schedule endpoints** whatsoever.
- Studios can manage shifts (via `/studios/:studioId/shifts`) but cannot see or manage the schedules that contain their shows.
- Studios cannot assign existing shows into schedules, remove them, or rearrange the order of shows inside a schedule from studio scope.

Consequences today:

- Studio admins cannot create weekly schedules for their shows without system-admin intervention.
- Studio admins cannot build a draft schedule by attaching their existing shows to it in the intended run order.
- Schedule publishing (finalizing a work period) requires system admin action.
- Studios cannot view schedule history or snapshots for audit/review.
- The monthly overview (schedule grouping by client) is only visible to system admins, not to studio operators who need it for planning.
- Bulk schedule operations (common for multi-client studios) require system admin involvement.

Key unanswered questions:

- *"Should studios own their schedule lifecycle end-to-end, or only a subset of operations?"*
- *"How does schedule publishing interact with shift management that studios already own?"*
- *"Should studios see cross-studio schedule data, or only their own?"*
- *"How do studios assign existing shows into a schedule and rearrange them as the week changes?"*

## Users

- **Studio ADMIN** (primary): create, update, validate, publish, duplicate, and soft-delete schedules
- **Studio MANAGER** (secondary): create and update schedules; view snapshots; cannot publish or delete
- **Studio MEMBER** (read-only): view published schedules for operational awareness
- **System Admin**: retains cross-studio schedule governance via `/admin/schedules`

## Existing Infrastructure

| Surface / Model | Current Behavior | Status |
| --- | --- | --- |
| `/admin/schedules` | Full CRUD + validate/publish/duplicate/bulk/monthly overview | ✅ Exists |
| Studios | **No schedule endpoints** | ❌ Missing |
| `Schedule` model | Studio-scoped via `studioId` FK; supports soft-delete, snapshots, published state | ✅ Exists |
| `Snapshot` model | Versioned schedule history (immutable after creation) | ✅ Exists |
| `Show.scheduleId` | Nullable relation used to link a show to a schedule | ✅ Exists |
| `/studios/:studioId/shifts` | Full shift CRUD at studio level | ✅ Exists |

## Requirements

### In Scope

1. **Studio-scoped schedule CRUD**
   - Studio admins and managers can create schedules from the studio workspace.
   - Schedules are automatically scoped to the current studio.
   - Required fields: `name`, `startDate`, `endDate`
   - Optional fields: `clientUid`, `metadata`

2. **Show assignment and arrangement inside schedules**
   - Studio admins and managers can attach existing same-studio shows to a schedule.
   - They can remove a show from a schedule without deleting the show itself.
   - They can move a show from one draft schedule to another draft schedule in the same studio.
   - They can rearrange the display/order of shows within a schedule for operational planning.
   - The schedule workspace must support both scheduled shows and an unscheduled backlog/picker so the assignment flow is actionable.

3. **Schedule validation**
   - Studio admins and managers can validate a schedule (check for conflicts, missing assignments).
   - Returns validation results without modifying state.
   - Validation should include schedule-aware show checks such as out-of-range show timing, duplicate schedule assignment conflicts, or missing required schedule context before publish.

4. **Schedule publishing**
   - Studio admins only can publish a schedule (finalize it for the work period).
   - Publishing creates a snapshot for version history.
   - Published schedules are visible to all studio members.
   - Publishing uses the current arranged set of shows linked to the schedule.

5. **Schedule duplication**
   - Studio admins and managers can duplicate a schedule as a starting point for a new period.
   - Duplicated schedule starts in draft state.
   - The duplication rule for linked shows must be explicit in implementation design: either keep the copied schedule empty or carry forward show linkage in a controlled draft-only way. This must be recorded before implementation.

6. **Snapshot history**
   - Studio admins and managers can view schedule snapshots for audit trail.
   - Read-only access to previous versions.

7. **Monthly overview**
   - Expose the monthly schedule overview (grouped by client) at studio level.
   - Available to admins and managers for operational planning.

8. **Preserve admin governance**
   - `/admin/schedules` retains full capability for cross-studio management.
   - Bulk operations remain admin-only in v1 (studio context is single-studio).

### Out of Scope

- Bulk schedule creation/update at studio level (admin-only in v1)
- Cross-studio schedule visibility
- Schedule-to-schedule comparison or diff views
- Automated schedule generation from templates
- Google Sheets integration at studio level (admin-only integration)
- Frozen publish-order analytics or variance tracking across snapshots

## Desired User Flow

1. A studio admin opens the schedules section in the studio workspace.
2. They create a new weekly schedule, optionally linking a client.
3. They add existing shows into the schedule from the studio show pool and arrange them in the intended order.
4. They review the schedule contents (shows, shifts within the period).
5. They validate the schedule to check for conflicts.
6. When satisfied, they publish the schedule (creates a snapshot).
7. Managers and members can view published schedules.
8. For the next period, the admin duplicates last week's schedule and adjusts.

## Product Decisions

- **Publishing is admin-only** — publishing finalizes a schedule and creates an immutable snapshot; this is a governance action.
- **Show assignment lives in the schedule workspace** — show CRUD owns the single-show linkage field, but schedule management owns the higher-level workflow for attaching, removing, and arranging shows in a schedule.
- **Validation is non-destructive** — returns conflict data without blocking or modifying.
- **Bulk operations remain admin-only** — studios operate on single schedules; cross-studio bulk is a system concern.
- **Snapshot access for managers** — managers need schedule history for review but cannot publish or delete.

## API Shape

### New Studio Endpoints

```http
GET    /studios/:studioId/schedules
POST   /studios/:studioId/schedules
GET    /studios/:studioId/schedules/:scheduleId
PATCH  /studios/:studioId/schedules/:scheduleId
DELETE /studios/:studioId/schedules/:scheduleId
GET    /studios/:studioId/schedules/:scheduleId/shows
POST   /studios/:studioId/schedules/:scheduleId/shows/assign
POST   /studios/:studioId/schedules/:scheduleId/shows/unassign
POST   /studios/:studioId/schedules/:scheduleId/shows/reorder
POST   /studios/:studioId/schedules/:scheduleId/validate
POST   /studios/:studioId/schedules/:scheduleId/publish
POST   /studios/:studioId/schedules/:scheduleId/duplicate
GET    /studios/:studioId/schedules/:scheduleId/snapshots
GET    /studios/:studioId/schedules/overview/monthly
```

### Role Access

| Operation | ADMIN | MANAGER | MEMBER |
| --- | --- | --- | --- |
| Create | ✅ | ✅ | ❌ |
| Read / List | ✅ | ✅ | ✅ (published only) |
| Update | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Validate | ✅ | ✅ | ❌ |
| Publish | ✅ | ❌ | ❌ |
| Duplicate | ✅ | ✅ | ❌ |
| View Snapshots | ✅ | ✅ | ❌ |
| Monthly Overview | ✅ | ✅ | ❌ |

### Error Codes

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `SCHEDULE_NOT_FOUND` | 404 | Schedule does not exist or belongs to different studio |
| `SHOW_NOT_FOUND` | 404 | Provided show does not exist or belongs to different studio |
| `SHOW_ALREADY_ASSIGNED_TO_OTHER_SCHEDULE` | 409 | Show is already linked to another schedule that cannot be overwritten by this action |
| `SCHEDULE_VERSION_CONFLICT` | 409 | Optimistic locking version mismatch |
| `SCHEDULE_ALREADY_PUBLISHED` | 400 | Attempt to modify a published schedule |
| `SCHEDULE_VALIDATION_FAILED` | 422 | Validation found conflicts (returned with detail payload) |

## Acceptance Criteria

- [ ] Studio ADMIN and MANAGER can create schedules scoped to their studio.
- [ ] Studio ADMIN and MANAGER can update draft schedules.
- [ ] Studio ADMIN and MANAGER can attach and remove same-studio shows from a draft schedule.
- [ ] Studio ADMIN and MANAGER can rearrange show order within a draft schedule.
- [ ] Studio ADMIN can publish schedules; MANAGER cannot.
- [ ] Studio ADMIN can soft-delete schedules; MANAGER cannot.
- [ ] Studio ADMIN and MANAGER can duplicate schedules.
- [ ] Studio ADMIN and MANAGER can validate schedules.
- [ ] Studio ADMIN and MANAGER can view schedule snapshots.
- [ ] Studio ADMIN and MANAGER can view monthly overview.
- [ ] MEMBER can view published schedules (read-only).
- [ ] Schedules are automatically scoped to the studio from the route.
- [ ] Published schedules cannot be modified (create new version instead).
- [ ] Published schedules expose their arranged show set read-only to studio viewers.
- [ ] `/admin/schedules` retains full capability for system admins.

## Design Reference

- Backend design: create with implementation PR under `apps/erify_api/docs/design/`
- Frontend design: create with implementation PR under `apps/erify_studios/docs/design/`
- Related admin controller: `apps/erify_api/src/admin/schedules/admin-schedule.controller.ts`
- Shift schedule pattern: `.agent/skills/shift-schedule-pattern/SKILL.md`
