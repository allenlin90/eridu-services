# Studio Schedule Management Backend Design

> **Status**: ⏸️ Deferred from Phase 4 (2026-04-22). Retained for reference.
> **Phase scope**: Revisit as part of the Client Portal workstream
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/studio-schedule-management.md`](../../../../docs/prd/studio-schedule-management.md)
> **Depends on**: studio show management shipped on `master`, existing admin schedule planning/publishing flows, schedule continuity rules

> **Deferral note**: This design was reviewed in April 2026 and deferred from Phase 4. The Google Sheets publish flow remains the production source of truth for schedule creation and publishing. Studio-native schedule management is paused pending Client Portal direction, at which point this design should be revisited against the then-current intake surface rather than retrofitted onto the current admin-centric model. Content below is preserved unchanged as reference.

## Purpose

Define the backend contract for studio-native schedule management without reusing the admin/Google Sheets schedule-planning contract as-is.

This design covers:

- studio-scoped schedule CRUD
- show assignment and unassignment through schedule workflows
- studio-native validation and publish
- snapshot-backed published read views for members
- monthly overview and snapshot history in studio scope

This design does **not** replace the existing admin schedule-planning workflow. The admin/Google Sheets path remains the JSON-plan-document owner. Studio-native schedule management is a separate contract over the same `Schedule`, `Show`, and `ScheduleSnapshot` tables.

## Problem This Design Solves

The current shared schedule model is shaped around admin planning:

- create/update contracts still require `plan_document`, `client_id`, and `created_by`
- publish means "sync plan document into normalized shows"
- duplicate clones the plan document
- update auto-drafts published schedules

Those behaviors conflict with the 1f PRD:

- studio schedules may be client-less
- studio create does not require a `planDocument`
- studio publish snapshots current FK-linked shows and does **not** process a `planDocument`
- `published` is a client-communication milestone, not a universal lock and not something that should auto-downgrade to `draft` on every edit

The backend therefore needs a studio-specific orchestration layer and studio-specific DTOs, while still reusing the underlying schedule/show repositories and continuity rules.

## Hard Invariants

1. **Studio-native schedule management gets its own API contract.**
   - Do not reuse the existing admin `createScheduleInputSchema` / `updateScheduleInputSchema` for studio routes.
   - The admin contract remains plan-document-centric.
   - Studio routes use new studio-specific request/response schemas under `@eridu/api-types/schedules`.

2. **Live schedule state and member-visible published state are distinct read models.**
   - Admins and managers read the current live schedule row and current FK-linked shows.
   - Members read the latest published snapshot, not the live row plus current `show.scheduleId` membership.
   - Editing a published schedule after publish must not silently change what members see until the next publish.

3. **Schedule status is a signal, not a write gate.**
   - `draft`, `review`, and `published` do not block same-studio show membership changes by themselves.
   - Do not port the admin auto-draft-on-update rule into studio-native routes.
   - Instead, expose whether the live schedule has unpublished changes.

4. **Show membership is owned by `Show.scheduleId`, not a duplicated schedule document.**
   - Assignment, unassignment, and movement update `Show.scheduleId` directly.
   - Same-studio and same-client boundaries are enforced on every write.

5. **Chronological ordering is the only V1 ordering model.**
   - Scheduled shows are returned ordered by `startTime ASC`.
   - No drag-and-drop ordering field or reorder endpoint in V1.

6. **Versioning applies to the live schedule workspace.**
   - Schedule metadata edits, schedule-side membership edits, and publish all increment `Schedule.version`.
   - Show-side reassignment remains last-write-wins, but it must still bump affected schedule versions so schedule workspaces can detect stale state.

7. **Operational-day validation must use an explicit timezone source.**
   - Do not use ambient runtime timezone.
   - Until studio timezone is modeled, use an explicit application business timezone fallback (`Asia/Bangkok`) through a shared helper.

## API Surface

| Endpoint                                                       | Purpose                                                    | Roles                        |
| -------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| `GET /studios/:studioId/schedules`                             | Studio schedule list                                       | `ADMIN`, `MANAGER`, `MEMBER` |
| `POST /studios/:studioId/schedules`                            | Create studio-native schedule                              | `ADMIN`, `MANAGER`           |
| `GET /studios/:studioId/schedules/:scheduleId`                 | Schedule detail                                            | `ADMIN`, `MANAGER`, `MEMBER` |
| `PATCH /studios/:studioId/schedules/:scheduleId`               | Update live schedule metadata/status (`draft` or `review`) | `ADMIN`, `MANAGER`           |
| `DELETE /studios/:studioId/schedules/:scheduleId`              | Soft-delete empty schedule                                 | `ADMIN`                      |
| `GET /studios/:studioId/schedules/:scheduleId/shows`           | Scheduled shows for live or published view                 | `ADMIN`, `MANAGER`, `MEMBER` |
| `POST /studios/:studioId/schedules/:scheduleId/shows/assign`   | Assign or move shows into target schedule                  | `ADMIN`, `MANAGER`           |
| `POST /studios/:studioId/schedules/:scheduleId/shows/unassign` | Remove shows from schedule                                 | `ADMIN`, `MANAGER`           |
| `POST /studios/:studioId/schedules/:scheduleId/validate`       | Validate live schedule membership                          | `ADMIN`, `MANAGER`           |
| `POST /studios/:studioId/schedules/:scheduleId/publish`        | Create member-visible published snapshot                   | `ADMIN`                      |
| `POST /studios/:studioId/schedules/:scheduleId/duplicate`      | Duplicate as empty draft schedule                          | `ADMIN`, `MANAGER`           |
| `GET /studios/:studioId/schedules/:scheduleId/snapshots`       | List published snapshots for audit                         | `ADMIN`, `MANAGER`           |
| `GET /studios/:studioId/snapshots/:snapshotId`                 | Read one studio-publish snapshot document                  | `ADMIN`, `MANAGER`           |
| `GET /studios/:studioId/schedules/overview/monthly`            | Studio-scoped monthly overview                             | `ADMIN`, `MANAGER`           |

Notes:

- `GET /studios/:studioId/schedules` already exists as a studio-scoped paginated endpoint. It stays the lookup endpoint for show management and is extended into the canonical list endpoint rather than split.
- The new `GET /studios/:studioId/snapshots/:snapshotId` endpoint is added because "view snapshot history" is not operationally useful without snapshot content.

## Contract Strategy

Add studio-specific schemas instead of mutating the current admin contract into a compromise shape.

Recommended additions in `@eridu/api-types/schedules`:

- `createStudioScheduleInputSchema`
- `updateStudioScheduleInputSchema`
- `duplicateStudioScheduleInputSchema`
- `assignStudioScheduleShowsInputSchema`
- `unassignStudioScheduleShowsInputSchema`
- `publishStudioScheduleInputSchema`
- `studioScheduleListItemSchema`
- `studioScheduleDetailSchema`
- `studioScheduleShowSchema`
- `studioScheduleValidationResultSchema`
- `studioScheduleMonthlyOverviewSchema`
- `studioPublishedSnapshotSchema`

Keep existing admin schemas for:

- `/admin/schedules`
- `/google-sheets/schedules/*`
- legacy plan-document snapshot flows

### Create Schedule Request

Studio create request should be minimal and studio-native:

- required:
  - `name`
  - `start_date`
  - `end_date`
- optional:
  - `client_id`
  - `metadata`

Explicit exclusions:

- no `plan_document`
- no `created_by` from the client payload
- no `published_by`
- no `status=published` on create

The route forces studio scope. `createdBy` is injected from the authenticated user.

### Update Schedule Request

Studio update should support:

- `name`
- `start_date`
- `end_date`
- `client_id`
- `metadata`
- `status`
  - allowed values: `draft`, `review`
- `version`

Explicit exclusions:

- no `plan_document`
- no `status=published` through PATCH
- no studio reassignment through body payload

If `client_id` changes, validate all currently linked live shows against the new client boundary in the same transaction.

### Duplicate Schedule Request

Studio duplicate should be explicit rather than cloning the old date range blindly:

- required:
  - `name`
  - `start_date`
  - `end_date`
  - `version`
- optional:
  - `client_id`
  - `metadata`

Behavior:

- duplicate always creates a new `draft` schedule
- duplicate never copies live show membership
- duplicate never copies plan-document-style show payloads

### Assign / Unassign Request

Assign request:

```json
{
  "show_ids": ["show_a", "show_b"],
  "version": 7,
  "source_schedule_id": "schedule_old"
}
```

Rules:

- `show_ids` belong to the same studio
- each show satisfies same-client boundary with the target schedule
- if a show is currently linked to another schedule:
  - allow move only when `source_schedule_id` matches the current source schedule
  - otherwise return `SHOW_ALREADY_ASSIGNED_TO_OTHER_SCHEDULE`
- transaction updates target show rows and bumps schedule versions for all affected schedules

Unassign request:

```json
{
  "show_ids": ["show_a", "show_b"],
  "version": 8
}
```

Rules:

- each show must currently belong to this schedule
- transaction clears `show.scheduleId` and bumps the schedule version

### Publish Request

Studio publish request:

```json
{
  "version": 9
}
```

Publish does not accept a `planDocument`. It snapshots current live state.

## Response Model

### Live schedule list/detail for admin and manager

List/detail responses should include enough information for the schedule workspace and publish banner:

- core schedule fields
  - `id`
  - `name`
  - `start_date`
  - `end_date`
  - `status`
  - `version`
  - `metadata`
  - `client_id`
  - `client_name`
- live membership summary
  - `show_count`
  - `first_show_start_time`
  - `last_show_start_time`
- publish metadata
  - `published_at`
  - `published_by`
  - `last_published_snapshot_id`
  - `last_published_snapshot_version`
  - `has_unpublished_changes`

`has_unpublished_changes` is computed as:

```text
false if no published snapshot exists
false if latest published snapshot version == current schedule version
true  otherwise
```

This keeps `status` as business signal while still telling operators that the live workspace differs from the last member-visible state.

### Member schedule list/detail

For `MEMBER`, the same endpoints return a snapshot-backed projection:

- only schedules with an existing published snapshot are visible
- top-level schedule fields come from the latest studio-publish snapshot document
- shows come from the latest studio-publish snapshot document
- no live-only fields such as `has_unpublished_changes`

The member view should still use the stable live schedule UID as `id`, but all display fields are materialized from the latest published snapshot.

### Scheduled show item

The schedule show item should be a lean, FE-ready projection:

- `id`
- `external_id`
- `name`
- `start_time`
- `end_time`
- `client_id`
- `client_name`
- `studio_room_id`
- `studio_room_name`
- `show_type_id`
- `show_type_name`
- `show_standard_id`
- `show_standard_name`
- `show_status_id`
- `show_status_name`
- `creator_count`
- `creator_names[]`
- `platform_names[]`

Use `id` / `external_id` at the API boundary.

## Published Snapshot Document

`ScheduleSnapshot.planDocument` is reused as the JSON storage column for studio-publish documents, but the document shape is not the legacy planning document.

Recommended studio-publish snapshot envelope:

```json
{
  "source": "studio_schedule_publish_v1",
  "schedule": {
    "id": "schedule_x",
    "name": "May 2026 Main Campaign",
    "start_date": "2026-05-01T00:00:00.000Z",
    "end_date": "2026-05-31T00:00:00.000Z",
    "status": "published",
    "client_id": "client_x",
    "client_name": "Client X",
    "metadata": {},
    "published_at": "2026-05-02T03:00:00.000Z",
    "published_by": "user_x",
    "published_by_name": "Alice"
  },
  "shows": [
    {
      "id": "show_x",
      "external_id": "show_abcd1234",
      "name": "Launch Stream",
      "start_time": "2026-05-03T12:00:00.000Z",
      "end_time": "2026-05-03T14:00:00.000Z",
      "studio_room_id": "room_x",
      "studio_room_name": "Main Room",
      "show_status_id": "status_confirmed",
      "show_status_name": "Confirmed",
      "creator_names": ["Alice MC"],
      "platform_names": ["TikTok"]
    }
  ],
  "summary": {
    "show_count": 1
  }
}
```

Snapshot metadata expectations:

- new `snapshotReason` enum value: `studio_publish`
- snapshot `status` is always `published`
- snapshot `version` equals the **new** schedule version after publish succeeds

This lets studio publish snapshots coexist with legacy plan-document snapshots without pretending they are the same document type.

## Mutation Rules

### Create

1. Force studio scope from route and authenticated membership.
2. Validate date range.
3. Accept optional client.
4. Persist empty live schedule with:
   - `status = draft`
   - `version = 1`
   - `planDocument = {}`
5. Return live schedule summary.

`planDocument` remains an internal compatibility field for the shared table, but studio-native routes should treat it as implementation detail, not public contract.

### Update

1. Load schedule scoped to studio.
2. Validate optimistic lock via `version`.
3. Validate date range.
4. If `client_id` changes:
   - load current linked live shows
   - reject when any show would violate same-client boundary
5. Apply metadata/status updates.
6. Increment `Schedule.version`.
7. Do **not** auto-draft a published schedule.

### Assign / Move

1. Load target schedule scoped to studio.
2. Validate optimistic lock via target schedule `version`.
3. Load requested shows with current `scheduleId`, `clientId`, and `studioId`.
4. Enforce:
   - same studio
   - same client boundary
   - current source schedule match when moving
5. In one transaction:
   - update `Show.scheduleId`
   - increment target schedule version
   - increment any affected source schedule version
6. Return updated target schedule summary and scheduled show count.

### Unassign

1. Load target schedule scoped to studio.
2. Validate optimistic lock via `version`.
3. Clear `Show.scheduleId` for requested member shows only.
4. Increment target schedule version.

### Validate

Studio-native validation reads current FK-linked shows, not `planDocument`.

Validation categories:

- blocking errors
  - room overlap within the schedule
  - invalid show ownership or relational state discovered at read time
- warnings
  - show operational day outside schedule range
  - show has no assigned creator

Response shape should expose:

- `is_valid`
- `errors[]`
- `warnings[]`
- `summary`
  - `scheduled_show_count`
  - `error_count`
  - `warning_count`

Publish should fail on blocking errors and proceed with warnings.

### Publish

1. Load schedule scoped to studio.
2. Validate optimistic lock via `version`.
3. Re-run studio-native validation inside the publish transaction.
4. Reject on blocking validation errors.
5. Load live linked shows with the relations needed for snapshot serialization.
6. Increment schedule version.
7. Create `studio_publish` snapshot whose document captures current schedule metadata and current linked shows.
8. Update schedule:
   - `status = published`
   - `publishedAt = now`
   - `publishedBy = current user`
   - `version = incremented value`
9. Return updated live schedule summary and publish metadata.

This path does **not** call `SchedulePlanningService.publishSchedule()` and does **not** touch Google Sheets plan-document logic.

### Duplicate

1. Load source schedule scoped to studio.
2. Validate optimistic lock via source `version`.
3. Create new schedule with:
   - caller-supplied `name`
   - caller-supplied `start_date`
   - caller-supplied `end_date`
   - optional caller-supplied `client_id`, defaulting to source client
   - copied metadata unless overridden
   - `status = draft`
   - `version = 1`
4. Do not create a snapshot.
5. Do not copy live show membership.

### Delete

Delete must stay conservative.

Rule:

- allow delete only when the live schedule has zero linked live shows

Reason:

- deleting a schedule that still owns active shows would either orphan billing/grouping semantics or silently clear show linkage
- the PRD did not ask for archive/mass-unlink behavior

Return `SCHEDULE_HAS_ASSIGNED_SHOWS` when delete is attempted on a non-empty schedule.

Snapshots remain immutable and queryable after the schedule row is soft-deleted only where operationally needed by admin tooling; studio routes do not need to surface deleted schedules in V1.

## Timezone Resolution for Operational-Day Validation

Studio-native validation needs a deterministic timezone source now, before studio-level timezone configuration exists.

Decision for 1f:

- introduce a shared backend helper such as `resolveBusinessTimeZoneForStudio(studioUid)`
- current implementation returns:
  - studio-configured timezone once that field exists
  - otherwise explicit application default timezone `Asia/Bangkok`

Do **not** use:

- `Intl.DateTimeFormat().resolvedOptions().timeZone`
- host OS timezone
- Node runtime timezone by accident

This keeps validation deterministic and aligned with the ideation fallback direction, while leaving true studio-level timezone correctness as later work.

## Implementation Shape

Recommended backend module:

```text
apps/erify_api/src/studios/studio-schedule/
  ├── studio-schedule.controller.ts
  ├── studio-schedule.module.ts
  ├── studio-schedule-management.service.ts
  ├── studio-schedule-publishing.service.ts
  └── studio-schedule-validation.service.ts
```

Responsibilities:

- `StudioScheduleController`
  - role-gated studio routes
  - request/response DTO mapping only
- `StudioScheduleManagementService`
  - studio-scoped CRUD, assign, unassign, duplicate, delete
- `StudioSchedulePublishingService`
  - validation + snapshot serialization + publish transaction
- `StudioScheduleValidationService`
  - live show validation, operational-day boundary, warning/error shaping

Reuse, do not fork:

- `ScheduleService` for basic schedule persistence helpers
- `ScheduleSnapshotService` for immutable snapshot writes/reads
- show repositories/services for loading linked shows
- existing schedule monthly overview query helpers where they already fit

Do not overload:

- `SchedulePlanningService`
- existing plan-document `ValidationService`
- admin controller DTOs

Those paths remain Google Sheets/admin specific.

## Error Contract

Keep PRD errors and add one conservative delete/client-mutation error.

| Code                                      | HTTP | Meaning                                                                                                       |
| ----------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `SCHEDULE_NOT_FOUND`                      | 404  | Schedule missing or outside studio scope                                                                      |
| `SHOW_NOT_FOUND`                          | 404  | Show missing or outside studio scope                                                                          |
| `SHOW_ALREADY_ASSIGNED_TO_OTHER_SCHEDULE` | 409  | Move request omitted or mismatched source schedule                                                            |
| `SCHEDULE_VERSION_CONFLICT`               | 409  | Supplied live version mismatched current schedule version                                                     |
| `SCHEDULE_ALREADY_PUBLISHED`              | 400  | Publish attempted with no live changes and no new publish needed, or request policy forbids duplicate publish |
| `SCHEDULE_VALIDATION_FAILED`              | 422  | Blocking validation errors found during publish                                                               |
| `SHOW_CLIENT_MISMATCH`                    | 422  | Show and schedule client boundaries differ                                                                    |
| `SCHEDULE_HAS_ASSIGNED_SHOWS`             | 422  | Delete attempted on schedule with linked live shows                                                           |

`SCHEDULE_ALREADY_PUBLISHED` should be used narrowly. A schedule that is already in `published` status but has `has_unpublished_changes=true` is still publishable again.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`
- `pnpm --filter erify_api build`

Targeted backend tests:

- create client-less studio schedule
- update published schedule without auto-drafting it
- assign unscheduled same-client show
- move show from source schedule with matching `source_schedule_id`
- reject move when `source_schedule_id` mismatches
- reject client-boundary mismatch
- validate operational-day edge cases around `06:00`
- publish creates `studio_publish` snapshot with snapshot-backed member payload
- member read returns published snapshot instead of live linked shows after post-publish edits
- show-side reassignment bumps affected schedule versions
- duplicate creates empty draft with caller-supplied dates
- delete rejects non-empty schedule
