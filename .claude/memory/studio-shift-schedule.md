# Studio Shift Schedule (2026-03-04)

## What was implemented
- Prisma foundation added:
  - `StudioMembership.baseHourlyRate`
  - `StudioShift` + `StudioShiftBlock`
  - `StudioShiftStatus` enum
- Studio API foundation added:
  - `GET /studios/:studioId/shifts`
  - `GET /studios/:studioId/shifts/:id`
  - `POST /studios/:studioId/shifts`
  - `PATCH /studios/:studioId/shifts/:id`
  - `DELETE /studios/:studioId/shifts/:id`
  - `GET /studios/:studioId/shifts/duty-manager?time=...`

## Current behavior notes
- Projected cost is auto-calculated from total block duration x hourly rate.
- Hourly rate falls back to `StudioMembership.baseHourlyRate` when `hourly_rate` is omitted.
- Shift blocks are validated to prevent overlap and invalid ranges.
- API is wired in `StudiosModule` via `StudioShiftApiModule`.

## Pending from design doc
- Shift calendar orchestration endpoint (`shift-calendar`).
- Shift/show alignment endpoint and warning generation.
- Dedicated unit tests for shift service and alignment service.

## Recent FE Delivery Notes (2026-03-06)

- Schedule-X calendar timezone is now explicitly set from runtime IANA timezone in shift calendar config to prevent UTC-default rendering drift.
- Shift block event mapping now preserves instant semantics for ISO timestamps and uses timezone-aware Temporal conversion.
- Cross-midnight shift blocks are split into single-day timed segments before calendar render so overnight events appear in timeline lanes (not top all-day/date-grid area).
- Calendar query limits are now view-aware (`day`/`week`/`month`) based on visible range span, reducing over-fetch while maintaining per-query cache reuse (`date_from`, `date_to`, `limit`).
