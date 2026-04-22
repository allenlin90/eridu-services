---
name: schedule-continuity-workflow
description: Feature workflow for schedule planning continuity. Use when implementing or reviewing schedule update/validate/publish behavior, Google Sheets planning integration, and pending-resolution handling.
---

# Schedule Continuity Workflow

Use this skill for the schedule continuity feature across `erify_api`, `erify_studios`, and Google Sheets integration scripts, especially when work touches the boundary between schedule planning and studio show CRUD.

## Canonical Feature Docs

1. `apps/erify_api/docs/SCHEDULE_CONTINUITY.md`
2. `apps/erify_api/docs/SCHEDULE_PLANNING.md`
3. `docs/features/studio-show-management.md`
4. `docs/prd/studio-schedule-management.md`
5. `apps/erify_api/docs/design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md`
6. `apps/erify_studios/docs/design/DESIGN_FE_SCHEDULE_CONTINUITY_IMPLEMENTATION_PLAN.md`

## Baseline Behavior

1. Schedule flow is `update -> validate -> publish`.
2. Publish is identity-preserving diff+upsert (no delete-all/recreate path).
3. Removed shows with active tasks move to `cancelled_pending_resolution`.
4. Removed shows without active tasks move to `cancelled`.
5. Reappearing shows (matched by `(client_id, external_id)`) are restored in place.

Current implementation boundary:

6. The shipped code covers diff+upsert publish, summary counters, and restore behavior.
7. The studio-scoped pending-resolution resolve endpoint / queue / CTA described in the MVP design docs are not fully shipped yet.

## Phase 4 Product Direction

1. Schedules are **grouping/date-range containers first** and planning artifacts second.
2. Schedule `status` (`draft`, `review`, `published`) is a **client-communication signal**, not an operational gate and not a universal hard write lock.
3. For studio-native schedule management (1f), a schedule is **operationally active from the moment it is created**. Studios do not need to publish to start assigning shows or executing work.
4. `published` means the client has confirmed the engagement and the plan is member-visible. It is a billing/audit milestone, not an internal execution prerequisite.
5. **Two distinct publish paths exist — do not conflate them:**
   - **Google Sheets path**: publish syncs a `planDocument` from an external source → creates/updates shows in the DB → creates snapshot. Shows may not exist before publish.
   - **Studio-native path** (1f): shows already exist via `scheduleId` FK. Publish only creates a snapshot of the current FK-linked show set and sets `status` to `published`. No `planDocument` processing occurs.
6. Google Sheets publish remains a **specialized planning-sync workflow**, not the only owner of later show mutations.
7. Studio show CRUD may assign, move, or clear same-studio schedule linkage without treating non-`draft` status as an automatic blocker.
8. If later product work needs stronger planning/finality semantics, prefer a dedicated stale/sync/settlement concept over overloading the current schedule `status`.
9. Exact schedule-range hard enforcement for manual show CRUD is deferred; when revisiting it, prefer warning-first UX/policy before introducing hard blocking.

## Contract Language

1. External API/contracts use `id` and `external_id`.
2. Internal implementation may use UID terminology for clarity.

## Implementation Guidance

When implementing or reviewing schedule/show interactions:

1. Preserve same-studio assignment boundaries and external-identity safety checks.
2. Preserve same-client schedule boundaries: a show must not be linked to a schedule owned by a different client, even within the same studio.
3. Do **not** add or preserve policy that blocks same-studio show reassignment solely because the target schedule is not `draft`.
4. Treat `published` as "latest acknowledged plan/member-visible state" rather than "immutable forever".
5. Keep publish-time continuity guarantees intact:
   - diff by `(client_id, external_id)`
   - preserve show identity across republish
   - preserve task-target linkage for matched shows
6. If a new requirement introduces finance or settlement lifecycle behavior, model it separately rather than folding it into schedule planning status by default.

## Review Focus

1. Identity continuity (show IDs/UIDs preserved across republish).
2. Task continuity (task targets remain linked for matched shows).
3. Pending-resolution visibility and resolution flow for studio/system admins.
4. Consistency across API types, backend behavior, and FE/status UX.
5. Schedule/show mutations do not accidentally reintroduce a "published means immutable" assumption unless the product docs explicitly changed.

## Resolution Endpoint Guideline (Reference)

For `cancelled_pending_resolution` resolution, prefer an explicit action endpoint over generic show PATCH when the flow requires:

1. state precondition checks (`CANCELLED_PENDING_RESOLUTION` only),
2. policy checks (for example active-task count rules),
3. mandatory reason/audit metadata,
4. deterministic domain-specific error responses.

Use generic status update endpoints only if the same guards/audit/error contract are enforced identically.

## Show-Schedule Membership: Operational Day Boundary

A show's membership in a schedule is determined by its **operational day**, not its raw datetime.

**Rule**: if `show.startTime` in the intended studio-local day is before 06:00, the show's operational day is the previous calendar day. The show belongs to a schedule if its operational day falls within `[schedule.startDate, schedule.endDate]`.

```
show.operationalDay = startTime.local < 06:00
                      ? startTime.localDate - 1 day
                      : startTime.localDate

valid = operationalDay >= schedule.startDate
     && operationalDay <= schedule.endDate
```

**Examples**:
- Jan 31 22:00 show → operational day Jan 31 → valid for January schedule
- Feb 1 02:00 show → operational day Jan 31 → valid for January schedule
- Jan 1 03:00 show → operational day Dec 31 → belongs to December, not January

The existing `ValidationService` uses strict datetime comparison and does not implement this rule. The studio-native validation (1f) must implement the operational day boundary for show-range checks.

**Timezone**: the intended 06:00 cutoff for schedule membership is studio-local time. Studio-level timezone is not yet modeled — deferred open item. Do **not** use ambient server/runtime timezone as an approximation for backend validation. Record the exact timezone-resolution approach in the implementation design, and keep current shift-alignment UTC bucketing unchanged unless that flow is explicitly revisited.

## Checklist

- [ ] Show identity preserved across republish (by `(client_id, external_id)` match)
- [ ] Task targets remain linked for matched shows
- [ ] Removed shows with active tasks move to `cancelled_pending_resolution`
- [ ] Removed shows without active tasks move to `cancelled`
- [ ] Reappearing shows are restored in place
- [ ] External API uses `id` and `external_id` (not UIDs)
- [ ] Consistency verified across `@eridu/api-types`, backend, and frontend
- [ ] Same-studio show CRUD is not blocked solely by schedule planning status
- [ ] Same-client schedule linkage is preserved for manual studio show CRUD
- [ ] New workflow semantics do not overload schedule `status` with finance/settlement meaning
