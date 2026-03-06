# Studio Shift Schedule Patterns (feat/studio-shift-schedule)

## Backend Architecture

### Module Layout
- Model: `apps/erify_api/src/models/studio-shift/` — `StudioShiftService`, `StudioShiftRepository`, schemas
- Studio-scoped routing: `apps/erify_api/src/studios/studio-shift/` — `StudioShiftController`, `ShiftCalendarController`
- Orchestration: `apps/erify_api/src/orchestration/shift-calendar/` and `shift-alignment/`
- Me-scoped: `apps/erify_api/src/me/shifts/` — `MeShiftsController`, `MeShiftsService`

### UID Prefixes
- Shift: `ssh_` (StudioShiftService.UID_PREFIX)
- Block: `ssb_` (StudioShiftService.BLOCK_UID_PREFIX)
- Membership: `smb_` (StudioMembershipService.UID_PREFIX)

### Block UID Stability on Update
`buildBlocksUpdateData` assigns UIDs by positional index (both incoming and existing blocks are sorted by startTime first). Block at position N gets the UID of the existing block at position N. If fewer blocks are submitted than exist, the extras are soft-deleted via `updateMany.where.uid.notIn`. This is intentional and tested. See `studio-shift.service.spec.ts` "preserve stable block UIDs on update".

### Overlap Guard
`ensureNoOverlapInStudio` calls `findOverlappingShift` which checks if any non-cancelled shift for the same user+studio has a block overlapping any of the new blocks. Cancelled shifts are excluded from the overlap check. The check is also skipped if the resulting status is CANCELLED. Both branches are tested.

### Soft-Delete Cascade
`softDeleteInStudio` does a single Prisma `update` with a nested `blocks.updateMany` — sets `deletedAt` on all non-deleted blocks in the same operation. Correct and atomic.

### Duty Manager Lookup
`findActiveDutyManager` queries `studioShiftBlock` directly (not `studioShift`) to find a block whose time window contains the query timestamp, then joins to the shift. This is efficient for point-in-time lookups.

### ShiftCalendarService: Cross-Midnight Block Splitting
`splitIntervalByDay` breaks blocks spanning UTC midnight into per-day segments so the timeline aggregation groups each segment under the correct date bucket. Clipped blocks are only counted for the overlap with the query window.

### ShiftAlignmentService: Forward-Looking Planning
`planningStart = max(window.start, now)` — shows that have already ended are never evaluated. Duty-manager interval merging uses a standard sweep-line algorithm. Operational day boundary: shows before 06:00 UTC are attributed to the prior calendar day.

### Guard Chain on New Controllers
- `StudioShiftController`: class-level `@StudioProtected()` (any member can read), method-level `@StudioProtected([ADMIN])` on POST/PATCH/DELETE
- `ShiftCalendarController`: class-level `@StudioProtected([ADMIN])` (all endpoints admin-only)
- `MeShiftsController`: JWT only (via global APP_GUARD), no studio guard needed — user scoped by JWT identity
- Both use `@Param('studioId', UidValidationPipe)` instead of `@StudioParam()` — pattern inconsistency, not security bug

## Known Issues (flagged in review, not yet fixed)
1. `studio-shift.service.ts` imports `Prisma` and uses `Prisma.JsonValue`, `Prisma.StudioShiftUpdateInput['blocks']` — BLOCKING per service layer rules
2. `studioShiftBlockSchema` contains `id: z.bigint()` and `shiftId: z.bigint()` — internal IDs in schema layer
3. `StudioShift` and `StudioShiftBlock` Prisma models missing `version` field for optimistic locking
4. `combineDateAndTime` in `shift-form.utils.ts` uses local clock — timezone-dependent ISO output

## Frontend Architecture

### Feature Directory
`apps/erify_studios/src/features/studio-shifts/`
- `api/` — TanStack Query hooks + API call functions
- `components/` — UI components (StudioShiftsTable, StudioShiftsCalendar, ShiftFormFields, etc.)
- `hooks/` — useStudioShifts, useMyShifts, useDutyManager, useShiftCalendar, useShiftAlignment, useStudioMemberMap
- `utils/` — shift-form.utils, shift-date.utils, shift-blocks.utils, shift-timeline.utils, shift-calendar-range.utils, studio-shifts-table.utils, schedule-x.utils
- `constants/` — studio-shifts.constants
- `types/` — shift-form.types

### Routes Added
- `/studios/$studioId/shifts` — admin shift management (table + calendar view)
- `/studios/$studioId/my-shifts` — member read-only view (table + calendar)
- Dashboard updated with duty manager card, upcoming shifts, shift orchestration warnings

### useStudioMemberMap
Fetches `useStudioMembershipsQuery` with a hard limit (200 default, 500 for calendar). Returns a `Map<userId, {name, email}>`. Silent truncation if studio has more members than limit.

### sortShiftBlocks Utilities
- `sortShiftBlocksByStart(blocks)` — sorts by `start_time` (ISO string, uses Date comparison) — in `shift-blocks.utils.ts`
- `sortShiftFormBlocksByStart(blocks)` — sorts by `startTime` (time string HH:MM, uses localeCompare) — same file
- `sortShiftsByFirstBlockStart(shifts)` — sorts shifts array by first block start — in `shift-timeline.utils.ts`

### StudioShiftsCalendar: schedule-x Integration
Uses `@schedule-x/calendar` + `@schedule-x/react`. Generates `CalendarEvent` objects from shift blocks. Large bundle chunk (233KB gzip). `queryScope` prop switches between `studio` (admin: all shifts) and `me` (member: own shifts only). Jump-to-date triggers a debounced (300ms) range update.

### API Types: Local vs @eridu/api-types
- `StudioShift` and `StudioShiftBlock` — exported from `@eridu/api-types/studio-shifts` (correct)
- `StudioShiftCalendarResponse` and `StudioShiftAlignmentResponse` — local types in `studio-shifts.types.ts` (should be in @eridu/api-types)

### Shift Coverage Warning (task assignment)
`checkAssigneeShiftCoverageInShowWindow` in `task-assignment-shift-coverage.ts` calls `getStudioShifts` directly (not a hook) with a 200-record limit and 1-day lookback. `hasShiftCoverageForWindow` checks if any non-cancelled shift block overlaps the show window. Warning is non-blocking — assignment always proceeds. System show tasks route also has coverage warnings (using shared lib).
