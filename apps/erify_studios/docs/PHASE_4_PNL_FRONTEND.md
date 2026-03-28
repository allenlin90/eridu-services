# Phase 4 P&L Frontend Feature Description

> **Status**: Active — mapping foundation shipped; extended scope in progress
> **Phase scope**: Phase 4 P&L workstreams
> **Owner app**: `apps/erify_studios`

## Purpose

Define frontend route/UI behavior for Phase 4 mapping, economics, roster management, planning export, and availability hardening flows, aligned to backend creator-first contracts.

## Scope

### Mapping + Assignment Foundation (Shipped)

- Creator mapping UX for studio operations.
- Assignment flows that feed economics inputs.
- Creator-first contract adoption in query keys, route loaders, and form payloads.

### Extended Scope (Active — Waves 1–3)

- Sidebar redesign to function-based groups (Wave 1).
- Studio member roster management page (Wave 1).
- Studio creator roster CRUD page (Wave 1).
- Show planning export with download (Wave 2).
- Creator availability strict-mode integration in assignment flows (Wave 2).
- Economics summary page consuming shipped BE endpoints (Wave 2/3).
- Revenue input UI on show-platform forms (Wave 3).

## Route + Screen Plan

### Mapping surfaces (Shipped)

| Route | Purpose | Access | Status |
| --- | --- | --- | --- |
| `/studios/$studioId/show-operations` | Show operations workspace for readiness, task generation, and assignment entry points | ADMIN, MANAGER | ✅ Shipped |
| `/studios/$studioId/show-operations/$showId/tasks` | Task assignment and execution workflow | ADMIN, MANAGER | ✅ Shipped |
| `/studios/$studioId/creator-mapping` | Creator mapping show list with scope + creator-centric filters | ADMIN, MANAGER, TALENT_MANAGER | ✅ Shipped |
| `/studios/$studioId/creator-mapping/$showId` | Creator mapping workflow (show-level add/remove) | ADMIN, MANAGER, TALENT_MANAGER | ✅ Shipped |
| `/system/creators` | System creator management baseline | System admin only | ✅ Shipped |

Implemented UI additions:

- Bulk creator assignment dialog from creator mapping show list (multi-show selection).
- Creator mapping list selection UI follows the shows bulk-action pattern (desktop floating action bar + mobile action sheet).
- Creator mapping list supports date scope defaults (next 7 days), search, and creator-centric filters (`creator_name`, `has_creators`, `show_status_name`).
- Creator list row navigation is anchored on show-name links (no per-row `Manage` action button column).
- Creator picker is backed by studio catalog + availability endpoints; roster workflows in Wave 1.
- Creator picker currently uses a loose availability discovery endpoint (search-first); strict overlap enforcement in Wave 2.
- Compensation input fields in assignment flows where needed by economics.
- Creator mapping detail route uses the same page-shell style as show task management for consistent single-show operations.
- Studio operations routes now use intent-specific frontend slugs: `/show-operations`, `/task-review`, and `/shared-fields`.

### Studio Member Roster (Wave 1)

PRD: [studio-member-roster.md](../../../docs/prd/studio-member-roster.md)

| Route | Purpose | Access | Status |
| --- | --- | --- | --- |
| `/studios/$studioId/members` | Member roster management | ADMIN (write), MANAGER (read) | 🔲 Wave 1 |

UI components:
- Data table with columns: name, email, role, hourly rate, actions.
- Add member dialog: email input with user catalog lookup, role selector, initial rate input.
- Inline edit for role and `base_hourly_rate`.
- Version-guarded mutations: PATCH includes `version` from last read; 409 triggers refetch + conflict toast.
- Self-demotion guard: disable role dropdown for current user's own membership.
- Remove member confirmation dialog with soft-delete semantics.

### Studio Creator Roster (Wave 1)

PRD: [studio-creator-roster.md](../../../docs/prd/studio-creator-roster.md)

| Route | Purpose | Access | Status |
| --- | --- | --- | --- |
| `/studios/$studioId/creators` | Creator roster CRUD with compensation defaults | ADMIN (write), MANAGER + TALENT_MANAGER (read) | 🔲 Wave 1 |

UI components:
- Data table with columns: name, active status, default rate, rate type, commission rate, actions.
- Add from catalog dialog: creator search backed by catalog endpoint, compensation fields.
- Inline edit for compensation defaults with version guard.
- Active/inactive toggle with confirmation.
- Write actions hidden for MANAGER and TALENT_MANAGER roles.

### Show Planning Export (Wave 2)

PRD: [show-planning-export.md](../../../docs/prd/show-planning-export.md)

| Route | Purpose | Access | Status |
| --- | --- | --- | --- |
| `/studios/$studioId/shows/planning-export` | Pre-show planning export with cost preview | ADMIN, MANAGER | 🔲 Wave 2 |

UI components:
- Date range picker (required, max 90-day span).
- Optional filters: client, status, standard.
- Preview table showing fixed columns before download.
- Download button: CSV format trigger.
- Empty state for date ranges with no shows.

### Economics surfaces (Wave 2/3)

| Route | Purpose | Access | Status |
| --- | --- | --- | --- |
| `/studios/$studioId/economics` | Grouped economics summary (by show / schedule / client) | ADMIN, MANAGER | 🔲 Wave 2 (cost side) |
| `/studios/$studioId/shows/$showId` | Show-level economics drill-in | ADMIN, MANAGER | 🔲 Wave 3 (full P&L) |
| `/studios/$studioId/performance` | Grouped performance summary | ADMIN, MANAGER | Deferred |

## Sidebar Restructure (Wave 1)

Design doc: [SIDEBAR_REDESIGN.md](design/SIDEBAR_REDESIGN.md)

Current role-based groups → function-based groups:

| Group | Items | New Route Access Keys |
| --- | --- | --- |
| **My Workspace** | (renamed from "Studio Common") | — |
| **Operations** | Show Operations, Shift Schedule, Task Review | — |
| **Reports** | Task Reports, Show Planning Export | `showPlanningExport` |
| **Creators** | Creator Mapping, Creator Roster | `creatorRoster` |
| **Finance** | Economics (conditional — shown when at least one item ships) | `economics` |
| **Studio Settings** | Members, Shared Fields, Task Templates | `members` |

Files to modify:
- `src/config/sidebar-config.tsx` — restructure groups
- `src/lib/constants/studio-route-access.ts` — add 4 new keys: `members`, `creatorRoster`, `economics`, `showPlanningExport`

## API Integration Contract

Client integrations (mapping — shipped):

- `GET /studios/:studioId/creators/catalog`
- `GET /studios/:studioId/creators/roster`
- `GET /studios/:studioId/creators/availability?date_from=...&date_to=...`
- `GET /studios/:studioId/shows/:showUid/creators`
- `POST /studios/:studioId/shows/:showUid/creators/bulk-assign`
- `DELETE /studios/:studioId/shows/:showUid/creators/:creatorUid`
- `POST/PATCH /admin/show-creators` (compensation fields included)

Client integrations (economics — shipped BE, FE pending):

- `GET /studios/:studioId/shows/:showUid/economics`
- `GET /studios/:studioId/economics`

Client integrations (Wave 1 — roster management):

- `GET /studios/:studioId/members` — member roster list
- `POST /studios/:studioId/members` — add member
- `PATCH /studios/:studioId/members/:membershipId` — update member (version-guarded)
- `DELETE /studios/:studioId/members/:membershipId` — remove member
- `POST /studios/:studioId/creators` — add creator to roster
- `PATCH /studios/:studioId/creators/:creatorId` — update creator defaults (version-guarded)

Client integrations (Wave 2 — export & availability):

- `GET /studios/:studioId/shows/planning-export?format=csv&date_from=...&date_to=...` — CSV download
- `GET /studios/:studioId/shows/planning-export?format=json&date_from=...&date_to=...` — JSON preview
- `GET /studios/:studioId/creators/availability?strict=true&show_id=...` — strict-mode availability

Client integrations (Wave 3 — revenue, pending design decisions):

- Revenue input PATCH on show-platform records (endpoint TBD pending data model decision)

## State + Query Keys

- Keep creator-first keys only (`creators`, `show-creators`, `economics`, `performance`).
- Add new keys: `studio-members`, `studio-creator-roster`, `planning-export`.
- Query keys must include studio/show scope to avoid cache bleed.
- Mutation success must invalidate dependent list and detail queries.
- Version-guarded mutations: on 409 response, invalidate query to refetch latest version, show conflict toast.

## UX/Behavior Rules

- Assignment actions should be idempotent-safe in UI (surface skipped duplicates cleanly).
- Bulk assign result handling should map API summary fields directly: `assigned`, `skipped`, `failed[]`.
- Compensation input fields must validate ranges before submit.
- Financial values should display with consistent formatting rules across tables/cards.
- Loading/error states must be explicit for all economics cards and filters.
- Do not encode bonus/tiered/hybrid business rules in FE metadata or form glue.
- `metadata` in assignment forms is optional descriptive context only and must not drive FE calculation behavior.
- Version conflict handling: 409 → refetch + toast notification ("This record was updated by another user. Please review and try again.").

## Verification Gate (frontend)

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke for:
  - creator assignment flows
  - creator roster/catalog driven picker behavior
  - member roster CRUD (add, update rate/role, remove)
  - creator roster CRUD (add from catalog, update defaults, activate/deactivate)
  - planning export date range + download
  - availability strict mode conflict display in assignment dialog
  - economics/performance filters and grouping views

## Traceability

- Product intent:
  - Creator mapping: shipped (PRD deleted per lifecycle)
  - Studio member roster: [studio-member-roster.md](../../../docs/prd/studio-member-roster.md)
  - Studio creator roster: [studio-creator-roster.md](../../../docs/prd/studio-creator-roster.md)
  - Show planning export: [show-planning-export.md](../../../docs/prd/show-planning-export.md)
  - Creator availability hardening: [creator-availability-hardening.md](../../../docs/prd/creator-availability-hardening.md)
  - Sidebar redesign: [SIDEBAR_REDESIGN.md](design/SIDEBAR_REDESIGN.md)
  - P&L revenue workflow: [pnl-revenue-workflow.md](../../../docs/prd/pnl-revenue-workflow.md)
- Backend feature contract: [PHASE_4_PNL_BACKEND.md](../../erify_api/docs/PHASE_4_PNL_BACKEND.md)
- Phase tracker: [PHASE_4.md](../../../docs/roadmap/PHASE_4.md)
