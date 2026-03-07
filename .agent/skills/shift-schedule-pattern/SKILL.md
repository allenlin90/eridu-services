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
- **Show Readiness Triage Panel**: [show-readiness-triage-panel.tsx](../../../apps/erify_studios/src/features/studio-shows/components/show-readiness/show-readiness-triage-panel.tsx)
- **Show Readiness Utils**: [show-readiness.utils.ts](../../../apps/erify_studios/src/features/studio-shows/utils/show-readiness.utils.ts)
- **Show Scope Utils**: [show-scope.utils.ts](../../../apps/erify_studios/src/features/studio-shows/utils/show-scope.utils.ts)

### Design Docs
- **Backend Design**: [STUDIO_SHIFT_SCHEDULE_DESIGN.md](../../../apps/erify_api/docs/design/STUDIO_SHIFT_SCHEDULE_DESIGN.md)
- **FE Features & Workflows**: [STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md](../../../apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md)
- **Business Rules**: [BUSINESS.md](../../../apps/erify_api/docs/BUSINESS.md) — see "Studio shift planning and control"

---

## Business Rules

### Operational Day Boundary

Backend orchestration and frontend UX intentionally use different boundary semantics:

- **Backend orchestration (`shift-alignment`)**: operational day starts at **06:00 UTC** for consistent risk bucketing.
- **Frontend route UX (`dashboard`, `my-shifts`)**: operational day windows are computed in **local runtime time** from date inputs, then serialized to ISO for API filters.

This is compatible with the storage rule: DB timestamps are UTC instants; presentation and date-input interpretation are local.

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

Backend 06:00 UTC rule affects:
- Duty-manager coverage windows (first show → last show per operational day)
- Alignment reporting (shows grouped by operational day)

Frontend implementation rule:
- Reuse shared operational-day utilities (for example, `buildOperationalDayWindow` and shared hour constants in `studio-shifts/utils`) instead of re-implementing day-start/day-end boundary math inside route files.
- Keep local-day boundary math and display formatting separate from backend UTC bucketing logic.

### Duty-Manager Coverage

Two-level check in `ShiftAlignmentService.getAlignment()`:

1. **Per-show**: each upcoming show must overlap with at least one duty-manager shift block → `duty_manager_missing_shows`
2. **Per-operational-day**: continuous duty-manager coverage from first-show-start to last-show-end → `duty_manager_uncovered_segments`

### Task Readiness Contract

Each upcoming show checked for:
- `has_no_tasks` — zero tasks linked to show
- `unassigned_task_count` — tasks with `assigneeId === null`
- `missing_required_task_types` — baseline must have `SETUP`, `CLOSURE`
- `missing_moderation_task` — **premium** shows only (standard name is `'premium'`)

### Studio Shows "Issues" Filter Contract

For the studio shows list (`/studios/$studioId/shows`), the quick `Issues` filter must align with the readiness definition and date scope:

- UI label: short chip (`Issues`) with alert icon.
- Date alignment: use the same selected scope window as the shows table query.
- Attention definition:
  - show has no tasks
  - show has unassigned tasks
  - show is missing required baseline task types (`SETUP`, `CLOSURE`)
  - premium show is missing moderation coverage

Implementation pattern:
- FE computes show-scope datetime bounds (`date_from/date_to`) via `toShowScopeDateTimeBounds()`, using operational-day cutoff behavior (D+1 `05:59` local), and passes the same bounds to table, Show Readiness panel, and `needs_attention`.
- BE resolves readiness warnings using `include_past: true` and `match_show_scope: true` so all shows whose `startTime` falls within the selected window are evaluated regardless of whether they have already started. The paginated show query is then constrained to the warning show UIDs.
- `dateFromIsDateOnly`/`dateToIsDateOnly` flags on `getAlignment()` control whether the service expands bounds to day boundaries or uses the caller's datetime as-is. Pass `false` when sending full ISO datetimes from the FE.
- Legacy `planning_date_from/planning_date_to` may remain as fallback input only, but must be strict ISO date-only (`YYYY-MM-DD`) and reject invalid values with `400`.
- Bulk Generate/Assign dialogs should close immediately after user confirmation; keep the selected show set persisted so admins can chain follow-up actions without reselecting.
- FE scope-total query should refresh via query key changes (for example, include `refreshSignal` in the query key) rather than combining key invalidation with extra effect-driven `refetch()` calls for the same query. Use `useRef` to gate manual `refetch()` calls to signal increments only (not mount or scope changes).

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

### Partial Update — Hourly Rate Re-derivation

On `updateShift`, hourly rate is re-derived from membership **only on an actual user reassignment** (i.e. `payload.userId` is present AND differs from `existing.user.uid`). Sending the current `user_id` alongside other fields (e.g. `is_duty_manager: true`) must not trigger membership lookup or throw `"Hourly rate is required"` — the shift's stored rate is preserved.

```typescript
const isReassignment = payload.userId && payload.userId !== existing.user.uid;
if (isReassignment) {
  const membership = await this.findStudioMembershipOrThrow(studioId, targetUserId);
  if (!payload.hourlyRate) {
    hourlyRate = this.resolveMembershipHourlyRateOrThrow(membership.baseHourlyRate);
  }
}
```

### Overlap Guard

`ensureNoOverlapInStudio()` prevents a user from having overlapping non-cancelled shifts. Skipped when resulting status is `CANCELLED`.

---

## Frontend Contracts

### FE Block Sorting and Cross-Midnight Sequential Normalization

Frontend `validateShiftBlocks()` must sort blocks by `startTime` **before** processing to ensure correct cross-midnight normalization and ISO string generation.

Two distinct normalization steps run in sequence per block:

1. **Single-block cross-midnight**: if `endDate <= startDate` (end time wraps past midnight), advance `endDate` by one day. Example: `23:00–01:00` → `March 5 23:00 – March 6 01:00`.
2. **Sequential cross-midnight advance**: if the **previous** block crossed midnight and `startDate < previousEndTime`, advance both `startDate` and `endDate` forward (day by day until the overlap clears). Example: block A is `03:00–02:00` (→ March 6 02:00); block B entered as `04:00–06:00` initially resolves to March 5 04:00, which is before March 6 02:00 — advancing by one day gives March 6 04:00–06:00, which is correct.

**Critical rule**: the sequential advance only runs when `prevBlockCrossedMidnight` is `true`. When the previous block did NOT cross midnight, any overlap is a genuine user input error and must be surfaced immediately (return `{ error: 'Time blocks cannot overlap.' }`). Applying the advance unconditionally silently converts overlapping same-day inputs (e.g. `09:00–12:00` and `11:00–13:00`) into unintended next-day blocks with wrong costs and incorrect Schedule-X timeline placement.

```typescript
// prevBlockCrossedMidnight tracks whether previous endDate != previous startDate (calendar day)
if (previousEndTime && prevBlockCrossedMidnight) {
  while (startDate.getTime() < previousEndTime.getTime()) {
    startDate.setDate(startDate.getDate() + 1);
    endDate.setDate(endDate.getDate() + 1);
  }
}
if (previousEndTime && startDate.getTime() < previousEndTime.getTime()) {
  return { error: 'Time blocks cannot overlap.', blocks: null };
}
```

### Calendar Card UX

The `ShiftCalendarCard` always renders the `ScheduleXCalendar` component:
- **Never** conditionally unmount the calendar — use skeleton loaders for initial state
- Fixed-height container (`min-h-[680px]`) reserves layout space
- Persistent summary bar shows block count + date range
- `isFetching` triggers a subtle spinner overlay, not a full skeleton replacement

### Schedule-X Timeline Rendering Contract

When mapping shift blocks to `Schedule-X` events:

1. Set calendar `timezone` explicitly (runtime IANA zone) so rendering does not fall back to an unintended default timezone.
2. Convert block boundaries through Temporal timezone-aware conversion (preserve instant for `Z`/offset inputs).
3. Split cross-midnight timed blocks into per-day segments before passing to `Schedule-X` so overnight blocks stay in the time-grid timeline instead of being classified into date-grid/all-day rendering.

Pattern:

```typescript
const calendarTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const calendarApp = useNextCalendarApp({
  timezone: calendarTimeZone,
  events: splitCrossMidnightSegments(mappedBlocks),
  // ...
});
```

### View-Aware Calendar Fetch Sizing

Calendar fetch limits must scale with visible range:
- `day` bucket: low/minimal fetch budget
- `week` bucket: medium budget
- `month` bucket: highest budget

Use shared range utilities (`getShiftCalendarViewBucket`, `getShiftCalendarRangeLimit`) to derive query `limit` from range span and keep query-key caching consistent by including `{ date_from, date_to, limit }`.

### Dashboard Day Navigation

Dashboard uses URL search params for day state:
```typescript
const dashboardSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  date: z.string().optional(), // YYYY-MM-DD, defaults to today
});
```

Navigation: simple prev/next day buttons. Frontend day window is local-runtime based (ends at local `06:00` next calendar day by default utility constant).

### Named Constants

Magic numbers extracted to `studio-shifts.constants.ts`:
- `DASHBOARD_DUTY_SHIFTS_LIMIT` (20 — reduced from 200 in March 2026 ops refactor)
- `STUDIO_MEMBER_MAP_DEFAULT_LIMIT`
- `STUDIO_MEMBER_MAP_CALENDAR_LIMIT`

Note: `DASHBOARD_MY_SHIFTS_QUERY_LIMIT` and `DASHBOARD_MY_UPCOMING_SHIFTS_LIMIT` were removed when the "My Upcoming Shifts" dashboard card was removed in the March 2026 ops-improvement refactor.

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

- [ ] Backend orchestration day-bucketing uses `OPERATIONAL_DAY_START_HOUR_UTC = 6`
- [ ] Blocks are always server-sorted by `startTime` ascending
- [ ] FE sorts blocks before submitting to API
- [ ] Overlap guard runs for non-CANCELLED shifts
- [ ] Block UIDs are preserved via positional matching on update
- [ ] Calendar component is always mounted (no conditional unmount)
- [ ] Calendar timezone is explicitly configured (do not rely on library defaults)
- [ ] Cross-midnight blocks are split to per-day timeline segments for Schedule-X
- [ ] Calendar query limit is derived from view/range bucket (day/week/month), not a single static ceiling
- [ ] Dashboard date state lives in URL search params
- [ ] Frontend operational-day boundary math uses shared local-time utility/constant (no duplicated route-local implementations)
- [ ] Named constants used instead of magic numbers
- [ ] Alignment checks cover both per-show and per-operational-day duty-manager coverage
- [ ] Task readiness checks include SETUP, CLOSURE (+ moderation for premium)
- [ ] Shows table, Show Readiness panel, and `needs_attention` all use the same datetime scope window (`date_from/date_to`)
- [ ] Service metadata types use local `JsonValue`/`JsonObject` (no Prisma imports in service layer)
- [ ] Internal-only Zod transform shapes use `_internal*` naming prefix
- [ ] Prisma `Decimal` fields use `z.unknown()` in internal shapes with `decimalToString` helper
- [ ] Form date+time combination uses local-time `Date` constructor (no `Z` suffix)
- [ ] Orchestration response types (`StudioShiftCalendarResponse`, `StudioShiftAlignmentResponse`) are sourced from `@eridu/api-types/studio-shifts`
- [ ] FE cross-midnight sequential day-advance is gated on `prevBlockCrossedMidnight` — same-day overlapping blocks must return an error, not silently advance
- [ ] `updateShift` re-derives hourly rate only when assignee actually changes (`payload.userId !== existing.user.uid`)

---

## Patterns from PR Review (March 2026)

### Local JSON Types in Service Layer

Services must NOT import `Prisma` types. For metadata fields that accept JSON objects, define local structural types instead:

```typescript
// In studio-shift.service.ts — NOT from Prisma
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type ShiftBlockInput = {
  uid?: string;
  startTime: Date;
  endTime: Date;
  metadata: JsonObject;  // Uses local JsonObject, not Prisma.InputJsonObject
};
```

This is structurally compatible with Prisma's `InputJsonValue` and keeps the service layer free of Prisma imports, consistent with the service-pattern-nestjs skill.

### `_internal*` Naming for Transform-Only Zod Shapes

When a Zod shape is used only as an input to `.transform()` in a DTO and should never be used as a response validator or exported type, prefix it with `_internal`:

```typescript
// Internal transform-only shape — never exposed as a response validator.
// BigInt PKs/FKs are omitted; only fields consumed by the transform are declared.
const _internalShiftBlockShape = z.object({
  uid: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  metadata: z.record(z.string(), z.unknown()),
  // ...
});
```

This makes the intended scope explicit to future readers and signals that the shape is NOT the public API contract.

### `z.unknown()` for Prisma Decimal Fields in Transform Shapes

Prisma `Decimal` fields are a runtime object type, not a primitive. In internal transform shapes, use `z.unknown()` rather than `z.number()` or `z.string()` — then convert via a helper:

```typescript
// In _internalShiftWithRelationsShape:
hourlyRate: z.unknown(),      // Prisma Decimal — runtime object
projectedCost: z.unknown(),
calculatedCost: z.unknown().nullable(),

// Helper to handle number | string | Prisma.Decimal at runtime:
function decimalToString(value: unknown): string {
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return (value as { toString: () => string }).toString();
  }
  return '0.00';
}
```

### `combineDateAndTime` — Local-Time ISO Pattern

When a form has separate date (`YYYY-MM-DD`) and time (`HH:MM`) inputs that represent local user time, construct the ISO string as a local-time `Date` to avoid UTC offset drift:

```typescript
// CORRECT — treats date+time as local browser time, then converts to UTC ISO
export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

// WRONG — UTC construction: midnight UTC ≠ midnight local on any non-UTC machine
// new Date(`${date}T${time}:00Z`).toISOString()
```

`Date` constructor with no trailing `Z` parses the string as local time in all modern browsers.

### Shared API Types for Orchestration Responses

Orchestration response types (`StudioShiftCalendarResponse`, `StudioShiftAlignmentResponse`) belong in `@eridu/api-types/studio-shifts`, not in frontend-local type files. The frontend re-exports or uses them directly:

```typescript
// packages/api-types/src/studio-shifts/types.ts
export type StudioShiftCalendarResponse = z.infer<typeof shiftCalendarResponseSchema>;
export type StudioShiftAlignmentResponse = z.infer<typeof shiftAlignmentResponseSchema>;

// apps/erify_studios/src/features/studio-shifts/api/studio-shifts.types.ts
import type { StudioShiftAlignmentResponse, StudioShiftCalendarResponse } from '@eridu/api-types/studio-shifts';
export type { StudioShiftAlignmentResponse, StudioShiftCalendarResponse };
```

This ensures the frontend type is always in sync with the backend schema and avoids duplicated declarations.

### Typed Metadata Schemas

Each entity with a `metadata: Json` column should have a dedicated Zod schema documenting its known fields. Never use `z.record(z.string(), z.any())` as the public API contract for metadata.

**Pattern** (applied to `StudioShift` and `StudioShiftBlock`):

```typescript
// In @eridu/api-types/studio-shifts/schemas.ts  ← canonical API contract for frontend
export const studioShiftBlockMetadataSchema = z.object({
  notes: z.string().optional(),
});

export const studioShiftMetadataSchema = z.object({
  notes: z.string().optional(),
});

// In backend studio-shift.schema.ts  ← mirrored for input validation and response pipe
const studioShiftBlockMetadataSchema = z.object({ notes: z.string().optional() });
const studioShiftMetadataSchema     = z.object({ notes: z.string().optional() });
```

Rules:
- **`@eridu/api-types`**: authoritative API contract; export named types (`StudioShiftMetadata`, `StudioShiftBlockMetadata`).
- **Backend schema file**: mirror the same shape for input validation and the response `.pipe()`.
- **Internal transform shapes** (`_internal*`): keep `z.record(z.string(), z.unknown())` — these receive raw Prisma `Json` and must accept any stored value before the transform runs.
- **Extend by adding optional fields** to both schema files when a new metadata use-case is established.

---

## Related Skills

- **[Orchestration Service NestJS](../orchestration-service-nestjs/SKILL.md)** — General orchestration patterns
- **[Service Pattern NestJS](../service-pattern-nestjs/SKILL.md)** — Model service patterns
- **[Database Patterns](../database-patterns/SKILL.md)** — Soft delete, transactions, advisory locks
- **[Schedule Continuity Workflow](../schedule-continuity-workflow/SKILL.md)** — Schedule update/validate/publish behavior
