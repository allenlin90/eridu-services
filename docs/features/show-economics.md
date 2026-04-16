# Reference: Show Economics Baseline (Deferred Merge)

> **Status**: ⏸️ Deferred branch reference — not shipped on `master`
> **Branch snapshot**: `feat/show-economics-baseline`, commit `8de31ffe`, 2026-03-22
> **Workstream**: P&L Baseline — Variable Cost Visibility
> **Current planning docs**: [Phase 4 roadmap](../roadmap/PHASE_4.md), [BE design](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/SHOW_ECONOMICS_DESIGN.md)

## Why This Reference Still Exists

This document is retained as an archived product reference for the deferred economics baseline branch. The API endpoints and studio UI described below do **not** exist on the current `master` branch. Merge was deferred until the Phase 4 cost-model review and compensation-line-item workstreams settle the baseline contract.

## Problem

Studios had no visibility into show-level costs. Creator fees and shift labor costs were tracked outside the system, making financial analysis manual and unreliable.

## Users

| Role | Need |
| --- | --- |
| Finance | P&L by show, schedule, client for accounting and forecasting |
| BD / Commerce | Performance metrics for client reporting and pricing decisions |
| Studio Admin | Cost visibility for operational planning |

## Branch Scope

- Show-level baseline variable cost endpoint: creator costs + shift labor costs.
- Grouped economics endpoint: aggregate costs by show, schedule, or client with date-range filtering.
- Creator cost precedence contract: `ShowCreator.agreedRate` → `StudioCreator.defaultRate`.
- Compensation type handling: `FIXED` creators have computed cost; `COMMISSION`/`HYBRID` yield `null` (revenue side deferred).
- Shift cost attribution: proportional to block overlap with show time window.
- Planned endpoints on the deferred branch:
  - `GET /studios/:studioId/shows/:showId/economics` — single show variable cost breakdown
  - `GET /studios/:studioId/economics` — grouped economics (`group_by=show|schedule|client`)

## Key Product Decisions

- **Baseline variable costs only** — fixed costs (rent, equipment) are deferred.
- **Complex compensation deferred** — bonus/tiered/hybrid rule engines not part of baseline.
- **FIXED-only baseline cost** — `COMMISSION`/`HYBRID` types appear with `null` computed cost until revenue inputs are available.
- **`@preview` markers** — endpoints marked `@preview` until revenue workflow ships and removes them.
- **No compensation logic in metadata** — `metadata` is descriptive only.
- **Studio roster fallback** — creator-side fallback compensation is studio-scoped on `StudioCreator`, not global on `Creator`.

## Why Merge Was Deferred

- Cost-model review is still needed for bonus, OT, allowance, and compensation-line-item treatment.
- The deferred branch has not been merged into `master`, so there is no canonical shipped backend/frontend reference yet.
- Downstream consumers such as studio economics review and show planning export should be built on the revised merged contract, not on the archived branch behavior blindly.

## Current Repo Status

- `master` does not expose the economics endpoints or studio economics routes described here.
- Backend and frontend economics docs in `apps/*/docs/design/` remain planning documents, not shipped implementation references.
- Phase 4 tracks this as a deferred merge after `R` / `R+` work completes.

## Forward References

- **Compensation line items** (additive cost channel): [compensation-line-items.md](../prd/compensation-line-items.md) — supplemental cost items (bonus, allowance, OT, deduction) for members and creators. The archived baseline branch assumes scope-matched aggregation only: show/client surfaces include show-scoped items, schedule grouping also includes schedule-scoped items, and standing/global items stay out of economics until an allocation policy exists. Uses `CompensationLineItem` + `CompensationTarget` (polymorphic, follows `TaskTarget` pattern). Scheduled for post-Wave 1 economics cost model review.
- Revenue workflow (activates COMMISSION/HYBRID, removes `@preview`): [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md)
- Studio rosters (accurate cost inputs): [studio-member-roster.md](./studio-member-roster.md) ✅, [studio-creator-roster.md](./studio-creator-roster.md) ✅
- Show planning export (consumes economics for cost column): [show-planning-export.md](../prd/show-planning-export.md)
