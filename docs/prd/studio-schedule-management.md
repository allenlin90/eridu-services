# PRD: Studio Schedule Management

> **Status**: ⏸️ Deferred from Phase 4 (2026-04-22)
> **Phase**: Revisit as part of the Client Portal workstream
> **Workstream**: Studio self-service — schedule lifecycle management
> **Depends on**: Studio Show Management (schedules group shows; studios must own show lifecycle first)
> **Blocks**: (none after deferral — 2a Studio Economics Review depends on `Show.scheduleId` which is already shipped via 1e)

> **Deferral note (2026-04-22)**: The Google Sheets schedule flow is stable and planners prefer its UX for monthly planning. Studio-native autonomy for schedule creation is nice-to-have rather than operational pain, and the future client-portal direction (direct client submission + AI-assisted intake) is speculative enough that a studio-native schedule UX risks rework. Re-evaluation of `GET /studios/:studioId/schedules` confirmed 1f is **not** a hard dependency for `2a Studio Economics Review`: the real data dependency is `Show.scheduleId` populated, which the admin/Google Sheets publish flow already covers. Phase 4 re-sequences around the true L-side critical path: `R → R+ → E0 → 2a → 2b`. Design body below is retained as reference for a future revisit.

## Problem

Schedules are the primary organizational and billing unit for a studio's work — they group shows for a client engagement (typically monthly, sometimes custom) and serve as the container for quotation estimates and actual-cost invoicing. Studios have **no studio-scoped schedule management surface** today beyond a limited lookup endpoint added for show assignment.

Current state:

- `/admin/schedules` provides full CRUD, bulk operations, validation, publishing, duplication, snapshot history, and monthly overview — all reserved for system admins.
- Studios have no studio-scoped schedule management endpoints; only a read-only lookup endpoint exists for the show-assignment combobox from 1e.
- Studios can manage shifts (via `/studios/:studioId/shifts`) but cannot see or manage the schedules that contain their shows.
- Studios cannot assign existing shows into schedules, remove them, or rearrange the order of shows inside a schedule from studio scope.

Operational context:

- Clients send requirements in advance (typically 20th–end of month for the next period) listing shows they want produced under a monthly engagement.
- The studio creates a schedule for that client, adds the client-provided shows, arranges them, resolves time conflicts, and confirms back to the client.
- A schedule is the billing unit: it is used first for projected cost estimation (quotation) and then as the basis for actual-cost invoicing after the period ends.
- While the default policy is monthly, the model supports any date range to handle campaign-based or project-based engagements.

Consequences today:

- Studio admins cannot create period schedules for their shows without system-admin intervention.
- Studio admins cannot group existing shows into the intended schedule as client requests change.
- Schedule publishing or plan acknowledgment still requires system admin action.
- Studios cannot view schedule history or snapshots for audit/review.
- The monthly overview (schedule grouping by client) is only visible to system admins, not to studio operators who need it for planning.
- Bulk schedule operations (common for multi-client studios) require system admin involvement.

## Users

- **Studio ADMIN** (primary): create, update, validate, publish, duplicate, and soft-delete schedules
- **Studio MANAGER** (secondary): create and update schedules; view snapshots; cannot publish or delete
- **Studio MEMBER** (read-only): view published schedules for operational awareness
- **System Admin**: retains cross-studio schedule governance via `/admin/schedules`

## Existing Infrastructure

| Surface / Model                    | Current Behavior                                                                  | Status                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `/admin/schedules`                 | Full CRUD + validate/publish/duplicate/bulk/monthly overview                      | ✅ Exists                                                   |
| Studios                            | No studio schedule management endpoints; only a read-only lookup endpoint exists  | ❌ Missing                                                  |
| `Schedule` model                   | Studio-scoped via `studioId` FK; supports soft-delete, snapshots, published state | ✅ Exists                                                   |
| `Snapshot` model                   | Versioned schedule history (immutable after creation)                             | ✅ Exists                                                   |
| `Show.scheduleId`                  | Nullable FK linking a show to a schedule                                          | ✅ Exists                                                   |
| `GET /studios/:studioId/schedules` | Delivered in 1e as a read-only lookup for show assignment combobox                | ✅ Exists (read-only)                                       |
| `/studios/:studioId/shifts`        | Full shift CRUD at studio level                                                   | ✅ Exists                                                   |
| `ScheduleService`                  | Full business logic; reusable for studio controller                               | ✅ Exists                                                   |
| `SchedulePlanningService`          | Validate + publish (Google Sheets plan document flow)                             | ✅ Exists — studio publish is a lighter variant (see below) |

## Requirements

### In Scope

1. **Studio-scoped schedule CRUD**
   - Studio admins and managers can create schedules from the studio workspace.
   - Schedules are automatically scoped to the current studio.
   - Required fields: `name`, `startDate`, `endDate`
   - Optional fields: `clientUid`, `metadata`
   - `clientUid` is optional — a schedule may be studio-internal (e.g., promoting owned channels) without a client link.
   - Creating a schedule does not require any shows to be attached at creation time.

2. **Show assignment and arrangement inside schedules**
   - Studio admins and managers can attach existing same-studio shows to a schedule.
   - They can remove a show from a schedule without deleting the show itself.
   - They can move a show from one same-studio schedule to another same-studio schedule.
   - The schedule workspace must show both scheduled shows and an unscheduled backlog/picker so the assignment flow is actionable.
   - Schedule status must not be the sole hard lock on show membership changes (per skill guardrail).
   - **Show ordering**: In V1, shows within a schedule are ordered by `startTime` (chronological). Custom drag-and-drop display ordering is deferred; the `reorder` endpoint is out of scope for V1.
   - Same-client constraint: a show can only be assigned to a schedule owned by the same studio. If the schedule is client-linked, the show must have the same client. If the schedule is client-less, only client-less shows may be assigned.

3. **Schedule validation**
   - Studio admins and managers can validate a schedule (check for conflicts, missing assignments).
   - Returns validation results without modifying state.
   - Validation includes: out-of-range show timing warnings, shows with no creator assignment, time conflicts between shows in the same room.
   - Show-range validation uses the **operational day boundary rule** (see below).

4. **Schedule publishing**
   - Studio admins only can publish a schedule.
   - **Studio publish semantics are distinct from the admin/Google Sheets publish flow**: studio publish does NOT process a `planDocument` from an external source. Instead, it:
     1. Reads the current shows linked to the schedule via `scheduleId` FK.
     2. Creates an immutable snapshot capturing the current show set and schedule state.
     3. Sets schedule `status` to `published` and records `publishedAt` / `publishedBy`.
   - Published schedules are visible to all studio members.
   - Publishing is not a blanket write lock; later show edits or reassignments may still occur and will require a refreshed publish to update member-visible state.

5. **Schedule duplication**
   - Studio admins and managers can duplicate a schedule as a starting point for a new period.
   - Duplicated schedule starts in `draft` state.
   - Duplicated schedule is empty — shows are **not** carried over. The operator adds shows for the new period fresh.
   - Rationale: shows are time-bound (specific `startTime`/`endTime`); carrying them over would create stale time references.

6. **Snapshot history**
   - Studio admins and managers can view schedule snapshots for audit trail.
   - Read-only access to previous versions.

7. **Monthly overview**
   - Expose the monthly schedule overview (grouped by client) at studio level.
   - Available to admins and managers for operational planning.
   - Scoped to the requesting studio only — no cross-studio visibility.

8. **Preserve admin governance**
   - `/admin/schedules` retains full capability for cross-studio management.
   - Bulk operations remain admin-only in V1 (studio context is single-studio).

### Out of Scope

- Custom drag-and-drop show ordering within a schedule (V1 sort = chronological by `startTime`)
- Bulk schedule creation/update at studio level (admin-only in V1)
- Cross-studio schedule visibility
- Schedule-to-schedule comparison or diff views
- Automated schedule generation from templates
- Google Sheets integration at studio level (admin-only integration)
- Frozen publish-order analytics or variance tracking across snapshots
- Invoice generation or quotation document output (finance engine is a later phase)
- Client app schedule creation or upload (future phase)

## Desired User Flow

1. A studio admin opens the schedules section in the studio workspace.
2. They create a new monthly schedule, linking a client (optional but typical).
3. They add existing same-studio shows into the schedule from the studio show pool and the shows are displayed in chronological order.
4. They review the schedule contents (shows, their times, any conflicts).
5. They validate the schedule to check for time/room conflicts and missing creator assignments.
6. When satisfied, they publish the schedule (creates a snapshot; sets status to `published`; visible to all studio members).
7. Managers and members can view published schedules.
8. For the next period, the admin duplicates last month's schedule (empty copy), then adds the new client-provided shows.

## Schedule Status Semantics

| Status      | Meaning                                                                                           | Who sets it                           |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `draft`     | Initial state; work in progress                                                                   | System (on create); auto on duplicate |
| `review`    | Studio has shared the schedule with the client for confirmation; internal changes may still occur | ADMIN or MANAGER                      |
| `published` | Client has confirmed; plan is member-visible and ready for billing reference                      | ADMIN only                            |

### Key Distinction: Status is a Client-Communication Signal, Not an Operational Gate

For studio-native schedule management, a schedule is **operationally active the moment it is created**. Studios do not need to publish a schedule to start assigning shows, planning, or executing work.

- `draft` and `review` schedules are fully usable internally — shows can be assigned/removed, shifts can reference the same period.
- `published` is a **client-facing milestone**: it records that the client has confirmed the engagement and creates an immutable snapshot for audit and billing reference.
- This is fundamentally different from the **Google Sheets publish path**, where publishing was the mechanism that synced shows into the DB from an external plan document. In the studio-native path, shows already exist via `scheduleId` FK — publish only creates a snapshot and updates the status signal.
- Studio show CRUD may assign, move, or clear same-studio schedule linkage regardless of schedule status.
- If a future product need requires hard finality or settlement semantics (e.g., invoice lock), model it as a separate billing status — do not overload `published`.
- Finance/billing lifecycle (invoice state, payment, settlement) is deferred — do not introduce it into schedule status during Phase 4.

## Show-Schedule Membership: Operational Day Boundary

A show belongs to a schedule's period based on its **operational day**, not its raw datetime. The 06:00 rule applies against the show's **intended studio-local day**: a show whose `startTime` is before 06:00 belongs to the **previous** calendar day.

### Rule

```
show.operationalDay = (show.startTime.local < 06:00)
                      ? show.startTime.localDate - 1 day
                      : show.startTime.localDate

show is within schedule if:
    show.operationalDay >= schedule.startDate
    AND show.operationalDay <= schedule.endDate
```

### Examples

| Show startTime (intended studio-local time) | Operational day | January schedule (Jan 1–31)     |
| ------------------------------------------- | --------------- | ------------------------------- |
| Jan 1 03:00                                 | Dec 31          | ❌ Belongs to December           |
| Jan 1 07:00                                 | Jan 1           | ✓ Valid                         |
| Jan 31 23:00                                | Jan 31          | ✓ Valid                         |
| Feb 1 02:00                                 | Jan 31          | ✓ Valid — overnight Jan 31 show |
| Feb 1 06:00                                 | Feb 1           | ❌ First show of February        |

The existing `ValidationService` uses strict datetime comparison and does not apply this boundary. The studio-native validation in 1f must implement this rule.

### Timezone Note

Timestamps are stored as UTC instants. The intended 06:00 cutoff for **schedule membership** is based on the studio's local timezone, not UTC. Studio-level timezone configuration is not yet modeled in the system. Until it is:
- Do **not** derive this cutoff from the ambient server or worker runtime timezone.
- Treat exact timezone resolution for hard backend validation as an explicit implementation dependency to record in the design PR.
- This PRD does **not** change the current shift-planning / duty-manager coverage bucketing, which remains on its existing 06:00 UTC backend rule until revisited separately.
- Improving timezone resolution is tracked in the ideation backlog.

## Economics Implications

- A schedule is the primary grouping unit for cost aggregation per client engagement.
- The Phase 4 economics engine (2a) will aggregate projected and actual show costs at the schedule level.
- Each show's cost (creator compensation + labor) rolls up to its linked schedule for period-level P&L.
- Invoicing logic per client (different contract and calculation rules) is deferred to a later phase.
- For Phase 4, the goal is: know what a schedule costs across its shows (projected from rates, actual from completed tasks and compensation line items).

## API Shape

### New Studio Endpoints

```http
GET    /studios/:studioId/schedules              ← already exists (read-only lookup from 1e); extend to full list
POST   /studios/:studioId/schedules
GET    /studios/:studioId/schedules/:scheduleId
PATCH  /studios/:studioId/schedules/:scheduleId
DELETE /studios/:studioId/schedules/:scheduleId
GET    /studios/:studioId/schedules/:scheduleId/shows
POST   /studios/:studioId/schedules/:scheduleId/shows/assign
POST   /studios/:studioId/schedules/:scheduleId/shows/unassign
POST   /studios/:studioId/schedules/:scheduleId/validate
POST   /studios/:studioId/schedules/:scheduleId/publish
POST   /studios/:studioId/schedules/:scheduleId/duplicate
GET    /studios/:studioId/schedules/:scheduleId/snapshots
GET    /studios/:studioId/schedules/overview/monthly
```

**Note**: The `reorder` endpoint is deferred (V1 uses chronological sort by `startTime`).

### Role Access

| Operation        | ADMIN | MANAGER | MEMBER             |
| ---------------- | ----- | ------- | ------------------ |
| Create           | ✅     | ✅       | ❌                  |
| Read / List      | ✅     | ✅       | ✅ (published only) |
| Update           | ✅     | ✅       | ❌                  |
| Delete           | ✅     | ❌       | ❌                  |
| Validate         | ✅     | ✅       | ❌                  |
| Publish          | ✅     | ❌       | ❌                  |
| Duplicate        | ✅     | ✅       | ❌                  |
| View Snapshots   | ✅     | ✅       | ❌                  |
| Monthly Overview | ✅     | ✅       | ❌                  |
| Assign Shows     | ✅     | ✅       | ❌                  |
| Unassign Shows   | ✅     | ✅       | ❌                  |

### Error Codes

| Code                                      | HTTP Status | Condition                                                                            |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `SCHEDULE_NOT_FOUND`                      | 404         | Schedule does not exist or belongs to different studio                               |
| `SHOW_NOT_FOUND`                          | 404         | Provided show does not exist or belongs to different studio                          |
| `SHOW_ALREADY_ASSIGNED_TO_OTHER_SCHEDULE` | 409         | Show is already linked to another schedule that cannot be overwritten by this action |
| `SCHEDULE_VERSION_CONFLICT`               | 409         | Optimistic locking version mismatch                                                  |
| `SCHEDULE_ALREADY_PUBLISHED`              | 400         | Attempt to publish a schedule that is already in published state                     |
| `SCHEDULE_VALIDATION_FAILED`              | 422         | Validation found conflicts (returned with detail payload)                            |
| `SHOW_CLIENT_MISMATCH`                    | 422         | Show belongs to a different client than the schedule                                 |

## Acceptance Criteria

- [ ] Studio ADMIN and MANAGER can create schedules scoped to their studio.
- [ ] Studio ADMIN and MANAGER can update schedules scoped to their studio.
- [ ] Studio ADMIN and MANAGER can attach and remove same-studio shows from a schedule.
- [ ] Show assignment enforces same-studio and same-client constraints.
- [ ] Shows within a schedule are returned ordered by `startTime` (chronological).
- [ ] Studio ADMIN can publish schedules using the studio-native publish flow (snapshot + status update, no planDocument processing).
- [ ] MANAGER cannot publish.
- [ ] Studio ADMIN can soft-delete schedules; MANAGER cannot.
- [ ] Studio ADMIN and MANAGER can duplicate schedules; duplicate is always empty (no shows carried over).
- [ ] Studio ADMIN and MANAGER can validate schedules.
- [ ] Studio ADMIN and MANAGER can view schedule snapshots.
- [ ] Studio ADMIN and MANAGER can view monthly overview (studio-scoped).
- [ ] MEMBER can view published schedules (read-only).
- [ ] Schedules are automatically scoped to the studio from the route.
- [ ] Schedule status (`draft`, `review`, `published`) does not hard-block same-studio show membership changes.
- [ ] Publishing captures an immutable snapshot of the current show set and schedule state.
- [ ] Published schedules expose their last published show set as read-only to studio members.
- [ ] `/admin/schedules` retains full capability for system admins.
- [ ] `GET /studios/:studioId/schedules` existing lookup behavior is preserved for the show-management combobox.

## Product Decisions

- **Schedules are grouping/billing containers first** — grouping shows into a period for client engagements, projected cost estimation, and actual-cost invoicing. Planning/publish state is secondary.
- **Operationally active from creation** — studio-native schedules are live the moment they are created. `published` is a client-communication and billing milestone, not an internal operational gate. Studios work on `draft` and `review` schedules just as freely as `published` ones.
- **Studio publish is distinct from admin publish** — studio publish creates a snapshot from the current FK-linked show set; it does not process a `planDocument`. The admin/Google Sheets publish flow is unchanged.
- **V1 show ordering = chronological** — shows within a schedule are sorted by `startTime`. Custom display ordering is deferred.
- **Duplicate = empty schedule** — shows are time-bound; a new period gets fresh shows from client requirements.
- **Client is optional on schedule** — supports studio-internal schedules (own channels, campaigns). Default case is client-linked.
- **Schedule status is operational signal, not hard lock** — `review` = client confirmation phase; `published` = confirmed, member-visible. Neither blocks show mutations.
- **Snapshot access for managers** — managers need schedule history for review but cannot publish or delete.
- **Cross-studio visibility is deferred** — studios see only their own schedules.
- **Finance/settlement lifecycle is deferred** — invoice/payment semantics should be modeled separately, not folded into schedule status.
- **Bulk operations remain admin-only** — studios operate on single schedules; cross-studio bulk is a system concern.

## Design Reference

- Backend design: create with implementation PR under `apps/erify_api/docs/design/STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md`
- Frontend design: create with implementation PR under `apps/erify_studios/docs/design/STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md`
- Related admin controller: `apps/erify_api/src/admin/schedules/admin-schedule.controller.ts`
- Shift schedule pattern: `.agent/skills/shift-schedule-pattern/SKILL.md`
- Schedule continuity workflow: `.agent/skills/schedule-continuity-workflow/SKILL.md`
