# Sidebar Redesign — Phase 4 Extended Scope

> **Status**: 🔁 Incremental rollout
> **Date**: 2026-03-22
> **Scope**: `apps/erify_studios/src/config/sidebar-config.tsx`, `apps/erify_studios/src/lib/constants/studio-route-access.ts`
> **Triggered by**: Phase 4 extended PRDs — member roster, creator roster, compensation line items, show planning export, economics/P&L UI

> **Current implementation note**: The core regrouping is live for `My Workspace`, `Planning`, `Tasks`, `People`, and `Studio Settings`, including shipped `members` and `creatorRoster` access keys. Studio-scoped `Schedules`, `Reports`, `showPlanningExport`, `compensation`, and `economics` entries remain future follow-up work.

## Why Now

The current sidebar was designed for a single studio with limited management surface. Phase 4 extended scope adds:
- Studio member roster (`/studios/$studioId/members`)
- Creator roster write surface (`/studios/$studioId/creators`)
- Compensation management (`/studios/$studioId/compensation`)
- Show planning export (`/studios/$studioId/shows/planning-export`)
- Economics / P&L UI (future, `/studios/$studioId/economics`)

The current group structure does not have natural homes for these features and has labeling problems that will worsen as the surface grows.

---

## Current Shipped State

Source file: `apps/erify_studios/src/config/sidebar-config.tsx`

### Group: My Workspace

- Label: `"My Workspace"`
- Icon: `Videotape`
- Items:
  - Dashboard — `LayoutDashboard`
  - My Tasks — `ListTodo`
  - My Shifts — `CalendarDays`
- Access: all studio members

### Group: Planning

- Label: `"Planning"`
- Icon: `CalendarDays`
- Items:
  - Shows — `Film`
  - Creator Mapping — `MonitorPlay`
  - Shift Schedule — `CalendarDays`
- Access: TALENT_MANAGER, MANAGER, ADMIN (varies by item)

`Schedules` belongs in this group when a studio-scoped schedule route ships. It is not currently rendered because the only schedule UI is still system-scoped.

### Group: Tasks

- Label: `"Tasks"`
- Icon: `ClipboardCheck`
- Items:
  - Show Operations — `Clapperboard`
  - Task Review — `ClipboardCheck`
  - Task Reports — `ClipboardCheck`
- Access: MODERATION_MANAGER, MANAGER, ADMIN (varies by item)

### Group: People

- Label: `"People"`
- Icon: `Users`
- Items:
  - Members — `Users`
  - Creators — `Users`
- Access: MANAGER, TALENT_MANAGER, ADMIN (varies by item)

### Group: Studio Settings

- Label: `"Studio Settings"`
- Icon: `ShieldCheck`
- Items:
  - Shared Fields — `Settings`
  - Task Templates — `ClipboardCheck`
- Access: MANAGER, ADMIN (varies by item)

### Deferred Pieces

1. Studio-scoped `Schedules` is not shipped; add it to `Planning` when the Schedule model gets a studio FE route.
2. `Show Planning Export` is not shipped, so the `showPlanningExport` route/access key is still deferred.
3. `Compensation` and `Economics / P&L` are not shipped, so the `Finance` group is still deferred.

---

## Remaining Target State

Groups are organized by **function** (what you do) rather than **role** (who you are). Role-based access remains enforced by `hasStudioRouteAccess` guards on items, not by group labels.

### Group: Planning

Shipped today with `Shows`, `Creator Mapping`, and `Shift Schedule`. Add `Schedules` at the same level as `Shows` when the Schedule model gets a studio-scoped FE route.

### Group: Finance

- Label: `"Finance"` — new group for P&L and economics UI
- Icon: `TrendingUp` (lucide-react: `TrendingUp`)
- Items:
  - Compensation — `Wallet` (lucide-react: `Wallet`) — **new**
  - Economics / P&L — `TrendingUp` — **new** (when shipped)
- Access:
  - Compensation: ADMIN, MANAGER (new `compensation` key)
  - Economics / P&L: ADMIN (new `economics` key)
- Note: Group is omitted from sidebar until at least one item is accessible. Ship when P&L Revenue Workflow PRD is implemented.

### Group: Studio Settings

Already shipped on `master`. The current slug remains `/studios/$studioId/shared-fields`; a nested `/settings/*` layout can still be introduced later if more settings surfaces land.

---

## Route Status

| Route | Feature | Product Doc |
| --- | --- | --- |
| `/studios/$studioId/members` | Studio member roster — shipped | `docs/features/studio-member-roster.md` |
| `/studios/$studioId/creators` | Creator roster — shipped | `docs/features/studio-creator-roster.md` |
| `/studios/$studioId/schedules` | Studio schedule planning/grouping | [`docs/prd/future/studio-schedule-management.md`](../../../../docs/prd/future/studio-schedule-management.md) |
| `/studios/$studioId/compensation` | Compensation management | [`docs/roadmap/PHASE_4.md` §PR 3-10](../../../../docs/roadmap/PHASE_4.md) |
| `/studios/$studioId/show-operations` | Show ops with unified date range + export | [`docs/roadmap/PHASE_4.md` §PR 2](../../../../docs/roadmap/PHASE_4.md#remaining-prs) |
| `/studios/$studioId/finance/economics` | Studio economics review | [`docs/roadmap/PHASE_4.md` §PR 8](../../../../docs/roadmap/PHASE_4.md#remaining-prs) |

---

## `hasStudioRouteAccess` Key Status

Update `apps/erify_studios/src/lib/constants/studio-route-access.ts`:

| Key | Roles | Notes |
| --- | --- | --- |
| `members` | `[ADMIN, MANAGER]` | Shipped; MANAGER read-only gating handled in page component |
| `creatorRoster` | `[ADMIN, MANAGER, TALENT_MANAGER]` | Shipped; write operations (ADMIN only) gated in component |
| `compensation` | `[ADMIN, MANAGER]` | Planned; Finance group entry for line-item management |
| `economics` | `[ADMIN]` | Planned; Finance group, hidden until economics UI ships |
| `showPlanningExport` | `[ADMIN, MANAGER]` | Planned; Planning group export affordance |
| `schedules` | `[ADMIN, MANAGER]` | Planned; Planning group entry for the Schedule model |

---

## Icon Summary

All icons from `lucide-react`:

| Item | Icon Name | Rationale |
| --- | --- | --- |
| My Workspace group | `Videotape` | Keep — personal workspace context |
| Planning group | `CalendarDays` | Upstream show, schedule, and assignment planning |
| Tasks group | `ClipboardCheck` | Downstream task operations |
| Show Planning Export | `FileDown` | Downloadable export action |
| People group | `Users` | Member and creator rosters |
| Creators item | `Users` | Studio creator roster |
| Compensation | `Wallet` | Supplemental cost management |
| Finance group | `TrendingUp` | Financial trend / P&L |
| Studio Settings group | `ShieldCheck` | Shipped today |
| Members (item) | `Users` | Studio team members |

---

## Design Notes

### Function over role

The "Studio Manager" / "Studio Admin" split was confusing because both groups were gated by role. The redesign groups by **what the user is doing**:
- Upstream setup → Planning
- Downstream task operations → Tasks
- Roster/reference people management → People
- Configuration → Studio Settings
- Financial review → Finance
- Personal work → My Workspace

Role-based access remains enforced via `hasStudioRouteAccess`; it just does not define group labels anymore.

### Planning vs Tasks

Planning contains objects and assignments that exist before task execution: schedules, shows, shift planning, and creator mapping. Tasks contains downstream task readiness, task generation/assignment, review queues, and task reports. `Show Operations` stays named for the page behavior but lives under `Tasks` because its primary work is task operations derived from shows.

### People

Members and creators are both roster surfaces. Members manage studio users, roles, and hourly defaults; creators manage talent eligibility and compensation defaults. Creator Mapping is excluded from People because it assigns creators to shows rather than managing creator records.

### Task Templates move

Task Templates moves from "Studio Manager" (execution) to "Studio Settings" (configuration). A task template is a definition artifact, not a daily operational item. It belongs alongside Shared Fields under configuration.

### Shared Fields route flattening

`/studios/$studioId/shared-fields` is clearer than a nested `/settings/shared-fields` slug while shared fields remain the only settings surface. If a multi-page settings area ships later, the frontend can reintroduce a dedicated settings layout without changing the backend shared-fields API endpoints.

### Finance group deferral

The Finance group is new but should not appear in the sidebar until at least the economics UI ships. The `economics` route access key should be defined now (for preparedness) but the sidebar group is conditionally rendered only when `studioFinanceItems.length > 0`, following the existing pattern for optional groups.

### Sidebar file changes required

1. `sidebar-config.tsx`: keep the shipped function-based groups (`Planning`, `Tasks`, `People`, `Studio Settings`) and add `Finance` when compensation/economics routes ship.
2. `studio-route-access.ts`: keep shipped `members` and `creatorRoster`; add `schedules`, `compensation`, `economics`, and `showPlanningExport` when those routes ship.
3. New icon imports are only needed when remaining `Schedules` and `Finance` entries land.
