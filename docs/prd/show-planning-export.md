# PRD: Show Planning Export

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Operations planning — pre-show export with L-side cost preview
> **Depends on**: Show Economics baseline — ✅ **Complete** (commit `8de31ffe`; estimated cost column sourced from economics endpoint), Studio Economics Review — 🔲 Planned (shared future-horizon cost semantics)

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

7. **Date range cap** — maximum date range is 90 days per export request. Requests exceeding 90 days return 400 with a clear error. This bounds the economics computation cost per request.

8. **Soft-deleted show exclusion** — shows with `deletedAt` set are excluded from export results regardless of status filter. Only active (non-deleted) shows appear in planning exports.

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
- Includes show-scoped compensation line items only. Schedule-scoped and standing/global compensation items are not prorated into per-show exports in Phase 4.
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
- **Interactive review comes first** — the studio economics review route is the primary in-product finance surface; planning export is the downstream handoff.
- **Economics cost is informational** — null cost is not an error state. The export is useful for assignment verification even without cost data.
- **Format toggle on same endpoint** — `format=csv` vs. `format=json` on the same route rather than separate endpoints, keeping the filter/scope logic shared.

## API Contract

### JSON Response Shape

Standard paginated response following existing list conventions:

```json
{
  "data": [
    {
      "show_id": "show_abc123",
      "show_name": "Evening Stream",
      "client_name": "Acme Corp",
      "status": "scheduled",
      "standard": "Standard A",
      "type": "Live",
      "room": "Studio 1",
      "start_time": "2026-04-01T19:00:00Z",
      "end_time": "2026-04-01T22:00:00Z",
      "assigned_creators": "Alice, Bob, Charlie",
      "estimated_total_cost": 1500.00
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

### CSV Format

- Column headers use `snake_case` matching the JSON field names.
- `estimated_total_cost`: `null` in JSON renders as empty string in CSV.
- `assigned_creators`: comma-separated names, quoted in CSV to avoid delimiter conflicts.
- Date fields in ISO 8601 format.
- UTF-8 encoding with BOM for Excel compatibility.

### Error Codes

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `DATE_RANGE_REQUIRED` | 400 | `date_from` or `date_to` missing |
| `DATE_RANGE_EXCEEDED` | 400 | Date range exceeds 90-day cap |
| `INVALID_DATE_FORMAT` | 400 | Date params not valid ISO date |

## Design Reference

- Backend design: `apps/erify_api/docs/design/SHOW_PLANNING_EXPORT_DESIGN.md`
- Frontend design: `apps/erify_studios/docs/design/SHOW_PLANNING_EXPORT_DESIGN.md`
- Task submission reporting (pattern reference, not code dependency): `apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md`
- Economics baseline: `apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md`
- Business domain: `docs/domain/BUSINESS.md`
- Show planning ideation (preserved context): deleted after this PRD was created (promoted 2026-03-22)
