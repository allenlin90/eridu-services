---
name: shift-schedule-pattern
description: Patterns for implementing and extending the Studio Shift Schedule feature. This skill should be used when working on shift CRUD, shift blocks, calendar/alignment orchestration, duty-manager coverage, operational-day boundaries, task-readiness checks, or the frontend shift schedule UX.
metadata:
  priority: 3
  applies_to: [backend, frontend, nestjs, react, shifts, orchestration]
  supersedes: []
---

# Shift Schedule Pattern

Studio Shift Schedule provides shift planning, duty-manager coverage analysis, and show-task readiness detection for live-commerce studios.

## Canonical Examples

Study these real implementations as the source of truth:

### Backend
- **Model Service**: [studio-shift.service.ts](../../../apps/erify_api/src/models/studio-shift/studio-shift.service.ts)
- **Repository**: [studio-shift.repository.ts](../../../apps/erify_api/src/models/studio-shift/studio-shift.repository.ts)
- **Schemas**: [studio-shift.schema.ts](../../../apps/erify_api/src/models/studio-shift/schemas/studio-shift.schema.ts)
- **Alignment Orchestration**: [shift-alignment.service.ts](../../../apps/erify_api/src/orchestration/shift-alignment/shift-alignment.service.ts)
- **Calendar Orchestration**: [shift-calendar.service.ts](../../../apps/erify_api/src/orchestration/shift-calendar/shift-calendar.service.ts)
- **Controller (Orchestration)**: [shift-calendar.controller.ts](../../../apps/erify_api/src/studios/studio-shift/shift-calendar.controller.ts)
- **Controller (CRUD)**: [studio-shift.controller.ts](../../../apps/erify_api/src/studios/studio-shift/studio-shift.controller.ts)

### Frontend
- **Calendar Card**: [shift-calendar-card.tsx](../../../apps/erify_studios/src/features/studio-shifts/components/shift-calendar-card.tsx)
- **Dashboard**: [dashboard.tsx](../../../apps/erify_studios/src/routes/studios/$studioId/dashboard.tsx)
- **My Shifts**: [my-shifts.tsx](../../../apps/erify_studios/src/routes/studios/$studioId/my-shifts.tsx)
- **Shared Utils**: [shift-timeline.utils.ts](../../../apps/erify_studios/src/features/studio-shifts/utils/shift-timeline.utils.ts)
- **Constants**: [studio-shifts.constants.ts](../../../apps/erify_studios/src/features/studio-shifts/constants/studio-shifts.constants.ts)

### Design Docs
- **Backend Design**: [STUDIO_SHIFT_SCHEDULE_DESIGN.md](../../../apps/erify_api/docs/design/STUDIO_SHIFT_SCHEDULE_DESIGN.md)
- **FE Features & Workflows**: [STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md](../../../apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md)
- **Business Rules**: [BUSINESS.md](../../../apps/erify_api/docs/BUSINESS.md) — see "Studio shift planning and control"

---

## Business Rules

### Operational Day Boundary

The operational day starts at **06:00 UTC**. Shows before 06:00 belong to the **previous** operational day.

```typescript
// Shift-alignment service uses this to bucket shows
private toOperationalDay(value: Date): string {
  const date = new Date(value);
  if (date.getUTCHours() < OPERATIONAL_DAY_START_HOUR_UTC) { // 6
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}
```

This rule affects:
- Duty-manager coverage windows (first show → last show per operational day)
- Dashboard date navigation (day ends at 06:00 next calendar day)
- Alignment reporting (shows grouped by operational day)

### Duty-Manager Coverage

Two-level check in `ShiftAlignmentService.getAlignment()`:

1. **Per-show**: each upcoming show must overlap with at least one duty-manager shift block → `duty_manager_missing_shows`
2. **Per-operational-day**: continuous duty-manager coverage from first-show-start to last-show-end → `duty_manager_uncovered_segments`

### Task Readiness Contract

Each upcoming show checked for:
- `has_no_tasks` — zero tasks linked to show
- `unassigned_task_count` — tasks with `assigneeId === null`
- `missing_required_task_types` — must have `SETUP`, `ACTIVE`, `CLOSURE`
- `missing_moderation_task` — **premium** shows only (standard name is `'premium'`)

---

## Shift Block Model

### Backend Enforcement

`normalizeAndValidateBlocks()` in `StudioShiftService`:

1. **Sort** blocks by `startTime` ascending (server-side re-sort)
2. **Validate** each block: `endTime > startTime`
3. **No overlaps**: each block's `startTime >= previous block's endTime`
4. **Non-empty**: at least one block required

### Shift Window Derivation

The shift window (start/end) is derived from blocks — not stored separately:
- **Start**: earliest block `startTime`
- **End**: latest block `endTime`

### Block UID Stability

`buildBlocksUpdateData()` uses positional UID matching to preserve block UIDs on update:

```typescript
// Positional match: reuse existing UID at same sorted index; generate new UID for extras
const blocksWithUid = blocks.map((block, index) => ({
  uid: sortedExistingBlocks[index]?.uid ?? this.generateBlockUid(),
  ...block,
}));

// Soft-delete removed blocks, upsert retained/new blocks
return {
  updateMany: { where: { uid: { notIn: retainedUids } }, data: { deletedAt } },
  upsert: blocksWithUid.map((block) => ({
    where: { uid: block.uid },
    update: { startTime, endTime, metadata, deletedAt: null },
    create: { uid, startTime, endTime, metadata },
  })),
};
```

### Overlap Guard

`ensureNoOverlapInStudio()` prevents a user from having overlapping non-cancelled shifts. Skipped when resulting status is `CANCELLED`.

---

## Frontend Contracts

### FE Block Sorting

Frontend `validateShiftBlocks()` must sort blocks by `startTime` **before** processing to ensure correct cross-midnight normalization and ISO string generation.

### Calendar Card UX

The `ShiftCalendarCard` always renders the `ScheduleXCalendar` component:
- **Never** conditionally unmount the calendar — use skeleton loaders for initial state
- Fixed-height container (`min-h-[680px]`) reserves layout space
- Persistent summary bar shows block count + date range
- `isFetching` triggers a subtle spinner overlay, not a full skeleton replacement

### Dashboard Day Navigation

Dashboard uses URL search params for day state:
```typescript
const dashboardSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  date: z.string().optional(), // YYYY-MM-DD, defaults to today
});
```

Navigation: simple prev/next day buttons. Operational day end at 06:00 next calendar day.

### Named Constants

Magic numbers extracted to `studio-shifts.constants.ts`:
- `DASHBOARD_DUTY_SHIFTS_LIMIT`
- `DASHBOARD_MY_SHIFTS_QUERY_LIMIT`
- `DASHBOARD_MY_UPCOMING_SHIFTS_LIMIT`
- `STUDIO_MEMBER_MAP_DEFAULT_LIMIT`

---

## Orchestration Architecture

```
ShiftCalendarController (admin-scoped)
    ├─→ GET shift-calendar  → ShiftCalendarService.getCalendar()
    └─→ GET shift-alignment → ShiftAlignmentService.getAlignment()

StudioShiftController (admin CRUD + member read)
    └─→ StudioShiftService (model service)
```

### ShiftCalendarService

Read-only aggregation for admin planning:
- Timeline grouped by UTC day → member → shifts → blocks
- Period-level totals (hours, projected cost, calculated cost)
- Clips and splits cross-day blocks for accurate per-day sums

### ShiftAlignmentService

Planning-risk analysis for admin warnings:
- Forward-looking only (skips past shows)
- Reports: `duty_manager_missing_shows`, `duty_manager_uncovered_segments`, `task_readiness_warnings`
- Summary: risk counts, operational days checked, shows checked

---

## Checklist

When implementing shift-related features:

- [ ] Use `OPERATIONAL_DAY_START_HOUR_UTC = 6` for day-boundary logic
- [ ] Blocks are always server-sorted by `startTime` ascending
- [ ] FE sorts blocks before submitting to API
- [ ] Overlap guard runs for non-CANCELLED shifts
- [ ] Block UIDs are preserved via positional matching on update
- [ ] Calendar component is always mounted (no conditional unmount)
- [ ] Dashboard date state lives in URL search params
- [ ] Named constants used instead of magic numbers
- [ ] Alignment checks cover both per-show and per-operational-day duty-manager coverage
- [ ] Task readiness checks include SETUP, ACTIVE, CLOSURE (+ moderation for premium)

---

## Related Skills

- **[Orchestration Service NestJS](../orchestration-service-nestjs/SKILL.md)** — General orchestration patterns
- **[Service Pattern NestJS](../service-pattern-nestjs/SKILL.md)** — Model service patterns
- **[Database Patterns](../database-patterns/SKILL.md)** — Soft delete, transactions, advisory locks
- **[Schedule Continuity Workflow](../schedule-continuity-workflow/SKILL.md)** — Schedule update/validate/publish behavior
