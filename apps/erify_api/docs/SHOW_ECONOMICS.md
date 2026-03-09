# Show Economics & P&L — Shipped Behavior

> **Status**: ✅ Implemented (Phase 4, 2026-03-07)
> **Phase**: 4 — P&L Visibility & MC Operations

## What It Does

Aggregates MC compensation costs, shift labor costs, and platform revenue to produce per-show P&L and studio-wide grouped performance/profitability views.

## Manager E2E Workflow

This is the practical flow for a studio manager using Phase 4 features:

1. Prepare operations inputs
   - Assign MCs to shows (`/studios/:studioId/shows/:showId/mcs` or bulk assignment endpoint).
   - Set compensation terms (fixed/commission/hybrid fields on MC/ShowMC/StudioMc).
   - Maintain studio shifts with projected/calculated costs.
2. Record show outcomes
   - Enter show-platform performance metrics (`gmv`, `sales`, `orders`, `viewer_count`).
3. Inspect single-show unit economics
   - Call `GET /studios/:studioId/shows/:showId/economics` to see one show’s variable-cost contribution.
4. Compare groups in a date window
   - Call `GET /studios/:studioId/economics?group_by=show|schedule|client&date_from=...&date_to=...`.
   - Use grouped rows to compare which buckets are profitable/unprofitable.
5. Inspect topline performance without cost
   - Call `GET /studios/:studioId/performance?...` for traffic and commerce totals.

This is a management reporting layer (operational decision support), not a statutory accounting ledger.

## Data Model Additions

### Show Platform Metrics (`ShowPlatform`)

New nullable fields on `ShowPlatform` (`prisma/schema.prisma`):
- `gmv Decimal?` — gross merchandise value
- `sales Decimal?` — net sales
- `orders Int?` — order count

These are manually entered; platform API integration is deferred.

## API Endpoints

All at `apps/erify_api/src/studios/studio-economics/studio-economics.controller.ts`.
Access: `@StudioProtected([ADMIN, MANAGER])` on all endpoints.

Access note:
- `TALENT_MANAGER` is intentionally excluded from these financial overview endpoints.
- Talent managers can set MC compensation/cost inputs via MC operations endpoints, while consolidated economics/performance reporting remains manager/admin-only.
- Canonical role policy lives in `docs/product/ROLE_ACCESS_MATRIX.md`.

### Per-Show Economics

| Method | Path |
|--------|------|
| GET | `/studios/:studioId/shows/:showId/economics` |

Response:
```
{ show_id, mc_cost, shift_cost, total_variable_cost, revenue, contribution_margin }
```

All monetary fields are `string` (decimal-as-string).

**Computation:**
- `revenue` = sum of `ShowPlatform.gmv` for all platforms on the show
- `mc_cost`:
  - `FIXED`: `agreedRate ?? StudioMc.defaultRate ?? MC.defaultRate`
  - `COMMISSION`: `revenue × (commissionRate ?? StudioMc.defaultCommissionRate ?? MC.defaultCommissionRate) / 100`
  - `HYBRID`: fixed component + commission component
  - Effective type fallback: `ShowMC.compensationType ?? StudioMc.defaultRateType ?? MC.defaultRateType`
- `shift_cost` = sum of `StudioShift.calculatedCost ?? projectedCost` where shift date falls within the show's date range
- `contribution_margin` = `revenue - mc_cost - shift_cost`

### P&L Views (grouped)

| Method | Path |
|--------|------|
| GET | `/studios/:studioId/economics?group_by=show\|schedule\|client&date_from=...&date_to=...` |

Response: array of `{ group_id, group_name, total_mc_cost, total_shift_cost, total_revenue, contribution_margin, show_count }` plus a `summary` aggregate.

Bulk-loads shows, ShowMC records, ShowPlatform records, and shifts for the date range in parallel (no N+1).

### Group Shift Cost Definition

For grouped P&L rows, shift cost is allocated from the date-window total:

- `total_shift_cost_window = Σ (calculatedCost ?? projectedCost)` for shifts in the window
- `group_shift_cost = total_shift_cost_window × (group_show_count / total_show_count)`
- In API response, this is returned as each row’s `total_shift_cost`

Example:
- Window shift cost = 300
- Group A has 2 shows, Group B has 1 show
- Group A `total_shift_cost` = 200, Group B `total_shift_cost` = 100

Why: this keeps grouped margins comparable without forcing a one-shift-to-one-show attribution model.

### Performance Views (grouped)

| Method | Path |
|--------|------|
| GET | `/studios/:studioId/performance?group_by=show\|schedule\|client&date_from=...&date_to=...` |

Response: array of `{ group_id, group_name, total_viewer_count, total_gmv, total_sales, total_orders }`.

## Key Files

| File | Purpose |
|------|---------|
| `src/studios/studio-economics/studio-economics.controller.ts` | Three economics/performance endpoints |
| `src/studios/studio-economics/studio-economics.service.ts` | Aggregation logic |
| `src/studios/studio-economics/studio-economics.module.ts` | Module (imports ShowModule, ShowMcModule, ShowPlatformModule, StudioMcModelModule, StudioShiftModule) |
| `src/studios/studio-economics/schemas/studio-economics.schema.ts` | Response Zod schemas, `GROUP_BY` constant |
| `src/models/show/show.repository.ts` | `findByStudioAndDateRange` — bulk-load shows by UID |
| `src/models/studio-shift/studio-shift.repository.ts` | `findByShowWindow` — shifts in date window |
| `src/lib/utils/decimal.util.ts` | `decimalToStringOrNull` shared util |

## Design Notes

- All decimal output is serialized as `string | null` (never raw `Decimal` or `number`)
- `group_by=schedule` uses `Show.scheduleId`; `group_by=client` uses `Show.clientId`
- Shift cost attribution for grouped P&L is pro-rata by `group_show_count / total_show_count`
- Fixed costs (rent, equipment) are out of scope; only variable costs (MC fees, shift labor) are included

## Metric Glossary

- `revenue`: GMV total for selected show/group/window.
- `mc_cost`: MC compensation cost based on effective compensation type and rates.
- `shift_cost` (per-show endpoint): full shift cost associated with the show time window.
- `total_shift_cost` (grouped endpoint): allocated share of date-window shift cost for that group.
- `total_variable_cost`: `mc_cost + shift_cost` (per-show endpoint).
- `contribution_margin`: `revenue - variable_cost` for the same scope.
