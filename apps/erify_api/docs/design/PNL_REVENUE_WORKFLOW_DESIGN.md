# P&L Revenue Workflow Backend Design

> **Status**: Blocked pending decision record
> **Phase scope**: Phase 4 Wave 3
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/pnl-revenue-workflow.md`](../../../../docs/prd/pnl-revenue-workflow.md)
> **Depends on**: Show economics baseline on `master` ⏸️, studio creator roster ✅, `big.js` adoption 🔲

## Purpose

Activate the revenue side of the P&L model by persisting show-platform revenue inputs and using them to resolve `COMMISSION` / `HYBRID` creator costs plus contribution margin.

## Planned Surface

- Schema extension on `ShowPlatform` with `gmv` and `netSales` (recommended path)
- Revenue input PATCH endpoint on show-platform records
- Economics service activation of commission/hybrid creator cost calculation
- Contribution margin in economics responses
- Removal of `@preview` from economics endpoints once end-to-end behavior is live

## Decision Record Required Before Implementation

1. `ShowPlatform` extension vs. dedicated metrics table
2. Universal `gmv` / `net_sales` columns vs. platform-specific modeled revenue dimensions
3. Post-show manual entry workflow vs. another ingestion model
4. `big.js` migration for all finance arithmetic

## Service Plan

- Keep revenue persistence separate from economics calculation.
- Convert economics arithmetic to `big.js` before enabling revenue-derived creator fees.
- Preserve current creator-rate precedence rules; revenue only activates previously unresolved cost paths.
- Grouped economics must exclude unresolved shows from margin aggregation rather than treating missing revenue as zero.

## Contract Notes

- Shows without revenue input continue to work with `null` commission cost and `null` contribution margin.
- Public responses stay UID-based.
- Platform-specific extra metrics, if any, remain informational metadata until they become query-critical.

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: revenue persistence, commission creator resolution, mixed grouped aggregation, `@preview` removal gate
