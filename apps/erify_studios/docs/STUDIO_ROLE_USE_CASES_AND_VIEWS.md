# Studio Roles — Use Cases, Views, and Functions

> Scope: `erify_studios` studio-scoped area (`/studios/:studioId/*`) with focus on daily operations, shift scheduling, task management, and creator operations.

## Purpose

Define what each studio role can see and do across all studio-scoped routes.

## Roles

| Role | Focus |
|------|-------|
| `ADMIN` | Full studio access except system management |
| `MANAGER` | Same as ADMIN except studio membership management |
| `TALENT_MANAGER` | Creator-focused: catalog, roster, availability, show creator assignment |
| `DESIGNER` | Member-level — own tasks and shifts only |
| `MODERATION_MANAGER` | Member-level — own tasks and shifts only |
| `MEMBER` | Own tasks and shifts only |

## High-Level Principles

1. **Dashboard is shared visibility**: all studio roles can check today's shows and duty-manager coverage.
2. **ADMIN and MANAGER are operationally equivalent**: both can manage shifts, shows, tasks, templates. The only ADMIN-exclusive action is studio membership management (not a frontend route — handled via admin API).
3. **TALENT_MANAGER has a focused scope**: creator catalog/roster reads and show creator assignment. No task ops, shift ops, or template access.
4. **DESIGNER and MODERATION_MANAGER are member-level**: access is limited to their own tasks and shifts.
5. **Single-purpose routes**: shows route = task ops only; creator-mapping route = creator assignment only.

## Route Access Matrix

| Route | ADMIN | MANAGER | TALENT_MANAGER | DESIGNER | MODERATION_MANAGER | MEMBER |
| ----- | ----- | ------- | -------------- | -------- | ------------------ | ------ |
| `/studios/:studioId/dashboard` | View | View | View | View | View | View |
| `/studios/:studioId/my-tasks` | View/Execute | View/Execute | View/Execute | View/Execute | View/Execute | View/Execute |
| `/studios/:studioId/my-shifts` | View | View | View | View | View | View |
| `/studios/:studioId/review-queue` | View/Review | View/Review | No access | No access | No access | No access |
| `/studios/:studioId/shifts` | View + Manage | View + Manage | No access | No access | No access | No access |
| `/studios/:studioId/shows` | View + Manage | View + Manage | No access | No access | No access | No access |
| `/studios/:studioId/shows/:showId/tasks` | View + Manage | View + Manage | No access | No access | No access | No access |
| `/studios/:studioId/task-templates` | View + Manage | View + Manage | No access | No access | No access | No access |
| `/studios/:studioId/creator-mapping` | View + Manage | View + Manage | View + Manage | No access | No access | No access |
| `/studios/:studioId/creator-mapping/:showId` | View + Manage | View + Manage | View + Manage | No access | No access | No access |

## Sidebar Sections by Role

| Section | Shown to |
|---------|----------|
| Studio Common (Dashboard, My Tasks, My Shifts) | All roles |
| Studio Admin (Review Queue, Shift Schedule, Shows, Task Templates) | ADMIN, MANAGER |
| Creators (Creator Mapping) | ADMIN, MANAGER, TALENT_MANAGER |

## Dashboard View (All Studio Roles)

### Use Cases

1. Check how many shows are scheduled today.
2. Check who is currently on duty as duty manager.
3. Check who is next on duty.
4. Preview upcoming duty coverage in the next 7 days.
5. (ADMIN/MANAGER only) navigate to shift management workspace.

### UI Blocks

1. **Today's Shows** summary card
2. **Active Duty Manager** card
3. **Next Duty Manager** card
4. **Today's Show List** table
5. **Duty Manager Preview** list (next 7 days)

## Shift Management View (`/shifts`, ADMIN + MANAGER)

### Use Cases

1. Create, edit, delete shift records.
2. Assign or unset duty manager on a shift.
3. Review schedule in calendar/table view.

### Functions by Role

| Function | ADMIN | MANAGER | TALENT_MANAGER | DESIGNER | MODERATION_MANAGER | MEMBER |
| -------- | ----- | ------- | -------------- | -------- | ------------------ | ------ |
| Access shifts route | Yes | Yes | No | No | No | No |
| Create/update/delete shift | Yes | Yes | No | No | No | No |
| Assign/unset duty manager | Yes | Yes | No | No | No | No |

## Shows View (`/shows`, ADMIN + MANAGER — task ops only)

### Use Cases

1. Browse shows within a date scope.
2. Generate tasks for selected shows (bulk).
3. Assign tasks to selected shows (bulk).
4. Navigate to per-show task workflow.
5. Link to creator mapping for a show (entry point, not workflow).

### Functions by Role

| Function | ADMIN | MANAGER | TALENT_MANAGER |
| -------- | ----- | ------- | -------------- |
| Access shows route | Yes | Yes | No |
| Generate/assign tasks | Yes | Yes | No |
| Navigate to creator mapping from tasks view | Yes | Yes | No |

## Creator Mapping View (`/creator-mapping`, ADMIN + MANAGER + TALENT_MANAGER)

### Use Cases

1. Browse shows for the purpose of managing their creator roster.
2. Add creators to a show (bulk or single).
3. Remove creators from a show.
4. View assigned creators and their compensation fields.

### Functions by Role

| Function | ADMIN | MANAGER | TALENT_MANAGER |
| -------- | ----- | ------- | -------------- |
| Access creator-mapping routes | Yes | Yes | Yes |
| Bulk assign creators to shows | Yes | Yes | Yes |
| Remove creator from show | Yes | Yes | Yes |
| View creator roster/compensation | Yes | Yes | Yes |

## Data / API Expectations

### Dashboard data sources

1. `GET /studios/:studioId/shows` (filtered to today) for show list.
2. `GET /studios/:studioId/shifts/duty-manager` for current active duty manager.
3. `GET /studios/:studioId/shifts` with `is_duty_manager=true` and date range for next/preview coverage.

### Shift workspace data sources

1. `GET /studios/:studioId/shifts` list
2. `POST /studios/:studioId/shifts` create
3. `PATCH /studios/:studioId/shifts/:shiftId` update
4. `DELETE /studios/:studioId/shifts/:shiftId` delete
5. `PATCH /studios/:studioId/shifts/:shiftId/duty-manager` assign/unassign duty manager

### Creator mapping data sources

1. `GET /studios/:studioId/shows` — show list for mapping context
2. `GET /studios/:studioId/shows/:showId/creators` — assigned creators per show
3. `POST /studios/:studioId/shows/:showId/creators/bulk-assign` — bulk assign
4. `DELETE /studios/:studioId/shows/:showId/creators/:creatorId` — remove one mapping
5. `GET /studios/:studioId/creators/catalog` — searchable creator picker
6. `GET /studios/:studioId/creators/roster` — studio creator roster

## Change Control

When role policy changes, update these together in one PR:

1. `src/lib/constants/studio-route-access.ts`
2. `src/config/sidebar-config.tsx`
3. Route guard `routeKey` and `deniedDescription` in affected route files
4. This document (`docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md`)
5. `docs/prd/rbac-roles.md`
6. Relevant tests (`src/config/__tests__/sidebar-config.test.tsx`)
