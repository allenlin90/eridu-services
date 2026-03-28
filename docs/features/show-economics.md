# Feature: Show Economics Baseline

> **Status**: ✅ Shipped — Phase 4 (reopened), commit `8de31ffe`, 2026-03-22
> **Workstream**: P&L Baseline — Variable Cost Visibility
> **Canonical docs**: [BE design](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/SHOW_ECONOMICS_DESIGN.md)

## Problem

Studios had no visibility into show-level costs. Creator fees and shift labor costs were tracked outside the system, making financial analysis manual and unreliable.

## Users

| Role | Need |
| --- | --- |
| Finance | P&L by show, schedule, client for accounting and forecasting |
| BD / Commerce | Performance metrics for client reporting and pricing decisions |
| Studio Admin | Cost visibility for operational planning |

## What Was Delivered

- Show-level baseline variable cost endpoint: creator costs + shift labor costs.
- Grouped economics endpoint: aggregate costs by show, schedule, or client with date-range filtering.
- Creator cost precedence: `ShowCreator.agreedRate` → `Creator.defaultRate`.
- Compensation type handling: `FIXED` creators have computed cost; `COMMISSION`/`HYBRID` yield `null` (revenue side deferred).
- Shift cost attribution: proportional to block overlap with show time window.
- 2 API endpoints:
  - `GET /studios/:studioId/shows/:showId/economics` — single show variable cost breakdown
  - `GET /studios/:studioId/economics` — grouped economics (`group_by=show|schedule|client`)

## Key Product Decisions

- **Baseline variable costs only** — fixed costs (rent, equipment) are deferred.
- **Complex compensation deferred** — bonus/tiered/hybrid rule engines not part of baseline.
- **FIXED-only baseline cost** — `COMMISSION`/`HYBRID` types appear with `null` computed cost until revenue inputs are available.
- **`@preview` markers** — endpoints marked `@preview` until revenue workflow ships and removes them.
- **No compensation logic in metadata** — `metadata` is descriptive only.

## Acceptance Record

- [x] Show economics endpoint returns baseline creator cost + shift cost.
- [x] Grouped economics endpoint returns baseline cost totals by show/schedule/client.
- [x] Compensation input fields accepted/persisted on `ShowCreator` and `Creator`.
- [x] No bonus/tiered/hybrid rule execution required.
- [x] `COMMISSION`/`HYBRID` creators included with `null` cost and `compensation_type` indicator.

## Forward References

- **Compensation line items** (additive cost channel): [compensation-line-items.md](../prd/compensation-line-items.md) — supplemental cost items (bonus, allowance, OT, deduction) for members and creators. Phase 4 economics uses scope-matched aggregation only: show/client surfaces include show-scoped items, schedule grouping also includes schedule-scoped items, and standing/global items stay out of economics until an allocation policy exists. Uses `CompensationLineItem` + `CompensationTarget` (polymorphic, follows `TaskTarget` pattern). Scheduled for post-Wave 1 economics cost model review.
- Revenue workflow (activates COMMISSION/HYBRID, removes `@preview`): [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md)
- Studio rosters (accurate cost inputs): [studio-member-roster.md](./studio-member-roster.md) ✅, [studio-creator-roster.md](../prd/studio-creator-roster.md)
- Show planning export (consumes economics for cost column): [show-planning-export.md](../prd/show-planning-export.md)
