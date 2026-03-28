# Show Planning Export Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/show-planning-export.md`](../../../../docs/prd/show-planning-export.md)
> **Depends on**: Economics endpoints on `master` ⏸️

## Purpose

Provide a studio-scoped planning export endpoint that returns one row per show for pre-show operational planning and budget review.

## API Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/shows/planning-export` | Paginated JSON preview or CSV download |

## Query Contract

- Required: `date_from`, `date_to`
- Optional: `format`, `client_uid`, `status`, `standard`, `page`, `limit`
- Enforce a 90-day max range with `DATE_RANGE_EXCEEDED`

## Query / Composition Plan

- Base query starts from `Show` and joins client, room, standard, type, and creator assignments.
- Export remains one row per show; `assigned_creators` is a server-side aggregated string.
- `estimated_total_cost` is sourced from economics state, not recomputed with unrelated task-report machinery.
- Include show-scoped compensation line items only through the economics service; do not prorate schedule/global items into export rows.

## Implementation Notes

- Keep JSON and CSV on the same route so filtering logic stays shared.
- Reuse only domain-neutral helpers from task reporting (CSV serialization, flat response helpers, date/filter parsing).
- Exclude soft-deleted shows regardless of caller filters.

## Authorization

- `ADMIN`, `MANAGER`

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: JSON pagination, CSV output, date cap, filter combinations, null cost handling

