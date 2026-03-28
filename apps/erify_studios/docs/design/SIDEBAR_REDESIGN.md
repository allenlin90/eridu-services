# Sidebar Redesign — Phase 4 Extended Scope

> **Status**: Planning
> **Date**: 2026-03-22
> **Scope**: `apps/erify_studios/src/config/sidebar-config.tsx`, `apps/erify_studios/src/lib/constants/studio-route-access.ts`
> **Triggered by**: Phase 4 extended PRDs — member roster, creator roster, compensation line items, show planning export, economics/P&L UI

## Why Now

The current sidebar was designed for a single studio with limited management surface. Phase 4 extended scope adds:
- Studio member roster (`/studios/$studioId/members`)
- Creator roster write surface (`/studios/$studioId/creators`)
- Compensation management (`/studios/$studioId/compensation`)
- Show planning export (`/studios/$studioId/shows/planning-export`)
- Economics / P&L UI (future, `/studios/$studioId/economics`)

The current group structure does not have natural homes for these features and has labeling problems that will worsen as the surface grows.

---

## Current State

Source file: `apps/erify_studios/src/config/sidebar-config.tsx`

### Group: Studio Common

- Label: `"Studio Common"` — confusing; implies only some features are "studio" features
- Icon: `Videotape`
- Items:
  - Dashboard — `LayoutDashboard`
  - My Tasks — `ListTodo`
  - My Shifts — `CalendarDays`
- Access: all studio members

### Group: Studio Manager

- Label: `"Studio Manager"` — misleading; implies this section is only for MANAGER role, but ADMIN also uses it; groups execution management and admin tooling together
- Icon: `Settings`
- Items:
  - Task Review — `ClipboardCheck`
  - Shift Schedule — `CalendarDays`
  - Show Operations — `Clapperboard`
  - Task Templates — `ClipboardCheck`
  - Task Reports — `ClipboardCheck`
- Access: MANAGER, ADMIN (varies by item)

### Group: Studio Admin

- Label: `"Studio Admin"` — only one item; poor label vs. the broader role-based naming already used
- Icon: `ShieldCheck`
- Items:
  - Shared Fields — `Settings`
- Access: ADMIN only

### Group: Creators

- Label: `"Creators"` — accurate; will expand
- Icon: `Users`
- Items:
  - Creator Mapping — `MonitorPlay`
- Access: MANAGER, TALENT_MANAGER, ADMIN

### Problem Summary

1. **"Studio Common" vs. "Studio Manager" vs. "Studio Admin"** is role-based labeling, not function-based. Users see "Studio Manager" items they cannot access (the group is filtered, not the label). This confuses new users about the product structure.
2. **"Studio Manager" mixes execution and output**: Show Operations, Shift Schedule, and Task Review are operational execution tools. Task Reports is an output/analysis tool. These should not share a group.
3. **"Studio Admin" has one item** — not worth its own group once more admin items are added.
4. **No home for Finance/P&L** — economics UI has no group.

---

## Proposed State

Groups are reorganized by **function** (what you do) not by **role** (who you are). Role-based access is enforced by `hasStudioRouteAccess` guards on items, not by group labels.

### Group: My Workspace

- Label: `"My Workspace"` — was "Studio Common"
- Icon: `Videotape` (keep; represents personal workspace context)
- Items:
  - Dashboard — `LayoutDashboard`
  - My Tasks — `ListTodo`
  - My Shifts — `CalendarDays`
- Access: all studio members (unchanged)
- Note: label change only; no routing changes

### Group: Operations

- Label: `"Operations"` — execution-focused; split from "Studio Manager"
- Icon: `Clapperboard`
- Items:
  - Show Operations — `Clapperboard`
  - Shift Schedule — `CalendarDays`
  - Task Review — `ClipboardCheck`
- Access: MANAGER, ADMIN (unchanged per item)
- Note: Task Templates moves to Studio Settings (it is a configuration item, not an execution item)

### Group: Reports

- Label: `"Reports"` — output/analysis; split from "Studio Manager"
- Icon: `BarChart2` (lucide-react: `BarChart2`)
- Items:
  - Task Reports — `ClipboardCheck`
  - Show Planning Export — `FileDown` (lucide-react: `FileDown`) — **new**
- Access:
  - Task Reports: MODERATION_MANAGER, MANAGER, ADMIN (unchanged)
  - Show Planning Export: MANAGER, ADMIN (new `showPlanningExport` key)

### Group: Creators

- Label: `"Creators"` — keep; expands from one item to two
- Icon: `Users` (keep)
- Items:
  - Creator Mapping — `MonitorPlay` (unchanged)
  - Creator Roster — `UserCheck` (lucide-react: `UserCheck`) — **new**
- Access:
  - Creator Mapping: MANAGER, TALENT_MANAGER, ADMIN (unchanged)
  - Creator Roster: ADMIN, MANAGER, TALENT_MANAGER (new `creatorRoster` key)

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

- Label: `"Studio Settings"` — was "Studio Admin"; describes function, not role
- Icon: `Settings` (keep)
- Items:
  - Members — `Users` (lucide-react: `Users`) — **new**
  - Shared Fields — `Settings` (unchanged)
  - Task Templates — `ClipboardCheck` (moved from Operations; it is config, not daily execution)
- Access:
  - Members: ADMIN, MANAGER (new `members` key — MANAGER read-only, enforced in component)
  - Shared Fields: ADMIN (unchanged)
  - Task Templates: MANAGER, ADMIN (unchanged)
- Note: current shipped frontend slug is `/studios/$studioId/shared-fields`; a nested `/settings/*` layout can be introduced later when more settings surfaces exist.

---

## New Routes

| Route | Feature | PRD |
| --- | --- | --- |
| `/studios/$studioId/members` | Studio member roster | `docs/prd/studio-member-roster.md` |
| `/studios/$studioId/creators` | Creator roster | `docs/prd/studio-creator-roster.md` |
| `/studios/$studioId/compensation` | Compensation management | `docs/prd/compensation-line-items.md` |
| `/studios/$studioId/shows/planning-export` | Show planning export | `docs/prd/show-planning-export.md` |
| `/studios/$studioId/economics` | P&L / economics UI | `docs/prd/pnl-revenue-workflow.md` |

---

## `hasStudioRouteAccess` Keys to Add

Update `apps/erify_studios/src/lib/constants/studio-route-access.ts`:

| Key | Roles | Notes |
| --- | --- | --- |
| `members` | `[ADMIN, MANAGER]` | MANAGER read-only; write gating handled in page component |
| `creatorRoster` | `[ADMIN, MANAGER, TALENT_MANAGER]` | Write operations (ADMIN only) gated in component |
| `compensation` | `[ADMIN, MANAGER]` | MANAGER read-only; Finance group entry for line-item management |
| `economics` | `[ADMIN]` | Finance group; hidden until P&L Revenue Workflow ships |
| `showPlanningExport` | `[ADMIN, MANAGER]` | Reports group |

---

## Icon Summary

All icons from `lucide-react`:

| Item | Icon Name | Rationale |
| --- | --- | --- |
| My Workspace group | `Videotape` | Keep — personal workspace context |
| Operations group | `Clapperboard` | Live show / production context |
| Reports group | `BarChart2` | Output/analysis surface |
| Show Planning Export | `FileDown` | Downloadable export action |
| Creators group | `Users` | Keep |
| Creator Roster | `UserCheck` | Managed/verified roster members |
| Compensation | `Wallet` | Supplemental cost management |
| Finance group | `TrendingUp` | Financial trend / P&L |
| Studio Settings group | `Settings` | Keep |
| Members (item) | `Users` | Studio team members |

---

## Design Notes

### Function over role

The "Studio Manager" / "Studio Admin" split was confusing because both groups were gated by role. The redesign groups by **what the user is doing**:
- Execution work → Operations
- Analysis/output → Reports
- Configuration → Studio Settings
- Financial review → Finance
- Personal work → My Workspace
- Creator assignments → Creators

Role-based access remains enforced via `hasStudioRouteAccess`; it just does not define group labels anymore.

### Task Templates move

Task Templates moves from "Studio Manager" (execution) to "Studio Settings" (configuration). A task template is a definition artifact, not a daily operational item. It belongs alongside Shared Fields under configuration.

### Shared Fields route flattening

`/studios/$studioId/shared-fields` is clearer than a nested `/settings/shared-fields` slug while shared fields remain the only settings surface. If a multi-page settings area ships later, the frontend can reintroduce a dedicated settings layout without changing the backend shared-fields API endpoints.

### Finance group deferral

The Finance group is new but should not appear in the sidebar until at least the economics UI ships. The `economics` route access key should be defined now (for preparedness) but the sidebar group is conditionally rendered only when `studioFinanceItems.length > 0`, following the existing pattern for optional groups.

### Sidebar file changes required

1. `sidebar-config.tsx`: rename group labels, restructure item assignments into the new function-based helper functions, add new item entries with route access key checks.
2. `studio-route-access.ts`: add five new keys (`members`, `creatorRoster`, `compensation`, `economics`, `showPlanningExport`).
3. New icon imports: `BarChart2`, `FileDown`, `UserCheck`, `TrendingUp`, `Wallet` from `lucide-react`.
