---
name: schedule-continuity-workflow
description: Feature workflow for schedule planning continuity. Use when implementing or reviewing schedule update/validate/publish behavior, Google Sheets planning integration, and pending-resolution handling.
---

# Schedule Continuity Workflow

Use this skill for the schedule continuity feature across `erify_api`, `erify_studios`, and Google Sheets integration scripts, especially when work touches the boundary between schedule planning and studio show CRUD.

## Canonical Feature Docs

1. `apps/erify_api/docs/SCHEDULE_CONTINUITY.md`
2. `apps/erify_api/docs/SCHEDULE_PLANNING.md`
3. `docs/prd/studio-show-management.md`
4. `docs/prd/studio-schedule-management.md`
5. `apps/erify_api/docs/design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md`
6. `apps/erify_studios/docs/design/DESIGN_FE_SCHEDULE_CONTINUITY_IMPLEMENTATION_PLAN.md`

## Baseline Behavior

1. Schedule flow is `update -> validate -> publish`.
2. Publish is identity-preserving diff+upsert (no delete-all/recreate path).
3. Removed shows with active tasks move to `cancelled_pending_resolution`.
4. Removed shows without active tasks move to `cancelled`.
5. Reappearing shows (matched by `(client_id, external_id)`) are restored in place.

## Phase 4 Product Direction

1. Schedules are **grouping/date-range containers first** and planning artifacts second.
2. Schedule `status` (`draft`, `review`, `published`) is lightweight workflow metadata around the latest acknowledged plan, **not** a universal hard write lock across all show-management flows.
3. Google Sheets publish remains a **specialized planning-sync workflow**, not the only owner of later show mutations.
4. Studio show CRUD may assign, move, or clear same-studio schedule linkage without treating non-`draft` status as an automatic blocker.
5. If later product work needs stronger planning/finality semantics, prefer a dedicated stale/sync/settlement concept over overloading the current schedule `status`.
6. Exact schedule-range hard enforcement for manual show CRUD is deferred; when revisiting it, prefer warning-first UX/policy before introducing hard blocking.

## Contract Language

1. External API/contracts use `id` and `external_id`.
2. Internal implementation may use UID terminology for clarity.

## Implementation Guidance

When implementing or reviewing schedule/show interactions:

1. Preserve same-studio assignment boundaries and external-identity safety checks.
2. Do **not** add or preserve policy that blocks same-studio show reassignment solely because the target schedule is not `draft`.
3. Treat `published` as "latest acknowledged plan/member-visible state" rather than "immutable forever".
4. Keep publish-time continuity guarantees intact:
   - diff by `(client_id, external_id)`
   - preserve show identity across republish
   - preserve task-target linkage for matched shows
5. If a new requirement introduces finance or settlement lifecycle behavior, model it separately rather than folding it into schedule planning status by default.

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

## Checklist

- [ ] Show identity preserved across republish (by `(client_id, external_id)` match)
- [ ] Task targets remain linked for matched shows
- [ ] Removed shows with active tasks move to `cancelled_pending_resolution`
- [ ] Removed shows without active tasks move to `cancelled`
- [ ] Reappearing shows are restored in place
- [ ] External API uses `id` and `external_id` (not UIDs)
- [ ] Consistency verified across `@eridu/api-types`, backend, and frontend
- [ ] Same-studio show CRUD is not blocked solely by schedule planning status
- [ ] New workflow semantics do not overload schedule `status` with finance/settlement meaning
