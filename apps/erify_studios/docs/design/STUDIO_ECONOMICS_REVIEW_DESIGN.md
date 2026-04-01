# Studio Economics Review Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/studio-economics-review.md`](../../../../docs/prd/studio-economics-review.md)
> **Depends on**: Economics grouped/show contract on `master` ⏸️, sidebar redesign 🔲, compensation-aware backend fields 🔲

## Purpose

Define the primary studio finance workspace for reviewing future projected cost and past actualized cost, plus the embedded economics preview used during show assignment workflows.

## Route Plan

| Route / Surface | Purpose | Access |
| --- | --- | --- |
| `/studios/$studioId/economics` | Main date-ranged economics review workspace | `ADMIN`, `MANAGER` |
| Show detail / creator-assignment economics card | Compact projected-cost preview while managing a show | existing show-detail roles |

## Data / Query Plan

- Keep grouped filters in the URL: `date_from`, `date_to`, `horizon`, `group_by`, optional secondary filters.
- Treat the grouped route as the primary economics query surface.
- Reuse the show-level economics query for drill-in and assignment preview.
- Never derive finance math in FE; render backend-calculated `projected_total_cost`, `actual_total_cost`, `primary_total_cost`, and `cost_state`.

## Component Plan

- Filter bar with required date range and horizon presets.
- Summary cards that switch labeling between projected and actual depending on the selected horizon.
- Grouped table with explicit state chips for projected / actual / partial / unresolved rows.
- Row drill-in to show-level breakdown.
- Compact economics card inside show detail / assignment views, refreshed after assignment mutations.

## UX Rules

- Label projected and actual states explicitly. Do not render a generic "total cost" label when the meaning changes by horizon.
- Do not show variance language unless both values exist and the backend explicitly provides a stable comparison contract.
- Null and partial states need explanatory copy, not empty cells.
- Planning export should feel like a downstream handoff from this route, not a replacement for it.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: horizon presets, date persistence, grouped review, partial-cost messaging, assignment-preview refresh
