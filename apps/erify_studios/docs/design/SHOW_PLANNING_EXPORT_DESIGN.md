# Show Planning Export Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/show-planning-export.md`](../../../../docs/prd/show-planning-export.md)
> **Depends on**: Economics endpoints on `master` ⏸️, sidebar redesign 🔲

## Purpose

Add a planning export screen that lets operators preview and download one-row-per-show planning data with estimated cost.

## Route Plan

| Route | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/shows/planning-export` | Planning export preview + CSV download | `ADMIN`, `MANAGER` |

## Data / Query Plan

- Query key family: `planning-export`.
- URL-backed filters: date range, client, status, standard, page, limit.
- JSON preview and CSV download share one filter state and endpoint contract.

## Component Plan

- Filter toolbar with required date range and optional secondary filters.
- Fixed-schema preview table.
- CSV download action.
- Empty state and over-range validation state.

## UX Rules

- Keep the route in the Reports section of studio navigation.
- Do not reuse task-report-specific builder UI or column-picking patterns.
- Explain `estimated_total_cost = null` as an expected economics state.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: preview paging, CSV download, filter persistence, null cost explanation

