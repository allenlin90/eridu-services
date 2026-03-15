# PRD: Show Economics & P&L

> **Status**: Active
> **Phase**: 5 — P&L Baseline & Operations
> **Workstream**: 1
> **Depends on**: Creator Mapping — ✅ **Complete** (deployed to master; compensation fields live)

## Problem

The studio has no visibility into show-level profitability. Key questions unanswered today:

- *"What did this show cost us in creator fees and shift labor?"*
- *"What's the P&L for this client this month?"*
- *"Which shows are profitable vs. loss-making?"*
- *"What's the GMV and sales performance by platform for this schedule?"*

Show performance data (views, GMV, sales) and creator compensation are tracked outside the system, making financial analysis manual and unreliable.

## Users

- **Finance**: P&L by show, schedule, client for accounting and forecasting
- **BD / Commerce**: performance metrics for client reporting and pricing decisions
- **Studio admins**: cost visibility for operational planning

## Existing Infrastructure

| Model              | Fields                                                                                           | Status                  |
| ------------------ | ------------------------------------------------------------------------------------------------ | ----------------------- |
| `StudioShift`      | `hourlyRate`, `projectedCost`, `calculatedCost`                                                  | ✅ Exists                |
| `StudioMembership` | `baseHourlyRate`                                                                                 | ✅ Exists                |
| `ShowPlatform`     | `viewerCount`                                                                                    | ✅ Exists (no GMV/sales) |
| `Creator`          | `defaultRate`, `defaultRateType`, `defaultCommissionRate`                                        | ✅ Exists (deployed)     |
| `ShowCreator`      | `agreedRate`, `compensationType`, `commissionRate` (per-show overrides; unique per show+creator) | ✅ Exists (deployed)     |

## Requirements

### Baseline (in scope now)

1. ~~Schema/contract extensions for creator compensation inputs~~ — ✅ **Done**: `agreedRate`, `compensationType`, `commissionRate` are live on `ShowCreator`; `defaultRate`, `defaultRateType`, `defaultCommissionRate` are live on `Creator`.
2. Show-level baseline variable cost = creator costs + shift labor costs.
3. Creator baseline cost per show: resolve rate using `ShowCreator.agreedRate` → `Creator.defaultRate` precedence. Only `FIXED` type creators contribute to baseline cost (COMMISSION and HYBRID require GMV, which is deferred).
4. Shift baseline cost per show uses existing shift cost fields for overlapping show windows.
5. API baseline: `GET /studios/:studioId/shows/:showUid/economics` for cost visibility.
6. Grouped baseline economics read: `GET /studios/:studioId/economics?group_by=show|schedule|client&date_from=...&date_to=...`.

### Deferred (future profit module, not Phase 4 baseline)

1. Complex/hybrid compensation execution.
2. Bonus and post-show adjustments.
3. Tiered or volume-based commission formulas.
4. Fully dynamic formula/rule configuration by planner/admin.
5. Full profit/performance aggregation dependency on GMV/sales/traffic inputs.

## Acceptance Criteria

- [ ] Show economics endpoint returns baseline creator cost + shift cost.
- [ ] Grouped economics endpoint returns baseline cost totals by show/schedule/client.
- [x] Compensation input fields are accepted/persisted (`agreedRate`, `compensationType`, `commissionRate` on `ShowCreator`; defaults on `Creator`). — ✅ Done
- [ ] No bonus/tiered/hybrid rule execution is required in this phase.
- [ ] COMMISSION/HYBRID creators are included in response with null/zero cost and a `compensation_type` indicator so callers know cost is partial.

## Product Decisions

- **Baseline variable costs only** — fixed costs (rent, equipment) are future.
- **Complex compensation is deferred** — bonus/tiered/hybrid rule engines are not part of baseline.
- **Creator rate precedence**: `ShowCreator.agreedRate` → `Creator.defaultRate`. `ShowCreator.compensationType` → `Creator.defaultRateType`.
- **FIXED-only baseline cost**: only `FIXED` type creators have a computable baseline cost. `COMMISSION` and `HYBRID` types appear in the response with `null` computed cost until GMV inputs are available.
- **No compensation logic in metadata** — `metadata` is descriptive only, not executable financial rules.

## Design Reference

- Backend feature doc: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Frontend feature doc: `apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md`
