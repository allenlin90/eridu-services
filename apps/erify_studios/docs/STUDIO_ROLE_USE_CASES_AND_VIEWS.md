# Studio Roles — Use Cases, Views, and Functions

> Scope: `erify_studios` studio-scoped area (`/studios/:studioId/*`) with focus on daily operations and shift scheduling.
>
> Canonical RBAC policy reference: [`docs/product/ROLE_ACCESS_MATRIX.md`](../../../docs/product/ROLE_ACCESS_MATRIX.md). This document focuses on frontend use cases and views.

## Purpose

Define what each studio role can see and do, especially after moving operational visibility to dashboard and restricting shift management to studio admins.

## Roles

1. `ADMIN`
2. `MANAGER`
3. `MEMBER`
4. `TALENT_MANAGER`

## High-Level Principles

1. **Dashboard is shared visibility**: all studio users can check today’s shows and duty-manager coverage.
2. **Shifts page is an admin workspace**: only studio admins manage shift records.
3. **Members and managers are read-oriented for shift operations**: they use dashboard for daily awareness.

## Route Access Matrix

| Route                                    | ADMIN                  | MANAGER                | MEMBER                 | TALENT_MANAGER          | Notes |
| ---------------------------------------- | ---------------------- | ---------------------- | ---------------------- | ----------------------- | ----- |
| `/studios/:studioId/dashboard`           | View                   | View                   | View                   | View                    | Daily operations visibility page |
| `/studios/:studioId/my-tasks`            | View/Execute own tasks | View/Execute own tasks | View/Execute own tasks | View/Execute own tasks  | Personal task workflow |
| `/studios/:studioId/shifts`              | View + Manage          | No access              | No access              | No access               | Shift CRUD and duty-manager assignment |
| `/studios/:studioId/shows`               | View + Manage          | View + Manage          | No access              | No access               | Show operations (task generation/assignment) |
| `/studios/:studioId/creators`            | View + Manage          | View + Manage          | No access              | View + Manage           | Creator roster (onboard/list/manage studio-scoped creators) |
| `/studios/:studioId/creators/mapping`    | View + Manage          | View + Manage          | No access              | View + Manage           | Creator-to-show mapping workflow |
| `/studios/:studioId/tasks?status=REVIEW` | View/Review            | View/Review            | No access              | No access               | Review queue remains admin/manager |
| `/studios/:studioId/task-templates`      | View + Manage          | No access              | No access              | No access               | Template management remains admin-only |

## Dashboard View (All Studio Roles)

### Use Cases

1. Check how many shows are scheduled today.
2. Check who is currently on duty as duty manager.
3. Check who is next on duty.
4. Preview upcoming duty coverage in the next 7 days.
5. (Admin only) navigate to shift management workspace.

### UI Blocks

1. **Today’s Shows** summary card
2. **Active Duty Manager** card
3. **Next Duty Manager** card
4. **Today’s Show List** table
5. **Duty Manager Preview** list (next 7 days)

### Functions by Role

| Function                                 | ADMIN | MANAGER | MEMBER |
| ---------------------------------------- | ----- | ------- | ------ |
| See today show count/list                | Yes   | Yes     | Yes    |
| See active duty manager                  | Yes   | Yes     | Yes    |
| See next duty manager                    | Yes   | Yes     | Yes    |
| See duty preview                         | Yes   | Yes     | Yes    |
| Open shift management from dashboard CTA | Yes   | No CTA  | No CTA |

## Shift Management View (`/studios/:studioId/shifts`, ADMIN only)

### Use Cases

1. Create shift records.
2. Edit shift records.
3. Delete shift records.
4. Assign or unset duty manager on a shift.
5. Review schedule in calendar/table view.

### UI Blocks

1. Header with mode switch: `Calendar` / `Table`
2. Duty manager calendar (duty-manager shifts only)
3. Shift records table (management actions)
4. Current duty manager card
5. Create shift card
6. Edit shift card

### Functions by Role

| Function                   | ADMIN | MANAGER | MEMBER |
| -------------------------- | ----- | ------- | ------ |
| Access shifts route        | Yes   | No      | No     |
| Create/update/delete shift | Yes   | No      | No     |
| Assign/unset duty manager  | Yes   | No      | No     |
| View management table      | Yes   | No      | No     |

## Data / API Expectations

### Dashboard data sources

1. `GET /studios/:studioId/shows` (filtered to today) for show list.
2. `GET /studios/:studioId/shifts/duty-manager` for current active duty manager.
3. `GET /studios/:studioId/shifts` with `is_duty_manager=true` and date range for next/preview coverage.
4. `GET /studios/:studioId/studio-memberships` for resolving member names in duty cards/list.

### Shift workspace data sources

1. `GET /studios/:studioId/shifts` list
2. `POST /studios/:studioId/shifts` create
3. `PATCH /studios/:studioId/shifts/:shiftId` update
4. `DELETE /studios/:studioId/shifts/:shiftId` delete
5. `PATCH /studios/:studioId/shifts/:shiftId/duty-manager` assign/unassign duty manager
6. `GET /studios/:studioId/shifts/duty-manager` current duty manager

## Current Known Gaps / Follow-ups

1. Shift route currently denies manager/member/talent-manager at UI level; backend authorization must enforce the same policy.
2. Dashboard currently displays duty manager name by membership lookup; fallback is user ID if lookup misses.
3. If manager role should later manage shifts, this matrix must be updated together with sidebar and route guard logic.

## Change Control

When role policy changes, update these together in one PR:

1. Sidebar visibility (`src/config/sidebar-config.tsx`)
2. Route-level access behavior (`src/routes/studios/$studioId/*.tsx`)
3. This document (`docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md`)
4. Relevant tests (`src/config/__tests__/sidebar-config.test.tsx`, route tests if added)
