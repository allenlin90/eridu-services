# Studio Shift Schedule (Shipped — March 2026)

> **Status**: Fully implemented on `feat/studio-shift-schedule`. All backend and frontend features complete.

## Canonical docs
- **Skill**: `.agent/skills/shift-schedule-pattern/SKILL.md` — authoritative guide for future work
- **FE features/workflows**: `apps/erify_studios/docs/STUDIO_SHIFT_SCHEDULE_FEATURES_AND_WORKFLOWS.md`
- **Backend design**: `apps/erify_api/docs/design/STUDIO_SHIFT_SCHEDULE_DESIGN.md`
- **Business rules**: `apps/erify_api/docs/BUSINESS.md` — "Studio shift planning and control"

## What was implemented

### Backend (`erify_api`)
- Prisma schema: `StudioMembership.baseHourlyRate`, `StudioShift`, `StudioShiftBlock`, `StudioShiftStatus` enum
- Model service/repository/schema: `src/models/studio-shift/`
- Studio-scoped CRUD controller: `src/studios/studio-shift/studio-shift.controller.ts`
  - `GET /studios/:studioId/shifts` (paginated, filterable by user/status/date)
  - `GET /studios/:studioId/shifts/:id`
  - `POST /studios/:studioId/shifts`
  - `PATCH /studios/:studioId/shifts/:id`
  - `DELETE /studios/:studioId/shifts/:id`
  - `GET /studios/:studioId/shifts/duty-manager?time=...`
- Orchestration controllers: `src/studios/studio-shift/shift-calendar.controller.ts`
  - `GET /studios/:studioId/shifts/calendar` — view-range-based calendar events
  - `GET /studios/:studioId/shifts/alignment` — duty-manager coverage + task-readiness risks
- Me-scoped endpoint: `GET /me/shifts` — user's own shifts (paginated)
- Task warning: `TaskOrchestrationService` now checks shift coverage overlap when assigning tasks

### Frontend (`erify_studios`)
- Feature folder: `src/features/studio-shifts/` (API hooks, components, utils, tests)
- Routes:
  - `/studios/:studioId/shifts` — admin shift management (table + calendar)
  - `/studios/:studioId/my-shifts` — member's own shifts (table + calendar toggle)
- Dashboard (`/studios/:studioId/dashboard`) — duty-manager coverage cards, task-readiness cards, date navigation
- Shared route access policy: `src/lib/constants/studio-route-access.ts`
- Guard: `src/components/guards/studio-route-guard.tsx`
- Sidebar: `shifts` (ADMIN/MANAGER only), `myShifts` (all members) using same policy

### Shared packages
- `@eridu/api-types/studio-shifts` — Zod schemas + types for all shift API contracts

## Key business rules (summary — see SKILL.md for full detail)
- Shift window derived from blocks (earliest start → latest end), not stored separately
- Block UIDs preserved positionally on update (stable refs for downstream)
- Hourly rate re-derived from membership **only on actual user reassignment** (not on other partial updates)
- Overlap guard: no two non-cancelled shifts for same user can overlap in time
- Operational day boundary: backend uses 06:00 UTC for duty-manager bucketing; frontend uses local wall time
- Duty-manager coverage: per-show AND per-operational-day continuous coverage checked
- Task readiness: `has_no_tasks`, `unassigned_task_count`, `missing_required_task_types`, `missing_moderation_task`

## PR review fixes applied (March 2026)
- Local `type` declarations in FE components replaced with JSON-safe types
- Internal helper names prefixed with `_internal` convention
- `z.unknown()` used for Prisma `Decimal` in shared API types
- `combineDateAndTime` helper used instead of ISO string manipulation
- `prevBlockCrossedMidnight` gate added to prevent silent same-day → next-day advance
- Schedule-X timezone explicitly set from runtime IANA zone
- Cross-midnight blocks split into per-day segments for timeline rendering
- Calendar query limit derived from view bucket (day/week/month) instead of static ceiling
