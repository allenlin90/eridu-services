# PRD: Show Economics & P&L

> **Status**: Draft
> **Phase**: 4 — P&L Visibility & MC Operations
> **Workstream**: 3
> **Depends on**: [MC Mapping](./mc-mapping.md) (MC compensation requires MC-show linkage)

## Problem

The studio has no visibility into show-level profitability. Key questions unanswered today:

- *"What did this show cost us in MC fees and shift labor?"*
- *"What's the P&L for this client this month?"*
- *"Which shows are profitable vs. loss-making?"*
- *"What's the GMV and sales performance by platform for this schedule?"*

Show performance data (views, GMV, sales) and MC compensation are tracked outside the system, making financial analysis manual and unreliable.

## Users

- **Finance**: P&L by show, schedule, client for accounting and forecasting
- **BD / Commerce**: performance metrics for client reporting and pricing decisions
- **Studio admins**: cost visibility for operational planning

## Existing Infrastructure

| Model | Fields | Status |
|-------|--------|--------|
| `StudioShift` | `hourlyRate`, `projectedCost`, `calculatedCost` | ✅ Exists |
| `StudioMembership` | `baseHourlyRate` | ✅ Exists |
| `ShowPlatform` | `viewerCount` | ✅ Exists (no GMV/sales) |
| `MC` / `ShowMC` | No compensation fields | ❌ Gap |

## Requirements

### MC compensation model

1. MC default rate: `MC.defaultHourlyRate` or `MC.defaultFixedFee`
2. Compensation type: enum (`FIXED`, `COMMISSION`, `HYBRID`)
3. Per-show override: `ShowMC.agreedRate`, `ShowMC.compensationType`
4. If per-show rate is null, fall back to MC default
5. Commission rate (percentage) for commission/hybrid types

### Show performance metrics

1. Extend `ShowPlatform` with: `gmv` (Decimal), `sales` (Decimal), `orders` (Int)
2. Manual input via admin/studio endpoints (platform API integration is future)
3. Performance data is per-platform per-show

### Cost aggregation

1. Show-level variable cost = MC costs + shift labor costs
2. MC cost per show: sum of agreed rates for all ShowMC records
3. Shift cost per show: sum of StudioShift costs for shifts overlapping show time window
4. API: `GET /studios/:studioId/shows/:showUid/economics`

### P&L views

1. `GET /studios/:studioId/economics?group_by=show|schedule|client&date_from=...&date_to=...`
2. Per group: total variable cost, total revenue (GMV), contribution margin
3. Filterable by date range, client, show type
4. API-first — frontend P&L dashboard is follow-up

### Performance views

1. `GET /studios/:studioId/performance?group_by=show|schedule|client&date_from=...&date_to=...`
2. Aggregated: total views, total GMV, total sales, total orders
3. Powers BD/commerce reporting

## Acceptance Criteria

- [ ] MC compensation type and rates configurable per MC and per show
- [ ] Show performance metrics (GMV, sales, orders) can be entered per platform
- [ ] Show economics endpoint returns MC cost + shift cost + revenue breakdown
- [ ] P&L view aggregates by show/schedule/client over a date range
- [ ] Performance view aggregates metrics by show/schedule/client

## Product Decisions

- **Variable costs only** — fixed costs (rent, equipment) are future
- **Manual performance input** — platform API integration is future
- **MC rate precedence**: ShowMC.agreedRate overrides MC.defaultRate
- **P&L = revenue (GMV) minus variable cost (MC + shift)**

## Design Reference

- Technical design: TBD → `apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md`
