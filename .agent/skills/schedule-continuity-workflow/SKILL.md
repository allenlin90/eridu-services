---
name: schedule-continuity-workflow
description: Feature workflow for schedule planning continuity. Use when implementing or reviewing schedule update/validate/publish behavior, Google Sheets planning integration, and pending-resolution handling.
---

# Schedule Continuity Workflow

Use this skill for the schedule continuity feature across `erify_api`, `erify_studios`, and Google Sheets integration scripts.

## Canonical Feature Docs

1. `apps/erify_api/docs/SCHEDULE_CONTINUITY.md`
2. `apps/erify_api/docs/design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md`
3. `apps/erify_studios/docs/design/DESIGN_FE_SCHEDULE_CONTINUITY_IMPLEMENTATION_PLAN.md`

## Baseline Behavior

1. Schedule flow is `update -> validate -> publish`.
2. Publish is identity-preserving diff+upsert (no delete-all/recreate path).
3. Removed shows with active tasks move to `cancelled_pending_resolution`.
4. Removed shows without active tasks move to `cancelled`.
5. Reappearing shows (matched by `(client_id, external_id)`) are restored in place.

## Contract Language

1. External API/contracts use `id` and `external_id`.
2. Internal implementation may use UID terminology for clarity.

## Review Focus

1. Identity continuity (show IDs/UIDs preserved across republish).
2. Task continuity (task targets remain linked for matched shows).
3. Pending-resolution visibility and resolution flow for studio/system admins.
4. Consistency across API types, backend behavior, and FE/status UX.

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
