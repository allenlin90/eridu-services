# Shift Schedule Pattern — Detailed References

Extended guidance for shift schedule implementation: block model, frontend contracts, orchestration.

## File References

### Backend
- Model service: `apps/erify_api/src/models/studio-shift/studio-shift.service.ts`
- Repository: `apps/erify_api/src/models/studio-shift/studio-shift.repository.ts`
- Schemas: `apps/erify_api/src/models/studio-shift/schemas/studio-shift.schema.ts`
- Alignment orchestration: `apps/erify_api/src/orchestration/shift-alignment/shift-alignment.service.ts`
- Calendar orchestration: `apps/erify_api/src/orchestration/shift-calendar/shift-calendar.service.ts`
- Controllers: `shift-calendar.controller.ts`, `studio-shift.controller.ts`

### Frontend
- Calendar card: `apps/erify_studios/src/features/studio-shifts/components/shift-calendar-card.tsx`
- Dashboard: `apps/erify_studios/src/routes/studios/$studioId/dashboard.tsx`
- My Shifts: `apps/erify_studios/src/routes/studios/$studioId/my-shifts.tsx`
- Shared Utils: `shift-timeline.utils.ts`, `studio-shifts.constants.ts`
- Show Readiness: `show-readiness-triage-panel.tsx`, `show-readiness.utils.ts`, `show-scope.utils.ts`

### Design Docs
- `apps/erify_api/docs/STUDIO_SHIFT_SCHEDULE.md`
- `apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md`
- `docs/domain/BUSINESS.md`

## Shift Block Model

### Backend Enforcement (`normalizeAndValidateBlocks()`)
1. Sort blocks by `startTime` ascending
2. Validate: `endTime > startTime`
3. No overlaps: each block `startTime >= previous endTime`
4. Non-empty: at least one block required

### Shift Window Derivation
Derived from blocks — not stored separately. Start = earliest block start, End = latest block end.

### Block UID Stability (Positional Matching)
```typescript
const blocksWithUid = blocks.map((block, index) => ({
  uid: sortedExistingBlocks[index]?.uid ?? this.generateBlockUid(),
  ...block,
}));
// Soft-delete removed blocks, upsert retained/new blocks
```

### Partial Update — Hourly Rate Re-derivation
On `updateShift`, hourly rate re-derived only on actual user reassignment (`payload.userId !== existing.user.uid`). Sending current `user_id` alongside other fields must NOT trigger membership lookup.

### Overlap Guard
`ensureNoOverlapInStudio()` prevents overlapping non-cancelled shifts. Skipped when status is `CANCELLED`.

## Frontend Contracts

### Hourly Rate Decimal Comparison
Normalize both stored API value and typed value with same money helper before comparing:
```typescript
const rateChanged = toMoneyString(rateInput) !== toMoneyString(shift.hourly_rate);
```

### FE Block Sorting and Cross-Midnight Normalization
Sort blocks by `startTime` before processing. Two normalization steps:
1. **Single-block cross-midnight**: if `endDate <= startDate`, advance `endDate` by one day
2. **Sequential cross-midnight advance**: if previous block crossed midnight AND `startDate < previousEndTime`, advance forward

**Critical**: Sequential advance only runs when `prevBlockCrossedMidnight` is `true`. Same-day overlap without cross-midnight = genuine error → return immediately.

### Calendar Card UX
- Never conditionally unmount `ScheduleXCalendar` — use skeleton loaders
- Fixed-height container (`min-h-[680px]`)
- `isFetching` → subtle spinner overlay, not full skeleton replacement

### Schedule-X Timeline Rendering
1. Set calendar `timezone` explicitly (runtime IANA zone)
2. Convert block boundaries through timezone-aware conversion
3. Split cross-midnight blocks into per-day segments for time-grid rendering

### View-Aware Calendar Fetch Sizing
- Seed initial query range from mounted Schedule-X week window
- Use shared range utilities for query `limit` derivation
- Include `{ date_from, date_to, limit }` in query key

### Named Constants (`studio-shifts.constants.ts`)
- `DASHBOARD_DUTY_SHIFTS_LIMIT` (20)
- `STUDIO_MEMBER_MAP_DEFAULT_LIMIT`
- `STUDIO_MEMBER_MAP_CALENDAR_LIMIT`

## Orchestration Architecture

```
ShiftCalendarController (admin-scoped)
    ├─→ GET shift-calendar  → ShiftCalendarService.getCalendar()
    └─→ GET shift-alignment → ShiftAlignmentService.getAlignment()

StudioShiftController (admin CRUD + member read)
    └─→ StudioShiftService (model service)
```

### ShiftCalendarService
Read-only aggregation: timeline grouped by UTC day → member → shifts → blocks, with period-level totals.

### ShiftAlignmentService
Planning-risk analysis: forward-looking only, reports duty-manager gaps and task-readiness warnings.

## PR Review Patterns

### Local JSON Types in Service Layer
```typescript
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };
```
Use instead of `Prisma.InputJsonObject`.

### `_internal*` Naming for Transform-Only Zod Shapes
Prefix with `_internal` when shape is only used as `.transform()` input — never exported as response validator.

### `z.unknown()` for Prisma Decimal Fields
In internal transform shapes, use `z.unknown()` + `decimalToString()` helper.

### `combineDateAndTime` — Local-Time ISO Pattern
```typescript
// CORRECT: local time Date constructor
new Date(`${date}T${time}:00`).toISOString();
// WRONG: UTC construction with Z suffix
```

### Typed Metadata Schemas
Each entity with `metadata: Json` column gets a dedicated Zod schema in both `@eridu/api-types` and backend schemas. Internal transform shapes keep `z.record(z.string(), z.unknown())`.
