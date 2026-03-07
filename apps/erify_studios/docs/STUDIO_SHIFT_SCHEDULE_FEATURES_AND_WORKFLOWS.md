# Studio Shift Schedule Features and Workflows

Last updated: March 7, 2026
Source references: `apps/erify_api/docs/STUDIO_SHIFT_SCHEDULE.md`, `docs/roadmap/PHASE_3.md`
Historical branch context: implementation originally landed through the `feat/studio-shift-schedule` stream

This is the consolidated implementation record for the shipped shift-schedule work across backend and frontend.

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
- New read-only member route: `/studios/:studioId/my-shifts` (calendar view scoped to current user).

Note: The "My Upcoming Shifts" dashboard card was removed in the operations-improvement refactor (March 2026). Members access their shift history and upcoming shifts via `/my-shifts` directly.

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
- `shift-alignment` endpoint for planning risks in duty-manager and show-task readiness

Status: `Implemented`

Delivered:
- Dedicated studio-scoped orchestration endpoints were added:
  - `GET /studios/:studioId/shift-calendar`
  - `GET /studios/:studioId/shift-alignment`
- `shift-calendar` now returns date-window timeline aggregation grouped by day/member, with period summary totals (hours/projected/calculated cost).
- `shift-alignment` now computes planning risks for upcoming shows only:
  - Duty-manager coverage risk during show windows.
  - Operational-day duty-manager gap risk between first and last show of the day.
  - Task-readiness risks: no tasks, unassigned tasks, missing `SETUP`/`CLOSURE`, and missing moderation task on premium shows.
  - Backend risk-bucketing uses a fixed operational-day boundary (`06:00`) for consistency across orchestration reports.
- Frontend admin planning cards now consume these endpoints on dedicated surfaces:
  - `/studios/:studioId/shows` for date-range task-readiness summary warnings.
  - `/studios/:studioId/shifts` for shift cost snapshot.
- `/studios/:studioId/shows` Show Readiness panel supports date-range querying and uses an admin triage layout:
  - top summary highlights scope coverage, attention rate, and the current primary action
  - action buckets split follow-up into task-plan gaps, assignment workload, and missing required coverage
  - per-bucket drill-down popovers expose affected show names, timing, and issue tags without leaving the page
  - mobile uses a simplified compact bucket layout; desktop uses full detail cards
  - bucket-level actions are inspect-only; issues list handoff remains a single summary CTA
- Shows table, Show Readiness panel, and `Issues` filter share the same datetime scope window (`date_from/date_to`), including operational-day cutoff behavior from scope utilities (D+1 `05:59` local).
- Readiness scope label formatting shows one date for same-day scopes and `start to end` for multi-day scopes.
- Shows task-readiness date range is local UI state (not URL-backed) and includes a quick reset action for the next 7 days.

Pending scope:
- Dedicated report pages beyond the summary card (separate from planning workflow) for richer analytics.

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
13. `e26d263` `refactor(erify_studios): stabilize studio shifts table and block workflows`
14. `refactor(studio-shifts): apply PR review fixes and sync knowledge artifacts` _(pending commit)_
15. `5452af6` `fix(erify_studios): align schedule-x shift rendering with runtime timezone`
16. `7a82aac` `feat(erify_studios): optimize shift calendar fetch by view range`

### Implementation Highlights (Committed)

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

6. E2E review follow-up implementation pass:
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
- Added member-facing `/my-shifts` table mode (read-only) with calendar/table toggle, date-range + status filters, and pagination.
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
- Expanded FE utility tests for additional edge cases: query param mapping, empty-block ordering fallback, cross-midnight sequential normalization, local-time extraction, edit-form defaults, and block-first display date semantics.
- Dashboard pagination controls now hide the rows-per-page selector on mobile to avoid action-row overflow while preserving next/previous actions.
- Refactored dashboard/calendar shift timeline handling into shared utilities (`sortShiftsByFirstBlockStart`, `getShiftFirstBlockStartMs`) and replaced repeated hardcoded member/query fetch limits with named constants.
- Added backend orchestration services/modules and studio routes for `shift-calendar` and `shift-alignment`, including typed query/response schemas and service/controller tests.
- Added frontend API hooks for `shift-calendar`/`shift-alignment` and admin planning cards on dedicated surfaces: `/studios/:studioId/shows` (risk warning summary) and `/studios/:studioId/shifts` (cost snapshot).
- Shift cost snapshot card now includes an inline date-range picker + reset action, eliminating manual URL edits for planning window changes.
- Extracted shared date helpers (`addDays`, `fromLocalDateInput`, date param resolver) into `shift-date.utils` and reused across dashboard/shifts/my-shifts routes.
- Shift calendar now supports quick jump-to-date and debounced range updates to reduce noisy refetches during navigation.
- Show-task assignment now warns (non-blocking) when selected assignee has no overlapping shift coverage for the show window.
- Schedule-X calendar now sets explicit runtime timezone and converts shift block boundaries with Temporal-aware timezone handling to prevent UTC default drift in time-grid rendering.
- Cross-midnight shift blocks are split into single-day calendar event segments for week/day timeline rendering, preventing timed overnight blocks from falling into the all-day/top date grid band.
- Calendar query limit sizing is now view-aware via visible range bucketing (`day`/`week`/`month`) to reduce over-fetching while preserving cache reuse per range+limit query key.

7. PR review fixes (knowledge sync pass):
- Removed `Prisma.*` type imports from `studio-shift.service.ts`; local `JsonValue`/`JsonObject` types added for metadata without coupling to Prisma.
- Renamed internal-only Zod transform shapes in `studio-shift.schema.ts` to `_internalShiftBlockShape`/`_internalShiftWithRelationsShape` with `_internal*` prefix convention to make their non-export-intended scope explicit.
- Replaced `z.any()` with `z.unknown()` for Prisma `Decimal` fields (`hourlyRate`, `projectedCost`, `calculatedCost`) in the internal transform shapes; `decimalToString` helper handles the runtime Decimal type.
- Fixed `combineDateAndTime` timezone bug in `shift-form.utils.ts`: form inputs are local-time values, so `new Date("YYYY-MM-DDTHH:MM:00").toISOString()` is now used instead of UTC construction to avoid local-offset drift.
- Moved `StudioShiftCalendarResponse`/`StudioShiftAlignmentResponse` TypeScript types into `@eridu/api-types/studio-shifts`; `studio-shifts.types.ts` now re-exports them from the shared package instead of declaring local duplicates.

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
2. Stored timestamps are UTC instants in DB (epoch/ISO standardization).
3. UI display converts from stored ISO timestamps to local display time.
4. Frontend operational-day route windows (`dashboard`, `my-shifts`) are computed in local runtime time, then sent as ISO instants for API filtering.
5. Calendar and table both derive timing from block timestamps.

## Remaining Follow-ups

1. Add advanced multi-block editing UX (reorder/drag, richer inline error states).
2. Expand from summary card to dedicated FE alignment/rollup report views (filterable day/show/task details).
3. Expand task assignment warning from current show-task assignee flow to additional assignment surfaces if required.
4. Expand member shift visibility from 7-day preview to optional longer range/date controls if needed.

## E2E Review Findings (March 5, 2026)

### Calendar UX

1. **Calendar disappears on empty range**: Resolved in current branch work. Calendar remains mounted.
2. **Layout glitch on transitions**: Resolved in current branch work. Fixed-height container + skeleton applied.
3. **Schedule-X has no built-in loading/transition UI**: Resolved in current branch work. Persistent summary/loading indicators implemented.
4. **Background refetch flicker**: Resolved in current branch work. Calendar remains visible during refetch.
5. **Overfetching**: Improved in current branch work. View-aware range limit now scales by visible calendar window (`day`/`week`/`month`) instead of a broad fixed profile.

### Table UX Improvements

1. **Skeleton loading**: Resolved in current branch work (`TableSkeleton`, limit-aligned rows, `isLoading`/`isFetching` separation).
2. **Missing columns**: Resolved in current branch work (`Projected Cost`, `Total Hours`).
3. **Column header clarity**: Resolved in current branch work. "Time" renamed to "Date / Window".
4. **Single-block display**: Resolved in current branch work. Single-block rows show inline time range text.

### Block Ordering & Shift Window Contract

1. **Shift window** derives from blocks: earliest `start_time` → latest `end_time`. No separate start/end on the parent shift.
2. **Blocks must be time-series ordered** — each block's `start_time` ≥ previous block's `end_time`.
3. **BE enforces**: `normalizeAndValidateBlocks` sorts by `startTime` before overlap validation ✅.
4. **FE must sort blocks before API call**: Resolved in current branch work. `validateShiftBlocks` now sorts form blocks by `startTime` before cross-midnight normalization.

### PR Review Bug Fixes (March 6, 2026)

1. **FE: Cross-midnight sequential advance applied to same-day overlaps (P1)**: Fixed. `validateShiftBlocks` previously advanced overlapping same-day blocks to the next day instead of returning a validation error, producing unintended multi-day shifts and wrong costs in the calendar. The sequential day-advance is now gated on `prevBlockCrossedMidnight` — it only fires when the previous block actually crossed midnight (legitimate cross-midnight multi-block authoring). Same-day overlapping blocks are now correctly rejected with `"Time blocks cannot overlap."`.

2. **BE: Hourly rate re-derived when same user_id sent in PATCH body (P2)**: Fixed. `updateShift` previously re-derived `hourlyRate` from the member's `baseHourlyRate` whenever `user_id` appeared in the payload, even if the assignee was unchanged. A PATCH sending `{ user_id: "...", is_duty_manager: true }` (no reassignment intent) could fail with `"Hourly rate is required"` for members without `baseHourlyRate`. The re-derivation is now gated on an actual user change (`payload.userId !== existing.user.uid`).

### Form Polish

1. **Cross-midnight indicator**: Resolved in current branch work. `+1 day` badge is shown when end time wraps past midnight.
2. **Inline validation**: Resolved in current branch work. Per-block inline feedback added in form rows.
3. **Resolved time preview**: Resolved in current branch work. Resolved block timeline preview is shown below block inputs.

### Dashboard UX

1. **Date navigation**: Resolved. Dashboard now supports simple prev/next day navigation with URL-backed `date`.
2. **Operational day window**: Resolved and documented. Dashboard uses `00:00 → next day 05:59` with 6am boundary behavior documented.
3. **Rows per page**: Resolved. Rows-per-page selector is available (and hidden on mobile to avoid overflow).

### Member Experience

1. **`/shifts` is admin-only by design** — members check from dashboard.
2. **`/my-shifts` route** — implemented as read-only member calendar using member-scoped shift query.
3. **Dashboard "My Upcoming Shifts"** — ~~implemented~~ subsequently removed (March 2026 ops-improvement refactor). Dashboard no longer shows a per-member upcoming shifts card; members navigate to `/my-shifts` directly.
4. **Dashboard "View All" link**: Removed along with the upcoming shifts card; `/my-shifts` remains available as a standalone route.
5. **`/my-shifts` table/list view**: Implemented as read-only table mode alongside calendar, including date-range and status filters with pagination.

### Code Quality

1. **Orphaned `ShiftCreateCard`**: Resolved in current branch work. Unused component removed.
2. **FE types not in `@eridu/api-types`**: Resolved in current branch work. Shift types now live in shared `@eridu/api-types/studio-shifts`.
3. **Repeated block sorting**: Resolved in current branch work. Shared block/timeline sorting helpers are used across table/calendar/dashboard.
4. **Duplicated `memberMap` building**: Resolved in current branch work. Shared `useStudioMemberMap` hook is used across shift surfaces.
5. **Magic number fetch limits**: Resolved in current branch work. Shift member/query limits are centralized in named constants.
6. **Backend soft-delete / lookup / JSON typing refinements**: Resolved in current branch work (service/repository improvements applied).

### Future Integration TODOs

1. **Show alignment orchestration** — baseline planning warning summary is implemented in `/studios/:studioId/shows`; pending dedicated report/drill-down views.
2. **Financial aggregation** — baseline planning cost snapshot is implemented in `/studios/:studioId/shifts`; pending richer report views.
3. **Calendar event interactivity** — Admin: click → edit dialog. Member: click → read-only detail popover. Deferred to Phase 4 planning.
4. **Member availability** — members set availability for admin reference.
5. **Recurring shift templates** — weekly pattern creation.
6. **Shift data export** — CSV/Excel for payroll.

### Frontend Test Gaps

- Utility/component baseline coverage now exists for shift helpers and core shift UI cards/dialogs.
- Remaining gap: deeper integration coverage across full shift page workflows.

## Verification Snapshot

For current branch development related to this design:
- `pnpm --filter erify_studios lint` passed
- `pnpm --filter erify_studios typecheck` passed
- `pnpm --filter erify_studios build` passed
- `pnpm --filter erify_studios test` passed
- `pnpm --filter erify_api lint` passed
- `pnpm --filter erify_api typecheck` passed
- `pnpm --filter @eridu/api-types lint` passed
- `pnpm --filter @eridu/api-types typecheck` passed
- `pnpm --filter @eridu/api-types build` passed

PR review fixes applied (knowledge sync pass — March 5, 2026):
- Schema type hardening: `_internal*` naming convention, `z.unknown()` for Prisma Decimal fields
- Service layer: local `JsonValue`/`JsonObject` types replace Prisma type imports
- Form utility: `combineDateAndTime` timezone fix (local-time ISO construction)
- Shared API types: `StudioShiftCalendarResponse`/`StudioShiftAlignmentResponse` moved to `@eridu/api-types/studio-shifts`

Operations feature improvement (March 7, 2026 — `feat/operations-feature-improvement`):
- `pnpm --filter erify_studios lint` passed
- `pnpm --filter erify_studios typecheck` passed
- `pnpm --filter erify_studios test` passed (383 tests)
- `pnpm --filter erify_api lint` passed
- `pnpm --filter erify_api typecheck` passed
- `pnpm --filter erify_api test` passed (528 tests)
- `pnpm --filter @eridu/api-types lint` passed
- `pnpm --filter @eridu/api-types typecheck` passed

PR codex review fixes (March 6, 2026):
- FE block validation: cross-midnight sequential advance gated on `prevBlockCrossedMidnight` — same-day overlapping blocks now correctly rejected
- BE update: hourly rate re-derivation gated on actual user reassignment (`payload.userId !== existing.user.uid`)
- Member shift views: `is_duty_manager` "Duty" badge added to My Shifts table and dashboard My Upcoming Shifts card
- Dashboard: "View All" link moved into `DashboardMyUpcomingShiftsCard` header via `viewAllLink` render prop

Operations feature improvement (March 7, 2026 — `feat/operations-feature-improvement`):
- Show Readiness Triage Panel shipped: summary progress bar, three prioritized action buckets (no task plan / unassigned workload / missing required coverage), per-bucket popover drill-down with show-level issue tags
- `needs_attention` filter: BE resolves readiness warnings via `shift-alignment` with `match_show_scope=true` + `include_past=true`, constrains paginated show query to warning show UIDs; `planning_date_from/planning_date_to` legacy fallback rejects non-ISO-date strings with `400`
- Show scope datetime bounds (`toShowScopeDateTimeBounds`) now shared between Shows table, Readiness panel, and Issues filter — all queries use the same `date_from/date_to` window with D+1 `05:59` operational-day cutoff
- `ACTIVE` removed from required task type baseline; required baseline is now `SETUP` + `CLOSURE` only; premium moderation checked separately via `missing_moderation_task`
- Shift-alignment service extended: `include_past`, `match_show_scope`, `dateFromIsDateOnly`/`dateToIsDateOnly` flags added to `getAlignment()` interface; datetime passthrough (non-date-only) preserves exact caller bounds
- Scope label formatting shows single date for same-day scopes, `start to end` for multi-day
- Bulk Generate/Assign dialogs close immediately on user confirmation; row selection preserved for chained follow-up actions
- Dashboard "My Upcoming Shifts" card removed; `DASHBOARD_DUTY_SHIFTS_LIMIT` reduced from 200 to 20
- FE scope-total refetch gated to `refreshSignal` changes via `useRef` guard — eliminates duplicate shift-alignment requests on mount and scope changes (Codex P2 fix)
- `z.passthrough()` replaced with `z.looseObject()` in shows route search schema
