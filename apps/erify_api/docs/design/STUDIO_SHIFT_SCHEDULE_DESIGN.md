# Studio Shift Schedule Integration Plan

Integrate a Studio-based user shift schedule feature to track part-timer shifts, support show-planning risk control, manage duty managers, and calculate costs.

## User Review Required

> [!IMPORTANT]
> **Conceptual Design Questions to Review**
> This document proposes a baseline architecture based on your feedback:
> 1. **Hourly Rates**: The `baseHourlyRate` will be stored on the `StudioMembership`. The `StudioShift` can override it for special shifts (weekends/holidays).
> 2. **Shift Gaps (Breaks)**: Handled via the **Blocks** approach. If a shift is 9 hours straight with no gaps, it will simply have 1 continuous block. If they go home for 3 hours and come back, it will have 2 blocks.
> 3. **Midnight Shifts (Cross-Day)**: The parent `StudioShift`'s `date` field represents the logical "start day" of the shift (e.g., Friday night). The child `StudioShiftBlock` objects hold absolute `startTime` and `endTime` using standard UTC DateTime. This allows a block to naturally span from 11:00 PM (Friday) to 03:00 AM (Saturday) without breaking calendar rendering logic.
> 4. **Cost Calculation & Admin Override**: The API will auto-calculate a `projectedCost`. However, to grant admins final decision-making power, we will introduce `calculatedCost` and `isApproved` fields. Admins can manually set `calculatedCost` independent of the auto-calculated projection.
> 5. **Calendar View**: The API will support timeline rendering across Days, Weeks, and Months, similar to Google Calendar.

## Proposed Changes

### Data Models (Prisma Schema Updates)

- **[MODIFY]** `apps/erify_api/prisma/schema.prisma`
  - Enhance `StudioMembership` with `baseHourlyRate Decimal?`.
  - Add **[NEW]** `StudioShift` and `StudioShiftBlock` models:
    ```prisma
    enum StudioShiftStatus {
      SCHEDULED
      COMPLETED
      CANCELLED
    }

    model StudioShift {
      id             BigInt    @id @default(autoincrement())
      uid            String    @unique
      studioId       BigInt    @map("studio_id")
      userId         BigInt    @map("user_id") // The assigned part-timer/member
      
      // The logical start date of the shift (useful for querying midnight-crossing shifts intuitively)
      date           DateTime  @db.Date
      
      // Cost tracking
      hourlyRate     Decimal   @map("hourly_rate") // Copied from StudioMembership at creation, can be overridden
      projectedCost  Decimal   @map("projected_cost") // Auto-calculated based on blocks
      calculatedCost Decimal?  @map("calculated_cost") // Admin manual override for final payment
      isApproved     Boolean   @default(false) @map("is_approved") // Final admin sign-off
      
      // Roles
      isDutyManager  Boolean   @default(false) @map("is_duty_manager")
      
      status         StudioShiftStatus @default(SCHEDULED)
      
      metadata       Json      @default("{}")
      
      // Relations
      blocks         StudioShiftBlock[]
      studio         Studio    @relation(fields: [studioId], references: [id], onDelete: Cascade)
      user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
      
      createdAt      DateTime  @default(now()) @map("created_at")
      updatedAt      DateTime  @updatedAt @map("updated_at")
      deletedAt      DateTime? @map("deleted_at")

      @@index([studioId, date])
      @@index([userId, date])
      @@index([studioId, isDutyManager, date]) // Fast duty manager lookup
      @@map("studio_shifts")
    }

    model StudioShiftBlock {
      id             BigInt    @id @default(autoincrement())
      uid            String    @unique
      shiftId        BigInt    @map("shift_id")
      
      startTime      DateTime  @map("start_time") // Can safely cross midnight
      endTime        DateTime  @map("end_time")   // Can safely cross midnight

      metadata       Json      @default("{}")

      shift          StudioShift @relation(fields: [shiftId], references: [id], onDelete: Cascade)

      createdAt      DateTime  @default(now()) @map("created_at")
      updatedAt      DateTime  @updatedAt @map("updated_at")
      deletedAt      DateTime? @map("deleted_at")

      @@index([shiftId])
      @@index([startTime, endTime])
      @@map("studio_shift_blocks")
    }
    ```

### Shift Management Services
- **[NEW]** `apps/erify_api/src/models/studio-shift/studio-shift.service.ts`
  - CRUD operations for Shifts and their nested Blocks.
  - Generates the `projectedCost` automatically upon creation/update of blocks.
- **[NEW]** `apps/erify_api/src/controllers/studio-shift/studio-shift.controller.ts`
  - Endpoints to create, update, delete, and list shifts for a studio.
  - Endpoint: `GET /studios/:id/shifts/duty-manager?time=...` to resolve the active point of contact by finding the active Block.

### Alignment & Calendar Orchestration
- **[NEW]** `apps/erify_api/src/orchestration/shift-calendar/shift-calendar.service.ts`
  - **Daily Timeline View**: Given a date range (e.g. a week), returns the structured timeline of `StudioShifts` (with their active blocks) grouped by Date and User.
  - **Financial Aggregation**: Calculates and returns the total projected cost for the selected period.
- **[NEW]** `apps/erify_api/src/orchestration/shift-alignment/shift-alignment.service.ts`
  - **Cross-Checking Logic**: Given a timeframe, retrieves upcoming `Shows`, duty-manager shifts, and show-linked tasks.
  - **Operational Day Rule**: Day boundary is `06:00`. Shows before `06:00` belong to the previous operational day; shows at/after `06:00` belong to their calendar date.
  - **Duty-manager coverage**: The primary concern is that **at least one** duty manager is on-shift during any show — they are the person in charge and point of contact during live operations. Continuous coverage across the entire operational day is a secondary awareness metric.
  - Returns planning-risk warnings for:
    1. **Duty manager missing at show time** (critical): Upcoming shows with no overlapping duty-manager shift block.
    2. **Operational day duty-manager gap** (awareness): Uncovered segments between the first and last show in an operational day.
    3. **Show task readiness**: No tasks, unassigned tasks, missing required `SETUP`/`ACTIVE`/`CLOSURE` tasks, and premium shows missing moderation task.
  - **Resolved**: For shows with zero tasks, alignment now reports all required task types (`SETUP`/`ACTIVE`/`CLOSURE`) as missing, and flags missing moderation for premium shows.
- **[NEW]** `apps/erify_api/src/controllers/studio-shift/shift-calendar.controller.ts`
  - Exposes `GET /studios/:id/shift-calendar` (for the timeline & costs) and `GET /studios/:id/shift-alignment` (for cross-checking warnings).

## E2E Review Findings (March 5, 2026)

> All items below were resolved in the same branch. See `STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md` for the full implementation record.

### Backend Code Quality

1. **Soft-delete does not cascade to blocks**: **Resolved.** `softDeleteInStudio` now also soft-deletes all child `StudioShiftBlock` rows in the same repository operation.
2. **Double lookup on update**: **Resolved.** `StudioShiftService.updateShift` pre-fetches the shift once and passes `existing.id` directly to `StudioShiftRepository.updateShift`, eliminating the second lookup.
3. **Block UID instability**: **Resolved.** Block updates use positional-UID diff with nested `upsert` and `updateMany` (soft-delete removed blocks) instead of full block replacement, preserving stable block UIDs.
4. **No duplicate shift overlap guard**: **Resolved.** `ensureNoOverlapInStudio()` in `StudioShiftService` prevents overlapping non-cancelled shifts for the same user/studio on create and update.
5. **Local `JsonValue` type**: **Resolved.** Local `JsonValue`/`JsonObject` types are intentionally defined in the service to avoid importing Prisma types — this aligns with the service-layer pattern (no Prisma imports in services). The original recommendation to use `Prisma.JsonValue` was reversed during the PR review pass.

### Block Ordering & Shift Window Contract

1. **Shift window** derives from blocks: earliest `start_time` → latest `end_time`. The parent `StudioShift.date` is the logical start day only.
2. **Blocks must be time-series ordered**: each block's `start_time` must be ≥ the previous block's `end_time`.
3. **BE enforces**: `normalizeAndValidateBlocks` already sorts by `startTime` before overlap validation. This is correct — the API accepts unordered blocks and normalizes them.
4. **FE contract**: Frontend must sort blocks by `startTime` before submitting to prevent its own cross-midnight normalization from producing incorrect ISO strings.

### Future Integration Opportunities (TODO)

1. **Task assignment shift warning** — Implemented in studio show-task assignee flow: assignment now checks assignee overlap against `StudioShiftBlock` and surfaces a non-blocking warning if no shift covers the show window.
2. **Show alignment orchestration** — `shift-alignment` service (design Section 8) for duty-manager and show-task-readiness planning risks.
3. **Financial aggregation** — `shift-calendar` orchestration service for period cost rollups.
4. **Calendar event interactivity** — Admin: calendar block click → edit dialog or scroll-to table row. Member: click → read-only detail popover. Deferred to Phase 4 planning.
5. **Member `/my-shifts` table view** — Implemented as read-only table/list mode with date-range filtering alongside calendar view.
6. **Member availability** — Allow members to set availability slots for admin reference during shift creation.
7. **Recurring shift templates** — Weekly pattern creation instead of one-off entries.
8. **Shift data export** — CSV/Excel for payroll integration.

### Shared API Types

`StudioShift` and `StudioShiftBlock` types are defined in `@eridu/api-types/studio-shifts` and consumed by frontend shift modules.

## Verification Plan

### Automated Tests
- Unit tests for `StudioShiftService` cover rate calculation, overlap validation, block handling, update flows, cross-midnight cost calculation, and empty-block rejection. All tests passing.
- Unit tests for `ShiftAlignmentService` cover duty-manager show coverage gaps, operational-day gaps, and show task readiness risks. All tests passing.
- Controller tests cover show/create/update/delete flows and not-found handling.

### Manual Verification
- Seed `StudioShifts` via the schedule UI. Ensure the cost calculations display correctly.
- Test scenarios where a user is assigned a task during a show, but their shift ends *before* the show ends, ensuring the alignment warnings flag this discrepancy appropriately.

### Branch Verification Status (March 5, 2026)
- `pnpm --filter erify_api lint` — passed
- `pnpm --filter erify_api typecheck` — passed
- `pnpm --filter @eridu/api-types lint` — passed
- `pnpm --filter @eridu/api-types typecheck` — passed
- `pnpm --filter @eridu/api-types build` — passed
- All E2E review findings resolved. See `STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md` for full resolution record.
