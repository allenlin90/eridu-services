# PRD: Show Planning Export (3.2)

> **Status**: 🔲 Planned - required Phase 4 scope
> **Phase**: 4 - Wave 3 (Finance Surfaces)
> **Workstream**: Future-horizon operations planning export with show assignments and L-side cost preview.
> **Depends on**: 2.1 Economics Cost Model ✅ ([PRD](./economics-cost-model.md)) · 2.2 Compensation Line Items + Actuals 🔲 · 2.3 Economics Service 🔲 · 3.1 Studio Economics Review 🔲
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) owns cost calculation. Planning export reads show-level/operational cost rows; it does not calculate compensation itself.

## Purpose

Operations needs a flat planning export for upcoming shows. The export should answer:

- what shows are planned in the selected window
- which creators are assigned
- what compensation/cost reference is currently projected for each show
- which costs are unresolved and need follow-up before planning signoff

The simplified decision: **planning export is show-first, not show-only**. It keeps one row per show like task reporting, but the backend cross-references related assignment and compensation records into that row instead of exporting bare show metadata.

## Problem

Operations currently assembles pre-show planning sheets manually from show lists, assignment screens, and finance estimates. That creates drift from the database and loses the context needed to confirm whether the projected cost includes creator assignments and compensation line items.

Key questions:

- "What shows are planned next week?"
- "Who is assigned to each show?"
- "What does the current L-side cost model project for each show?"
- "Which event-attached compensation items are included in the estimate?"
- "Which rows are unresolved because commission/revenue or other inputs are missing?"

## Users

| Role | Need |
| --- | --- |
| Studio ADMIN | Export upcoming show plans with projected cost references for budget review. |
| Studio MANAGER | Verify assignments and current projected cost before execution. |
| Operations | Work from a flat sheet that matches the show planning mental model. |

## Relationship To Task Reporting

Task submission reporting is the pattern reference for **show-first export shape**:

- one row per show
- backend joins/cross-references related records into a flat table
- FE can preview rows and export CSV from the same dataset
- no server-side report file storage required for v1

Planning export must not import task snapshot/template concepts. It reads normalized show, assignment, shift, and economics records only.

## Scope Boundary

### In Scope

- Future-horizon date-range query for shows.
- One row per show.
- Show metadata columns.
- Assigned creator summary.
- Assignment and compensation cross-reference fields.
- Projected cost fields sourced from 2.3 economics service.
- Show/show-assignment-attached compensation line items included through the 2.3 cost response.
- Nullable/unresolved cost handling.
- Paginated JSON preview.
- CSV export with the same fixed column set.
- Optional filters for client, status, standard, and room where supported.

### Out of Scope

- One row per assignment in the Phase 4 export.
- Payroll-like assignment export.
- Column builder or saved export definitions.
- Google Sheets push integration.
- Server-side generated/stored report files.
- Budget-vs-actual comparison.
- Revenue, commission resolution, and contribution margin.
- Standalone, schedule-scoped, standing, global, recurring, HR, or payment-system line items.
- Task submission data, task snapshots, task template columns, or moderation report fields.

## Export Grain And Compensation Inclusion

### Show row grain

The export remains **one row per show**. A show with three assigned creators still produces one export row.

### Assignment cross-reference

The row must include assignment context so operations can audit whether the cost reference is based on the right planned staffing:

- `assigned_creators` - comma-separated creator display names for CSV.
- `creator_assignment_count` - count of active `ShowCreator` assignments.
- JSON preview may also include `creator_assignments[]` with `creator_uid`, `creator_name`, `compensation_type`, `agreed_rate`, `base_subtotal`, `line_item_subtotal`, `cost`, `unresolved_reasons`, and `calculation_warnings` if 2.3 returns the breakdown.

### Compensation line item inclusion

Show/show-assignment-attached `CompensationLineItem` rows are included through the 2.3 cost response:

- `line_item_subtotal` is included in the show row.
- `estimated_total_cost` reflects base + show/show-assignment-attached line items when all required components resolve.
- `estimated_total_cost` remains null when the cost model says the show is unresolved.
- Standalone, schedule-scoped, standing, global, recurring, HR, and payment-system line items do not exist in Phase 4 and are not included in planning export rows.

This keeps planning export useful for assignment verification without turning it into a payroll export.

## Existing Infrastructure

| Model / Endpoint | Behavior | Status |
| --- | --- | --- |
| `Show` | Metadata, status, standard, type, room, start/end time, schedule linkage. | Exists |
| `Client` | Client name linked to show. | Exists |
| `ShowCreator` | Creator assignments and snapshot agreement fields. | Exists |
| `CompensationLineItem` | Event-attached supplemental costs. | Built by 2.2 |
| `GET /studios/:studioId/shows/:showId/economics` | Show-level cost reference. | Built by 2.3 |
| `GET /studios/:studioId/economics` | Operational grouped cost rows. | Built by 2.3 |
| Task report export helpers | CSV/table utilities may be reusable if domain-neutral. | Pattern reference only |

## Requirements

### Fixed output columns

The first version uses a fixed schema. Column builder can be revisited after operations validates the sheet.

| Column | Source |
| --- | --- |
| `show_id` | `Show.uid` |
| `show_name` | `Show.name` |
| `client_name` | `Client.name` |
| `status` | `Show.status.name` |
| `standard` | `Show.showStandard.name` |
| `type` | `Show.showType.name` |
| `room` | `Show.room.name` |
| `start_time` | `Show.startTime` |
| `end_time` | `Show.endTime` |
| `assigned_creators` | Aggregated active `ShowCreator -> Creator.name` values |
| `creator_assignment_count` | Active creator assignment count |
| `creator_base_subtotal` | 2.3 show economics creator base subtotal |
| `operator_shift_subtotal` | 2.3 show economics operator/shift subtotal, if available |
| `line_item_subtotal` | 2.3 show economics show/show-assignment-attached line item subtotal |
| `estimated_total_cost` | 2.3 show economics `cost` |
| `unresolved_reasons` | 2.3 unresolved reason list, joined for CSV |
| `calculation_warnings` | 2.3 warning list, joined for CSV |

JSON preview may include richer nested assignment breakdown, but CSV remains one row per show.

### Filters

- Required: `date_from`, `date_to`.
- Optional: `client_uid`, `status`, `standard`, `room`.
- Date range cap: 90 days.
- Soft-deleted shows are excluded.

Planning export is intended for future/in-flight planning windows. It should not become the historical finance review surface; use 3.1 for broader past/future economics review.

### Cost rules

- Costs are read from 2.3; export code does not compute finance formulas.
- Values are serialized as decimal strings in JSON.
- CSV renders null cost fields as empty cells.
- Null `estimated_total_cost` is expected when the cost model has unresolved components.
- Planned-fallback warnings are included when actuals are missing or incomplete and cost is calculated from planned time.
- Show/show-assignment-attached line items are included.
- Standalone, schedule-scoped, standing, global, recurring, HR, and payment-system line items are not part of Phase 4.

## Routes

| Method | Route | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/studios/:studioId/shows/planning-export` | Paginated JSON preview by default, or CSV download with `format=csv`. | ADMIN, MANAGER |

Query parameters:

- `date_from` - required ISO date
- `date_to` - required ISO date
- `format` - `json` or `csv`, default `json`
- `client_uid` - optional
- `status` - optional
- `standard` - optional
- `room` - optional
- `page` / `limit` - JSON only

Route guard: `@StudioProtected([ADMIN, MANAGER])`.

## Frontend Route

`/studios/$studioId/shows/planning-export` or a dedicated view within the Shows/Reports area.

The UI should:

- reuse the standard table/pagination stack
- show the same fixed columns as the export
- make null/unresolved cost visible before download
- provide CSV download from the same filter state

## JSON Response Shape

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
      "start_time": "2026-05-01T19:00:00Z",
      "end_time": "2026-05-01T22:00:00Z",
      "assigned_creators": "Alice, Bob",
      "creator_assignment_count": 2,
      "creator_base_subtotal": "1200.00",
      "operator_shift_subtotal": "300.00",
      "line_item_subtotal": "150.00",
      "estimated_total_cost": "1650.00",
      "unresolved_reasons": [],
      "calculation_warnings": [],
      "creator_assignments": [
        {
          "creator_uid": "smc_alice",
          "creator_name": "Alice",
          "compensation_type": "FIXED",
          "agreed_rate": "1000.00",
          "base_subtotal": "1000.00",
          "line_item_subtotal": "100.00",
          "cost": "1100.00",
          "unresolved_reasons": [],
          "calculation_warnings": []
        }
      ]
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

## Error Codes

| Code | HTTP | Condition |
| --- | --- | --- |
| `DATE_RANGE_REQUIRED` | 400 | `date_from` or `date_to` missing. |
| `DATE_RANGE_EXCEEDED` | 400 | Date range exceeds 90-day cap. |
| `INVALID_DATE_FORMAT` | 400 | Date params are not valid ISO dates. |

## Acceptance Criteria

- [ ] ADMIN and MANAGER can open the planning export preview.
- [ ] Date-range query returns active shows scoped to the studio within the requested planning window.
- [ ] JSON preview is paginated and follows existing list response conventions.
- [ ] CSV export uses the same filters and fixed column set as JSON preview.
- [ ] Export is one row per show, regardless of assignment count.
- [ ] Each row includes assigned creator names and creator assignment count.
- [ ] Each row includes 2.3-sourced `creator_base_subtotal`, `operator_shift_subtotal`, `line_item_subtotal`, and `estimated_total_cost` where available.
- [ ] Show/show-assignment-attached compensation line items are included through the 2.3 cost response.
- [ ] Standalone, schedule-scoped, standing, global, recurring, HR, and payment-system line items are absent from the Phase 4 export.
- [ ] Null `estimated_total_cost` values remain null/empty and surface `unresolved_reasons` when available.
- [ ] Planned-fallback rows surface `calculation_warnings` when actuals are missing or incomplete.
- [ ] Optional filters correctly narrow the result set.
- [ ] Soft-deleted shows are excluded.
- [ ] No task submission data, task snapshot data, or task template concepts appear in the export.
- [ ] FE does not recompute monetary values locally.

## Product Decisions

- **Show-first, not show-only.** The row grain is one show, but the row cross-references assignments and cost records.
- **No assignment row explosion in Phase 4.** Assignment-level payroll exports are a separate future workflow.
- **Fixed schema first.** Operations validates the fixed sheet before column configurability is added.
- **Economics is informational.** Null cost is a valid planning state, not an error.
- **2.3 owns all money.** Planning export only presents values returned by the economics service.
- **Task reporting is a shape reference only.** Domain concepts remain separate.

## Design Reference

Pre-signoff design drafts were removed because planning export must be redrafted against the implemented 2.3 read shape and the confirmed 3.1 review/export surface.

- Economics cost model: [economics-cost-model.md](./economics-cost-model.md)
- Economics service: [economics-service.md](./economics-service.md)
- Studio economics review: [studio-economics-review.md](./studio-economics-review.md)
- Task submission reporting pattern reference: [task-submission-reporting.md](../features/task-submission-reporting.md)
