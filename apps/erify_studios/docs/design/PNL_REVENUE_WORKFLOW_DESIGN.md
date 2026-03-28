# P&L Revenue Workflow Frontend Design

> **Status**: Blocked pending decision record
> **Phase scope**: Phase 4 Wave 3
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/pnl-revenue-workflow.md`](../../../../docs/prd/pnl-revenue-workflow.md)
> **Depends on**: Backend revenue fields/endpoints 🔲, economics UI surfaces 🔲

## Purpose

Define the studio-admin revenue-entry surfaces that complete the P&L model and unlock commission/hybrid creator cost resolution plus contribution margin.

## Surface Plan

| Surface | Purpose |
| --- | --- |
| Show-platform form or detail panel | Enter GMV / net sales per platform |
| Economics pages | Display revenue, contribution margin, and resolved commission/hybrid costs |

## Data / Query Plan

- Revenue writes should invalidate show-platform detail plus economics queries for the affected show/studio.
- Keep financial fields schema-backed from `@eridu/api-types`.
- Preserve backend nullability semantics until revenue is actually entered.

## UI Rules

- Revenue entry is post-show admin workflow, not live-editing during broadcast.
- Use explicit empty/null states when revenue is missing.
- Never reproduce commission formulas in FE code; render backend-calculated results only.
- Contribution margin should be visually distinct from cost-only cards once available.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: revenue entry, economics refresh, contribution margin display, unresolved vs resolved commission cases

