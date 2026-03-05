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

Status: `Implemented`

Delivered:
- Dashboard cards for active duty manager and next duty manager.
- Daily shows list and related operational visibility for studio users.
- Dashboard includes "My Upcoming Shifts" section for member-level forward visibility.
- New read-only member route: `/studios/:studioId/my-shifts` (calendar view scoped to current user).

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

6. E2E review follow-up implementation pass (active):
- Calendar now keeps `ScheduleXCalendar` mounted even with zero blocks in the visible range.
- Calendar loading and refetch UI is now persistent (summary + spinner + fixed-height skeleton state).
- Calendar query overfetch was reduced: removed hardcoded `limit: 1000` and switched to range-aware limit sizing.
- Shift table now uses `TableSkeleton` on initial load and keeps rows visible during background refetch.
- Shift table now includes `Total Hours` and `Projected Cost` columns and renamed `Time` to `Date / Window`.
- Single-block rows now display inline time range text instead of `1 block`.
- FE block validation now sorts form blocks before cross-midnight normalization/payload generation.
- Shared `sortShiftBlocksByStart`/`sortShiftFormBlocksByStart` helpers were extracted.
- Shared `useStudioMemberMap` hook was extracted and adopted in calendar/table/dashboard.
- Dashboard now supports URL-backed day navigation (`date` search param) and rows-per-page control.
- Shift form now includes per-block inline validation feedback, cross-midnight `+1 day` indicator, and resolved block window preview.
- Added member-facing `/my-shifts` route reusing `StudioShiftsCalendar` with user-scoped `/me/shifts` query flow.
- Added dashboard "My Upcoming Shifts" card (next 5 shifts from selected operational day).
- Removed unused `ShiftCreateCard` component to reduce dead code in shift feature module.
- Added shared `StudioShift`/`StudioShiftBlock` API types in `@eridu/api-types/studio-shifts` and adopted them in FE shift API typing.
- Added FE utility tests for shift schedule helpers (`validateShiftBlocks`, `combineDateAndTime`, sorting/window helpers).
- Backend quality pass: shift soft-delete now cascades to child blocks, local `JsonValue` alias replaced with `Prisma.JsonValue`, and update/delete now avoid duplicate repository lookup by reusing resolved shift ID.
- Added dedicated backend endpoint `GET /me/shifts` for member shift queries (no studio admin endpoint reuse for user scope).
- Added overlap guard on create/update for the same member/studio block window; overlap validation excludes `CANCELLED` shifts.
- Block update persistence now preserves stable block UIDs with nested upsert and soft-deletes removed blocks instead of full block replacement.
- Expanded backend service tests to cover cross-midnight block cost calculation and empty-block rejection.
- Added backend `updateShift` test coverage for member reassignment with membership-rate inheritance when `hourly_rate` is omitted.
- Expanded studio shift controller tests to cover show/create/update/delete flows and not-found handling on show/update/delete/duty-manager assignment.
- Added initial FE shift component tests for `CurrentDutyManagerCard` and `ShiftCalendarCard` state rendering.
- Added initial `StudioShiftsTable` orchestration tests (shift ordering, delete confirmation behavior, create dialog open state, and limit-change wiring).
- Added `StudioShiftFormDialog` and `ShiftFormFields` interaction tests (submit/cancel/loading behavior, block add defaults, date-required feedback, and cross-midnight `+1 day` indicator).
- Extracted shifts route view-toggle search transitions into shared utility functions and added focused tests for calendar/table search state behavior.

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
4. Expand member shift visibility from 7-day preview to optional longer range/date controls if needed.

## E2E Review Findings (March 5, 2026)

### Calendar UX

1. **Calendar disappears on empty range**: Resolved in current branch work. Calendar remains mounted.
2. **Layout glitch on transitions**: Resolved in current branch work. Fixed-height container + skeleton applied.
3. **Schedule-X has no built-in loading/transition UI**: Resolved in current branch work. Persistent summary/loading indicators implemented.
4. **Background refetch flicker**: Resolved in current branch work. Calendar remains visible during refetch.
5. **Overfetching**: Improved in current branch work. Range-aware query limit now used instead of static `1000`.

### Table UX Improvements

1. **Skeleton loading**: Resolved in current branch work (`TableSkeleton`, limit-aligned rows, `isLoading`/`isFetching` separation).
2. **Missing columns**: Resolved in current branch work (`Projected Cost`, `Total Hours`).
3. **Column header clarity**: Rename "Time" to "Date / Window".
4. **Single-block display**: "1 block" text adds no info — show the time range inline instead.

### Block Ordering & Shift Window Contract

1. **Shift window** derives from blocks: earliest `start_time` → latest `end_time`. No separate start/end on the parent shift.
2. **Blocks must be time-series ordered** — each block's `start_time` ≥ previous block's `end_time`.
3. **BE enforces**: `normalizeAndValidateBlocks` sorts by `startTime` before overlap validation ✅.
4. **FE must sort blocks before API call**: `validateShiftBlocks` processes blocks in array order without sorting. If blocks are entered out of order, the cross-midnight normalization produces incorrect ISO strings. Fix: sort by `startTime` before processing.

### Form Polish

1. **Cross-midnight indicator**: Resolved in current branch work. `+1 day` badge is shown when end time wraps past midnight.
2. **Inline validation**: Resolved in current branch work. Per-block inline feedback added in form rows.
3. **Resolved time preview**: Resolved in current branch work. Resolved block timeline preview is shown below block inputs.

### Dashboard UX

1. **Hardcoded date**: `dashboard.tsx` uses `new Date()` with no navigation. Members on midnight shows (after 00:00) see the next day's records with no way to go back.
2. **Day navigation**: Add simple prev/next day buttons (±1 day). Keep intentionally simple — no date picker, no jump-to-date. Store selected date in URL search params.
3. **Operational day window**: `00:00 → next day 05:59` is correct but the `6am` cutoff should be documented and potentially configurable.
4. **Rows per page**: Search schema accepts `limit` (1–100, default 10) but no UI selector exists. Add a rows-per-page dropdown (e.g., 10 / 25 / 50).

### Member Experience

1. **`/shifts` is admin-only by design** — members check from dashboard.
2. **`/my-shifts` route** — implemented as read-only member calendar using member-scoped shift query.
3. **Dashboard "My Upcoming Shifts"** — implemented (next 5 upcoming assigned shifts).

### Code Quality

1. **Orphaned `ShiftCreateCard`**: Resolved in current branch work. Unused component removed.
2. **FE types not in `@eridu/api-types`**: Resolved in current branch work. Shift types now live in shared `@eridu/api-types/studio-shifts`.
3. **Repeated block sorting**: 6+ places sort blocks with the same comparator. Extract `sortBlocks` utility.
4. **Duplicated `memberMap` building**: Calendar and table independently build the same map. Extract shared hook.
5. **Magic number fetch limits**: `limit: 200` for display members, `limit: 500` for calendar members. Document or derive from studio size.
6. **Backend soft-delete / lookup / JSON typing refinements**: Resolved in current branch work (service/repository improvements applied).

### Future Integration TODOs

1. **Task assignment shift warning** — check assignee has overlapping `StudioShiftBlock`; surface warning if no shift covers the show window.
2. **Show alignment orchestration** — idle members and missing shifts against show windows.
3. **Financial aggregation** — period cost rollups for admin reporting.
4. **Member availability** — members set availability for admin reference.
5. **Recurring shift templates** — weekly pattern creation.
6. **Shift data export** — CSV/Excel for payroll.

### Frontend Test Gaps

- No tests for `validateShiftBlocks`, `combineDateAndTime`, or any frontend utils.
- No component tests for any shift-related component.

## Verification Snapshot

For current branch development related to this design:
- `pnpm --filter erify_studios lint` passed
- `pnpm --filter erify_studios typecheck` passed
- `pnpm --filter erify_studios test` passed
