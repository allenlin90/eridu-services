---
name: shift-schedule-pattern
description: Patterns for implementing and extending the Studio Shift Schedule feature. This skill should be used when working on shift CRUD, shift blocks, calendar/alignment orchestration, duty-manager coverage, operational-day boundaries, task-readiness checks, or the frontend shift schedule UX.
---

# Shift Schedule Pattern

Studio Shift Schedule: shift planning, duty-manager coverage, and show-task readiness for live-commerce studios.

> See [references/shift-schedule-details.md](references/shift-schedule-details.md) for block model, frontend contracts, orchestration architecture, and PR review patterns.

## Business Rules

### Operational Day Boundary
- **Backend** (`shift-alignment`, `run-review`): timezone-agnostic and query-agnostic; queries strictly by client-supplied ISO-8601 time range boundaries to avoid date manipulation duplication on the server.
- **Frontend** (`dashboard`, `my-shifts`, `show-run-review`): local runtime time for date inputs, serialized to absolute ISO-8601 bounds using shared operational-day range utilities.
- FE must use shared operational-day utilities, not duplicated route-local implementations.

### Duty-Manager Coverage (`ShiftAlignmentService.getAlignment()`)
1. **Per-show**: each upcoming show overlaps ≥1 duty-manager shift block
2. **Per-operational-day**: continuous duty-manager coverage first-show-start → last-show-end

### Task Readiness
Each upcoming show checked for: `has_no_tasks`, `unassigned_task_count`, `missing_required_task_types` (SETUP, CLOSURE), `missing_moderation_task` (premium shows require ≥1 active loop-based task template).
- A per-studio configuration system for these requirements (e.g. required types for `bau` vs `premium` shows) is identified as a gap but deferred — Phase 5 scopes show-level readiness checks against today's fixed rules; dynamic per-studio configuration needs separate design (see [show-production-lifecycle](../show-production-lifecycle/SKILL.md)).

### Studio Shows "Issues" Filter
- Same datetime scope window (`date_from/date_to`) across shows table, readiness panel, and `needs_attention`
- FE computes bounds via `toShowScopeDateTimeBounds()` with operational-day cutoff
- BE resolves with `include_past: true`, `match_show_scope: true`

## Key Implementation Rules

1. Blocks always server-sorted by `startTime` ascending
2. FE sorts blocks before submitting to API
3. Block UIDs preserved via positional matching on update
4. Overlap guard runs for non-CANCELLED shifts
5. Calendar component always mounted (no conditional unmount)
6. Calendar timezone explicitly configured
7. Cross-midnight blocks split to per-day segments for Schedule-X
8. Calendar query limit derived from view/range bucket (day/week/month)
9. Hourly rate re-derived only on actual user reassignment
10. FE cross-midnight sequential advance gated on `prevBlockCrossedMidnight`

## Orchestration

```
ShiftCalendarController → ShiftCalendarService.getCalendar()   (read-only aggregation)
                        → ShiftAlignmentService.getAlignment() (planning-risk analysis)
StudioShiftController   → StudioShiftService                   (CRUD)
```

## Checklist

- [ ] Backend day-bucketing uses `OPERATIONAL_DAY_START_HOUR_UTC = 6`
- [ ] FE operational-day boundary uses shared utility/constant
- [ ] Named constants used (no magic numbers)
- [ ] Alignment covers per-show + per-operational-day duty-manager coverage
- [ ] Shows table, readiness panel, `needs_attention` use same datetime scope
- [ ] Service types use local `JsonValue`/`JsonObject` (no Prisma imports)
- [ ] Orchestration response types from `@eridu/api-types/studio-shifts`
- [ ] Dashboard date state in URL search params

## Related Skills

- [orchestration-service-nestjs](../orchestration-service-nestjs/SKILL.md) — General orchestration
- [schedule-continuity-workflow](../schedule-continuity-workflow/SKILL.md) — Schedule publish behavior
- [show-production-lifecycle](../show-production-lifecycle/SKILL.md) — owns the show-level readiness checklist and state gates that consume this skill's task-readiness signal
