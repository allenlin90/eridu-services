# Studio Shift Schedule Features and Workflows

Last updated: March 5, 2026
Source design: `apps/erify_api/docs/design/STUDIO_SHIFT_SCHEDULE_DESIGN.md`
Branch: `feat/studio-shift-schedule`

This is the single consolidated record of features and changes implemented from the shift schedule design doc, including committed and in-progress branch work.

## Status Legend

- `Implemented`: Delivered and usable.
- `Partial`: Delivered core path, but refinement is still required.
- `Pending`: Not yet delivered.

## Design-to-Implementation Mapping

### 1. Data Model and Core Domain

Design intent:
- `StudioMembership.baseHourlyRate`
- `StudioShift` parent with `date`, cost fields, duty manager flag, status
- `StudioShiftBlock` children to support breaks and cross-midnight blocks

Status: `Implemented`

Delivered:
- Backend shift schema and relations were added and wired to API responses.
- Shift blocks are persisted and returned with each shift.
- Shift status and duty manager fields are available in API and frontend.
- Projected/finalized cost fields are included in shift model/DTO flow.

### 2. Shift Management APIs (Studio Scope)

Design intent:
- Create/list/update/delete shifts
- Duty manager assignment endpoint
- Resolve active duty manager by timestamp

Status: `Implemented`

Delivered endpoints:
- `GET /studios/:studioId/shifts`
- `POST /studios/:studioId/shifts`
- `PATCH /studios/:studioId/shifts/:id`
- `DELETE /studios/:studioId/shifts/:id`
- `PATCH /studios/:studioId/shifts/:id/duty-manager`
- `GET /studios/:studioId/shifts/duty-manager?time=...`

### 3. Studio Admin Shift Management Workflow (FE)

Design intent:
- Studio admin creates and manages shifts in dedicated page
- Calendar + table operation modes
- Duty manager assignment in management flow

Status: `Implemented` (with one `Partial` area)

Delivered workflow:
1. Studio admin opens `/studios/:studioId/shifts`.
2. Switches between Calendar and Table view.
3. Creates shift from dialog (member/date/time/rate/duty manager).
4. Updates or deletes shift records in table.
5. Assigns/removes duty manager directly in duty manager column.
6. Uses URL-state filters and pagination (`page`, `limit`, `user_id`, `status`, `duty`, `date_from`, `date_to`).

Partial area:
- Multi-block authoring UI is implemented for create/edit (add/remove blocks with sequential validation), but advanced authoring is still pending:
  - Drag/reorder UX for blocks.
  - Rich per-block validation/error surfacing in the form UI.

### 4. Calendar Rendering Workflow

Design intent:
- Calendar should reflect shift schedule timeline, including cross-day behavior.

Status: `Implemented`

Delivered:
- Schedule-X calendar integrated for studio shifts.
- Temporal polyfill loading stabilized for calendar runtime.
- Calendar now renders each `StudioShiftBlock` as an independent event (not flattened).
- Duty manager blocks are visually highlighted.

### 5. Shift Records Table Workflow

Design intent:
- Admin operational table for shift records and management actions.

Status: `Implemented`

Delivered:
- Table view with search/filter/pagination.
- Duty manager assignment/unassignment action with explicit labels.
- Added block-awareness:
  - Date display follows block ISO timestamps.
  - Blocks column shows block count and block time labels.

### 6. Studio-wide Visibility Workflow (Non-admin)

Design intent:
- All studio members can see operational schedule context (who is on duty, what’s ongoing/next).

Status: `Implemented` (dashboard scope), `Partial` (shift details scope)

Delivered:
- Dashboard cards for active duty manager and next duty manager.
- Daily shows list and related operational visibility for studio users.

Partial:
- Full member-facing shift timeline/detail view is intentionally scoped out from admin shifts route.

### 7. Shows Integration with Shift Operations

Design intent (related operational alignment):
- Surface show context to support operational decisions around shifts.

Status: `Implemented`

Delivered:
- Studio shows payload now includes assigned MC list:
  - `mc_id`, `mc_name`, `mc_aliasname`
- Dashboard/table UX improvements were applied (badges, summaries, pagination behavior).

### 8. Shift Calendar Orchestration and Alignment Services

Design intent:
- `shift-calendar` orchestration endpoint (timeline + costs)
- `shift-alignment` endpoint for gaps/missing shifts against show windows

Status: `Pending`

Pending scope:
- Dedicated orchestration services/controllers for alignment warnings and period financial aggregation remain to be implemented.

## Implementation Timeline (This Branch)

### Committed milestones

1. `63fc853` `feat(erify_api): implement studio shift schedule foundation`
2. `24a0a2e` `test(erify_api): add studio shift coverage and local seed data`
3. `2160d71` `feat(erify_studios): add studio shift schedule page and APIs`
4. `ef9802e` `feat(erify_studios): use schedule-x calendar for studio shifts`
5. `f314dbf` `feat(erify_studios): add admin edit flow for studio shifts`
6. `ed29485` `refactor(erify_studios): improve studio shifts page layout and flow`
7. `a820d49` `refactor(erify_studios): split studio shifts page into focused UI components`
8. `20dce12` `refactor(erify_studios): remove temporal usage from studio shifts mapping`
9. `4a8c71c` `feat(erify_studios): finalize studio shifts calendar UI and temporal loading`
10. `88cedd2` `feat(erify_api): include assigned MCs in studio shows payload`
11. `c08aead` `feat(erify_studios): redesign shifts admin UX and studio dashboard operations`
12. `3a462de` `refactor(erify_studios): align shifts filters with url state and improve duty manager actions`

### Current in-progress (uncommitted)

1. Block-aware display consistency:
- Calendar renders one event per `StudioShiftBlock`.
- Table includes `Blocks` column with block count and block ranges.
- Shift date display derives from block ISO timestamps.

2. URL filter refinement:
- Duty filter normalized to `duty=true|false` in route URL.
- Frontend maps to backend `is_duty_manager` query param.

3. Create/update time generation:
- Runtime `Date` construction is used and persisted as ISO string.

4. Multi-block authoring and validation:
- Create/edit dialogs support multiple blocks (add/remove).
- Blocks are validated in sequence with cross-midnight normalization.
- API payload uses validated block ISO ranges (`start_time`, `end_time`).

5. FE refactor and type hardening:
- `/studios/$studioId/shifts` route delegates table/calendar to dedicated components.
- `studio-shifts-table` responsibilities were split with shared dialog and pure utils modules.
- Search/update typing was tightened (removed `any` path in table search/update flow).

## Current Operational Workflows

### A. Admin Shift Setup Workflow

1. Open studio shifts page.
2. Create shift and assign member.
3. Optionally set duty manager at create time or from table column action.
4. Filter/search in table and maintain state through URL.
5. Adjust status/edit/delete as needed.

### B. Daily Studio Operations Workflow

1. Open studio dashboard.
2. Check active duty manager status.
3. Check next duty manager handoff.
4. Review daily shows list for ongoing operations.

### C. Data Consistency Workflow

1. Shift times are submitted as ISO strings from runtime `Date`.
2. UI display converts from stored ISO timestamps to local display time.
3. Calendar and table both derive timing from block timestamps.

## Remaining Follow-ups

1. Add advanced multi-block editing UX (reorder/drag, richer inline error states).
2. Add orchestration APIs for:
- shift timeline aggregation
- shift/show alignment warnings
3. Add dedicated FE views for alignment and cost rollups once orchestration APIs exist.

## Verification Snapshot

For current branch development related to this design:
- `pnpm --filter erify_studios lint` passed
- `pnpm --filter erify_studios typecheck` passed
- `pnpm --filter erify_studios test` passed
