# Studio Shift Schedule — E2E Review Findings & TODOs

Reviewed: March 5, 2026
Branch: `feat/studio-shift-schedule`
Source design: `apps/erify_api/docs/design/STUDIO_SHIFT_SCHEDULE_DESIGN.md`
Frontend doc: `apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md`

---

## Summary

Design and core functionality are solid. The shift/block model, CRUD APIs, duty manager flow, cost calculation, calendar, and table views are all implemented and working. Review found gaps in rendering alignment, UX polish, member experience, code quality, and test coverage.

---

## Findings (Actionable)

### Calendar UX

- [x] **Always render the calendar** — never conditionally unmount `ScheduleXCalendar`. Current code replaces the calendar with "No shifts scheduled yet." when `shiftCount === 0`, destroying the component and all navigation state. The calendar must persist so the user can navigate to dates that do have shifts.
- [x] **Reserve layout space** — use a fixed-height container or skeleton to prevent layout glitch when transitioning between loading/loaded states.
- [x] **Schedule-X has no built-in loading/transition UI** — all loading indicators must be developer-managed. Use a persistent summary card or section above/beside the calendar that shows shift count, date range, etc. This avoids conditional rendering that causes glitches.
- [x] **Initial load**: show a calendar-height skeleton placeholder until `calendarApp` is ready; then render `ScheduleXCalendar` once and keep it mounted.
- [x] **Background refetch** (`isFetching`): keep the calendar visible, show a subtle loading indicator (e.g., spinner in the summary section or a top-bar progress).
- [x] Align calendar query scope with the visible range (day ± 1 day buffer, week, month) — **stop using `limit: 1000`**

### Table UX

- [x] Replace "Loading shifts..." with **skeleton rows** matching the `limit` per-row config
- [x] Separate `isLoading` (initial → skeleton) from `isFetching` (background → keep table, show subtle indicator)
- [x] Add **Projected Cost** and **Total Hours** columns
- [x] Rename "Time" column header to "Date / Window"
- [x] Single-block rows: show time range inline instead of "1 block" text

### Block Ordering & Shift Window Contract

- [x] **Shift window** derives from blocks: earliest `start_time` → latest `end_time`. No separate start/end fields on the parent shift.
- [x] **Blocks must be time-series ordered** in the array — each block's `start_time` must be ≥ the previous block's `end_time`.
- [x] **BE enforces**: `normalizeAndValidateBlocks` already sorts by `startTime` before overlap validation ✅.
- [x] **FE must sort blocks before API call**: `validateShiftBlocks` currently processes blocks in array order without sorting first. If a user adds blocks out of order in the form, the FE cross-midnight normalization produces incorrect ISO strings. Fix: sort form blocks by `startTime` before processing.

### Form Polish

- [x] Add **cross-midnight visual indicator** ("+1 day" badge next to end time)
- [x] Add **inline per-block validation** instead of single error string on submit
- [x] Add **resolved block window preview** below inputs before submit

### Dashboard UX

- [x] **Day navigation**: Dashboard date is hardcoded to `new Date()` — members working midnight shows (after 00:00) see the next day's records with no way to view the previous day. Add simple **prev/next day buttons** to navigate by ±1 day. Keep it intentionally simple (no date picker, no jump-to-date). Store the selected date in URL search params so it survives refresh.
- [x] **Operational day window**: Current window is `00:00 → next day 05:59`. This is correct for the "operational day" concept but the hardcoded `6am` cutoff should be documented and potentially configurable per studio.
- [x] **Rows per page**: Dashboard search schema accepts `limit` (1–100, default 10) but no UI control exists to change it. Add a rows-per-page selector (e.g., 10 / 25 / 50).
- [x] **Mobile overflow polish**: Hide rows-per-page dropdown on mobile to keep dashboard pagination action row from overflowing.

### Member Experience

- [x] `NEW` **`/my-shifts` route** — read-only calendar view for members to see their own shift schedule (reuse `StudioShiftsCalendar` with member-scoped query)
- [x] `NEW` **Dashboard "My Upcoming Shifts"** — section showing the member's next N shifts
- [x] `/shifts` remains admin-only by design — members use dashboard + `/my-shifts`
- [x] Backed member shift retrieval with dedicated `GET /me/shifts` endpoint (user-scoped)

### Backend Code Quality

- [x] **Soft-delete cascade**: `softDeleteInStudio` must also soft-delete child `StudioShiftBlock` rows
- [x] **Double lookup**: `updateShift` does `findByUidInStudio` in both service and repo — refactor to single lookup
- [x] **Block UID instability**: Block updates use `deleteMany` + `create`, regenerating UIDs — replaced with upsert + soft-delete strategy to preserve stable block UIDs
- [x] **Duplicate shift guard**: No check for overlapping shifts on the same user/date — add service-level validation (ignore `CANCELLED` shifts)
- [x] **Local `JsonValue` type**: Replace with `Prisma.JsonValue`

### Frontend Code Quality

- [x] Remove orphaned `ShiftCreateCard` component (unused)
- [x] Extract `sortBlocks` utility (repeated in 6+ places)
- [x] Extract shared `memberMap` hook (duplicated in calendar and table)
- [x] Document or replace magic number fetch limits (`200`, `500`, `1000`)

### Shared Types

- [x] Add `StudioShift` and `StudioShiftBlock` types to `@eridu/api-types` — currently FE-only

---

## Future Integration TODOs

| Feature                       | Description                                                                                                    | Priority |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| Task assignment shift warning | Check if assignee has overlapping `StudioShiftBlock` during task assignment; show warning if no shift coverage | High     |
| Show alignment orchestration (FE integration) | Backend `shift-alignment` endpoint is implemented; admin planning warning card is now in `/studios/:studioId/shifts`, dedicated drill-down/action wiring remains | High     |
| Financial aggregation (FE integration)         | Backend `shift-calendar` endpoint is implemented; admin planning cost snapshot is now in `/studios/:studioId/shifts`, richer report views remain              | Medium   |
| `/my-shifts` member enhancements | Extend the implemented read-only member calendar with richer range controls and additional filters            | Medium   |
| Member availability           | Members set availability slots for admin reference during shift creation                                       | Low      |
| Recurring shift templates     | Weekly pattern creation instead of one-off entries                                                             | Low      |
| Shift data export             | CSV/Excel export for payroll integration                                                                       | Low      |

---

## Test Gaps

| Area                 | Existing                                                                                                                                                                   | Missing                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Service: createShift | ✅ Cost calc, overlap rejection, non-member rejection, cross-midnight and empty-block validation                                                                            | None identified in reviewed scope                      |
| Service: updateShift | ✅ Duty manager flag preservation, block UID stability/soft-delete behavior, user reassignment rate inheritance                                                             | None identified in reviewed scope                      |
| Controller           | ✅ Pagination, duty manager, timestamp query, create/update/delete flows, not-found paths                                                                                   | None identified in reviewed scope                      |
| FE utils             | ✅ Added coverage for query param mapping, empty-block sorting behavior, cross-midnight sequencing, local time extraction, edit-state defaults, and display date precedence | None identified in reviewed scope                      |
| FE components        | ✅ Initial coverage for duty manager/calendar cards, table orchestration, form/dialog interactions, and route view-search transition utils                                  | Deep integration coverage across full shift page flows |
