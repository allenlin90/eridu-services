# PRD: Show Economics & P&L

> **Status**: Draft
> **Phase**: 4 — P&L Visibility & Creator Operations
> **Workstream**: 3
> **Depends on**: [Creator Mapping](./creator-mapping.md) (compensation requires creator-show linkage)

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

| Model                     | Fields                                          | Status                  |
| ------------------------- | ----------------------------------------------- | ----------------------- |
| `StudioShift`             | `hourlyRate`, `projectedCost`, `calculatedCost` | ✅ Exists                |
| `StudioMembership`        | `baseHourlyRate`                                | ✅ Exists                |
| `ShowPlatform`            | `viewerCount`                                   | ✅ Exists (no GMV/sales) |
| `Creator` / `ShowCreator` | No compensation fields                          | ❌ Gap                   |

## Requirements

### Baseline (in scope now)

1. Keep schema/contract extensions that support creator compensation inputs (`agreedRate`, `compensationType`, `commissionRate`) without requiring full profit-rule execution yet.
2. Show-level baseline variable cost = creator costs + shift labor costs.
3. Creator baseline cost per show uses current agreed/default rate handling only.
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
- [ ] Compensation input fields are accepted/persisted for forward compatibility.
- [ ] No bonus/tiered/hybrid rule execution is required in this phase.

## Product Decisions

- **Baseline variable costs only** — fixed costs (rent, equipment) are future.
- **Complex compensation is deferred** — bonus/tiered/hybrid rule engines are not part of baseline.
- **Creator rate precedence**: `ShowCreator.agreedRate` overrides creator defaults.
- **No compensation logic in metadata** — `metadata` is descriptive only, not executable financial rules.

## Design Reference

- Backend feature doc: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Frontend feature doc: `apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md`
