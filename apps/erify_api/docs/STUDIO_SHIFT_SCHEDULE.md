# Studio Shift Schedule

> Backend services for shift CRUD, calendar aggregation, and alignment (readiness + duty-manager coverage).

## Implementation

- Alignment service: [shift-alignment.service.ts](../src/orchestration/shift-alignment/shift-alignment.service.ts)
- Calendar service: [shift-calendar.service.ts](../src/orchestration/shift-calendar/shift-calendar.service.ts)
- Shift model service: [studio-shift.service.ts](../src/models/studio-shift/studio-shift.service.ts)
- Controller: [shift-calendar.controller.ts](../src/studios/studio-shift/shift-calendar.controller.ts)
- Schema: [studio-shift.schema.ts](../src/models/studio-shift/schemas/studio-shift.schema.ts)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/studios/:id/shifts` | List / create shifts |
| PATCH/DELETE | `/studios/:id/shifts/:shiftId` | Update / delete shift |
| PATCH | `/studios/:id/shifts/:shiftId/duty-manager` | Assign duty manager |
| GET | `/studios/:id/shifts/duty-manager?time=` | Resolve active duty manager |
| GET | `/studios/:id/shift-calendar` | Timeline aggregation by day/member |
| GET | `/studios/:id/shift-alignment` | Planning risk warnings |

## Alignment API flags

`GET .../shift-alignment` query params:

- `include_past=true` — include shows that have already started or ended
- `match_show_scope=true` — match shows by `startTime` range (not overlap) for scope-aligned readiness
- `date_from`/`date_to` — ISO date (`YYYY-MM-DD`) or datetime; service detects format internally

## Key rules

- **Required task type baseline**: `SETUP` + `CLOSURE`. Premium shows (standard name `'premium'`) also require a moderation task (`missing_moderation_task`). `ACTIVE` is not a readiness gate.
- **Operational day bucketing**: 06:00 UTC boundary for duty-manager coverage grouping.
- **Block UID stability**: positional match on update reuses existing UIDs; removed blocks are soft-deleted.
- **Hourly rate on reassignment**: re-derived from membership only when `payload.userId` differs from the existing user; same-user PATCH preserves the stored rate.

## Full feature doc

[STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md](../../erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md)
