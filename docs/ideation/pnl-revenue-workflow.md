# Ideation: P&L Revenue Workflow — Full P&L Visibility

> **Status**: Deferred from Phase 4, March 2026
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [show-economics PRD](../prd/show-economics.md), [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [docs/domain/BUSINESS.md](../../docs/domain/BUSINESS.md)

## What

Build the revenue ("P") side of the P&L model to complement the cost ("L") side shipped in Phase 4. This includes: GMV/sales input workflows, per-show revenue attribution, commission/hybrid creator cost calculation using actual revenue, and a contribution margin view. The economics endpoints are currently marked `@preview` because commission/hybrid costs show as $0 without revenue.

## Why It Was Considered

- Phase 4 shipped creator compensation costs and shift labor costs (the "L" side). The P&L model is incomplete without revenue.
- Commission and hybrid creator cost calculations require revenue as input — the economics service already supports this; it just needs revenue values.
- Operations and management need contribution margin visibility to evaluate show-level profitability.

## Why It Was Deferred

1. No clear data model design for revenue: `ShowPlatform.gmv` vs. a separate `ShowPlatformMetrics` table for corrections and audit trail.
2. No defined input workflow: who enters revenue and when (post-show, real-time, platform API import)?
3. Platform-specific metric differences (TikTok gifting, YouTube super chats, Shopee ad revenue) need typed columns or `metadata` handling — product definition incomplete.
4. Revenue arithmetic should use `big.js` — current economics flow uses JS floating-point in parts, which must be fixed before P&L is treated as production-grade financial reporting.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Economics baseline (cost side) is shipped and validated, and revenue is the identified next gap.
2. GMV vs. sales distinction is formally defined in `docs/domain/BUSINESS.md`.
3. Revenue input workflow (post-show manual entry or platform API import) is agreed with product.
4. Financial reporting accuracy requirements trigger a `big.js` adoption mandate.

## Implementation Notes (Preserved Context)

### Open design questions to resolve before PRD

- **GMV vs Sales distinction**: What does each represent in the live-commerce context? (GMV = total traded value including returns/cancelled orders; Sales = net settled revenue? Needs product definition.)
- **Revenue ownership model**: Is `ShowPlatform.gmv` the right location, or should financial outcomes live in a separate `ShowPlatformMetrics` table to support corrections, multi-snapshot, and audit trail?
- **Platform-specific metrics**: TikTok, YouTube, Shopee etc. have different revenue signals (gifting, super chats, ad rev). Should platform-specific extras go in `metadata` or typed columns?
- **Input workflow**: Who enters revenue and when? Post-show? Real-time? Import from platform API?
- **Numerical precision strategy**: Revenue, rate, commission, margin, and aggregate P&L calculations should move to `big.js`-based arithmetic instead of plain JS floating-point math.
- **Commission cost dependency**: COMMISSION/HYBRID creator cost calculation requires revenue. Without revenue, cost is $0. The economics service already supports this; it just needs a revenue value to be meaningful.
- **Compensation extensibility model**: current schema covers base fixed/commission/hybrid inputs, but not additional components (bonus, OT, special allocations). Decide whether these should be modeled as additive cost items (recommended) instead of overloading base rate fields.

### TODOs (once design questions are resolved)

- Define and document the `gmv` vs `sales` distinction in `docs/domain/BUSINESS.md`.
- Decide: extend `ShowPlatform` with typed columns, or introduce `ShowPlatformMetrics` table for financial outcomes.
- Introduce `big.js` as the standard financial arithmetic library for backend economics calculations and any frontend financial summaries that must match backend totals.
- Add FE input for revenue fields on the show platform form in `erify_studios` (currently only `viewer_count` is editable).
- Design and implement additive creator cost components:
  - add a dedicated cost-item model for per-show creator adjustments (bonus, OT, special allocation, and future types),
  - define calculation contract: `base compensation + sum(cost items)`,
  - support auditability fields (who/when/reason/metadata) for each cost item.
- Remove `@preview` markers from economics controller once UI ships.
- Update `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md` status to ✅ Implemented once shipped.

### Carry-over technical concerns

- **Schema validation contract (`createStudioCreatorRosterSchema`)**: Can return `404` when `creator_id` is missing (falls through to lookup with empty ID). Decision: either keep as explicit debt with rationale, or tighten schema to return `400` for missing identifier input.
- **Bulk creator assignment write pattern**: Current implementation is `O(n×m)` with sequential writes. Request-size caps are in place (`BULK_ASSIGN_MAX_CREATORS_PER_SHOW = 50`, `BULK_ASSIGN_MAX_SHOWS = 20`). Decision: define acceptable throughput bounds and add concurrency cap via `p-limit` or batched strategy if P&L workflows increase assignment volume beyond current limits.
- **P&L shift-cost distribution model**: Current grouped P&L view evenly distributes total shift cost across shows in range. Treat as known simplification unless product/accounting rules require per-show attribution changes.
- **Floating-point precision risk**: Current financial calculations still rely on JS `number` arithmetic in parts of the economics flow. Replace with `big.js`-backed helpers before P&L is treated as production-grade financial reporting.
- **Baseline status drift**: Endpoint rollout status differs between branches/docs. Reconcile branch/doc status before finalizing promotion sequencing.
