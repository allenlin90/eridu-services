# PRD: Show Planning Export

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Operations planning — pre-show export with L-side cost preview
> **Depends on**: Show Economics baseline — ✅ **Complete** (commit `8de31ffe`; estimated cost column sourced from economics endpoint)

## Problem

Operations currently uses Google Sheets as the primary pre-show planning and verification surface. There is no DB-backed planning export — show metadata, client assignments, creator assignments, and estimated costs must be manually assembled from separate system views into a spreadsheet, creating drift from the database and wasting operations time before every show day.

Key questions unanswered today:

- *"What shows do we have planned for this week and who is assigned to each?"*
- *"What is the estimated cost for each planned show so we can pre-approve budgets?"*
- *"Can I download a flat planning sheet without manually copying data from multiple screens?"*

This feature is intentionally **upstream from task submission reporting**:

- **Show planning export** answers: "What is planned and who is assigned before the show starts?"
- **Task submission reporting** answers: "What was submitted/reviewed after execution has started or completed?"

## Users

- **Studio ADMIN**: generate and download planning exports for budget review and pre-show approval
- **Studio MANAGER**: access the same export for operational planning and assignment verification
- **Operations**: primary workflow consumer — replaces the Google Sheets assembly process for upcoming shows

## Existing Infrastructure

| Model / Endpoint | Fields / Behavior | Status |
| --- | --- | --- |
| `Show` | Metadata, status, standard, type, room, start/end time, schedule linkage | ✅ Exists |
| `Client` | Client name, linked to show | ✅ Exists |
| `ShowCreator` | Creator assignments per show | ✅ Exists |
| `Creator` | Creator name | ✅ Exists |
| `GET /studios/:studioId/shows/:showId/economics` | Variable cost; nullable for COMMISSION/HYBRID without revenue | ✅ Exists (`@preview`) |
| Task report engine | Scope/filter/export patterns (reuse primitives only — see below) | ✅ Exists |

## Requirements

### In Scope

1. **Scoped date-range query** — return shows within a caller-specified future planning window. Date range is required. Supports shows with `start_time` within the range regardless of status.

2. **One row per show** — the primary record grain is the show. Creator assignments are aggregated into a single `assigned_creators` column (comma-separated names) rather than exploding into multiple rows. This matches the Google Sheets mental model where each show is the planning unit.

3. **Fixed output columns** — no column builder; the schema is fixed for the first version:

   | Column | Source |
   | --- | --- |
   | `show_id` | `Show.uid` |
   | `show_name` | `Show.name` |
   | `client_name` | `Client.name` |
   | `status` | `Show.status.name` |
   | `standard` | `Show.showStandard.name` |
   | `type` | `Show.showType.name` |
   | `room` | `Show.room.name` |
   | `start_time` | `Show.startTime` (ISO 8601) |
   | `end_time` | `Show.endTime` (ISO 8601) |
   | `assigned_creators` | Aggregated `Creator.name` list from `ShowCreator` |
   | `estimated_total_cost` | From economics service (nullable; null when COMMISSION/HYBRID without revenue, or no assignments) |

4. **Filters** — date range (required), plus optional: `client_uid`, `status`, `standard`.

5. **CSV export** — `GET /studios/:studioId/shows/planning-export?format=csv&date_from=...&date_to=...` returns a downloadable CSV with the fixed column set.

6. **Paginated JSON response** — the same endpoint with `format=json` (default) returns paginated rows for in-app table display before download. Response shape follows existing paginated list conventions.

### Not a Task-Report Extension

This feature reads from **normalized show relations** (pre-execution planning data), not from task snapshots or submission records. The task-report engine's domain concepts (task content columns, shared-field merge, snapshot schemas) must not be imported or coupled into this feature.

Reusable primitives from task reporting that may be extracted and shared:
- Flat table response contract (`rows[]`, `columns[]`)
- CSV serialization helper
- Filter parsing utilities

These must be extracted as domain-neutral utilities only if the abstraction does not require pulling in task-specific concepts. If extraction is complex, ship show planning export as a parallel vertical slice first.

### Out of Scope

- Saved export definitions or recurring report templates
- Assignment-level row explosion (one row per show-creator pair)
- Column builder / selectable joins
- Google Sheets push integration
- Budget vs. actual comparison (future reporting phase)
- Shows in post-execution or archived status are included if they fall in the date range — no status filter is enforced server-side beyond the caller's optional `status` filter

## L-Side Integration

Each row includes `estimated_total_cost` sourced from the show-level economics service. This makes the export useful for pre-show cost planning, not just assignment verification.

Cost value rules:
- Returns the economics baseline total (creator costs + shift costs) if available.
- Returns `null` if the show has no assignments, no economics data, or all creators are COMMISSION/HYBRID without revenue.
- A null cost is a valid and expected state, not an error.

The export does not trigger a full economics computation per row on every export request — it reads pre-computed or cached economics state where available, or runs a lightweight pass. The performance contract is defined in the technical design doc.

## Routes

| Method | Route | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/studios/:studioId/shows/planning-export` | Paginated JSON rows (default) or CSV download | ADMIN, MANAGER |

Query parameters: `date_from` (required, ISO date), `date_to` (required, ISO date), `format` (optional: `json` \| `csv`, default `json`), `client_uid` (optional), `status` (optional), `standard` (optional), `page` / `limit` (JSON only).

Route guards: `@StudioProtected([ADMIN, MANAGER])`.

## Frontend Route

`/studios/$studioId/shows/planning-export` or as a view within the existing Shows section.

Listed in the sidebar under the **Reports** group alongside Task Reports. See `apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md`.

`hasStudioRouteAccess` key to add: `showPlanningExport` — roles: `[ADMIN, MANAGER]`.

## Acceptance Criteria

- [ ] Date-range query returns planned shows scoped to the studio within the specified range.
- [ ] Each row includes all fixed columns: `show_id`, `show_name`, `client_name`, `status`, `standard`, `type`, `room`, `start_time`, `end_time`, `assigned_creators`, `estimated_total_cost`.
- [ ] `assigned_creators` is an aggregated string (comma-separated creator names); one row per show regardless of assignment count.
- [ ] `estimated_total_cost` is nullable; null is returned for uncosted shows without error.
- [ ] CSV export downloads with correct headers and encoding.
- [ ] JSON response is paginated and follows existing list response conventions.
- [ ] Optional filters (`client_uid`, `status`, `standard`) correctly narrow result set.
- [ ] No task-submission data, snapshot data, or task-template concepts appear in the export.
- [ ] MANAGER role can access export; MEMBER and below return 403.

## Product Decisions

- **One row per show** — aggregated creator list over exploded rows. This is the planning mental model.
- **Fixed column schema first** — no column builder in v1. Operations validates the fixed schema against their Google Sheets workflow before adding configurability.
- **Normalized data source** — reads from live show relations, not cached snapshots. Export reflects current DB state at generation time.
- **Economics cost is informational** — null cost is not an error state. The export is useful for assignment verification even without cost data.
- **Format toggle on same endpoint** — `format=csv` vs. `format=json` on the same route rather than separate endpoints, keeping the filter/scope logic shared.

## Design Reference

- Task submission reporting (pattern reference, not code dependency): `apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md`
- Economics baseline: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Business domain: `docs/domain/BUSINESS.md`
- Show planning ideation (preserved context): deleted after this PRD was created (promoted 2026-03-22)
