---
name: schedule-continuity-workflow
description: Feature workflow for schedule planning continuity. Use when implementing or reviewing schedule update/validate/publish behavior, Google Sheets planning integration, and pending-resolution handling.
---

# Schedule Continuity Workflow

Use this skill for the schedule continuity feature across `erify_api`, `erify_studios`, and Google Sheets integration scripts.

## Canonical Feature Docs

1. `apps/erify_api/docs/PRD_SCHEDULE_PLANNING_TASK_CONTINUITY.md`
2. `apps/erify_api/docs/DESIGN_BE_SCHEDULE_DIFF_UPSERT_IMPLEMENTATION_PLAN.md`
3. `apps/erify_studios/docs/DESIGN_FE_SCHEDULE_CONTINUITY_IMPLEMENTATION_PLAN.md`

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
