# PRD: P&L Revenue Workflow

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: P&L revenue ("P") side — completing the P&L model
> **Depends on**: Show Economics baseline — ✅ **Complete** (commit `8de31ffe`), Studio Creator Roster PRD (compensation defaults should be studio-operator-managed before revenue inputs matter)

## Problem

The economics endpoints (`GET /studios/:studioId/shows/:showId/economics` and `GET /studios/:studioId/economics`) are marked `@preview` because they return `null` computed cost for `COMMISSION` and `HYBRID` creator types — no revenue data exists to calculate commission-based fees. The P&L model shows only costs with no revenue line, making contribution margin and full profitability analysis impossible.

Key questions unanswered today:

- *"What is the contribution margin for this show after creator and shift costs?"*
- *"Which shows are profitable vs. loss-making after commission payouts?"*
- *"What is the total revenue this studio generated this month across all platforms?"*
- *"What did this creator earn in commissions on this show?"*

`ShowPlatform.viewerCount` exists, but no GMV or net sales fields have been added. The economics service is already architected to accept revenue as input — it simply has no data source.

## Users

- **Studio ADMIN**: enter and review revenue data per show-platform; view contribution margin
- **Finance**: P&L by show, schedule, and client for accounting and forecasting; removes the `@preview` blocker
- **BD / Commerce**: performance metrics for client reporting and pricing decisions

## Existing Infrastructure

| Model / Endpoint | Fields / Behavior | Status |
| --- | --- | --- |
| `ShowPlatform` | `viewerCount` (no GMV/sales yet) | ✅ Exists (partial) |
| `GET /studios/:studioId/shows/:showId/economics` | Returns variable costs; `@preview`; commission costs null without revenue | ✅ Exists (`@preview`) |
| `GET /studios/:studioId/economics` | Grouped economics; `@preview` | ✅ Exists (`@preview`) |
| Economics service | Revenue parameter accepted; commission cost calculation logic exists but dormant | ✅ Exists (dormant) |
| `ShowCreator.commissionRate` / `Creator.defaultCommissionRate` | Commission rate inputs; drive commission cost once revenue is known | ✅ Exists |

## Requirements

### In Scope

1. **Add GMV and net sales fields to the show platform data model** — persist gross merchandise value (GMV) and net sales per `ShowPlatform` record. The exact data model (extension of `ShowPlatform` vs. new `ShowPlatformMetrics` table) is an open design question — see below.

2. **Revenue input UI** — ADMIN can enter GMV and net sales values on the show platform form in the studio app (`erify_studios`). Inputs are per-platform per show, reflecting that a show may stream on multiple platforms with different revenue figures.

3. **Economics endpoint uses revenue to compute COMMISSION/HYBRID creator costs** — once revenue is present for a show-platform, the economics service calculates commission-based creator fees using `ShowCreator.commissionRate` → `Creator.defaultCommissionRate` precedence. The existing computation logic is activated.

4. **Remove `@preview` markers** — once revenue input is live and commission cost computation is functional, remove the `@preview` annotation from both economics endpoints.

5. **Contribution margin calculation** — economics response includes `contribution_margin = total_revenue - total_variable_cost`. Margin is null when revenue is absent (not entered yet).

### Out of Scope

- Tiered or volume-based commission formulas — deferred to a future compensation engine phase
- Bonus / OT / post-show cost adjustments — tracked in ideation; additive cost items are a separate model
- Platform API import (automated revenue ingestion from TikTok, YouTube, Shopee, etc.)
- Full revenue audit trail / correction history
- Fixed cost lines (rent, equipment) in the P&L model

## Open Design Questions

These must be resolved before technical design begins. They are documented here to ensure implementation is not started without explicit decisions.

### 1. Revenue data model: `ShowPlatform` extension vs. `ShowPlatformMetrics` table

**Option A — Extend `ShowPlatform`**: add `gmv` and `net_sales` typed columns directly.
- Pro: simple, no join needed, consistent with existing `viewerCount` approach.
- Con: no support for corrections over time, no audit trail for revenue updates, `ShowPlatform` conflates stream configuration with financial outcomes.

**Option B — Separate `ShowPlatformMetrics` table**: new table linked to `ShowPlatform` with financial metric columns.
- Pro: clean separation of stream configuration vs. financial data; corrections are modeled as new records or updates to a dedicated financial record; enables future audit trail.
- Con: additional join in economics queries; more migration surface area.

**Decision required from product/engineering before implementation.**

### 2. Platform-specific metric differences

Different platforms report different revenue signals: TikTok has gifting revenue, YouTube has super chats and channel memberships, Shopee has ad revenue and commission. Some of these do not map to a simple GMV + net sales model.

**Options**: typed columns per known platform type vs. a `metadata: Json` overflow field for platform-specific signals.

**Decision required from product: which platform-specific metrics must be queryable vs. which can live in metadata.**

### 3. Revenue input workflow

Who enters revenue and when?

- **Post-show manual entry** (simplest): studio admin enters GMV/sales figures after a show concludes.
- **Real-time entry**: operator enters running totals during the show.
- **Platform API import** (out of scope for this PRD but the model must not preclude it).

**Decision required: post-show manual entry is the assumed workflow for this PRD. Confirm before technical design.**

### 4. Numerical precision

Current economics calculations use standard JavaScript `number` arithmetic for financial values. Before P&L is treated as production-grade financial reporting, all financial arithmetic (rates, costs, revenue, margins) must be computed using `big.js`-backed helpers to eliminate floating-point accumulation errors.

**Decision required: confirm `big.js` adoption mandate as a blocking prerequisite for this PRD, or explicitly accept floating-point risk as a deferred debt item.**

## Acceptance Criteria

- [ ] GMV and net sales values are persisted per show-platform record.
- [ ] Studio ADMIN can enter GMV and net sales via the show platform form in `erify_studios`.
- [ ] Economics endpoint returns non-null commission creator cost when revenue is present for the show-platform.
- [ ] Economics endpoint returns contribution margin (`revenue - total_variable_cost`) when revenue is present; null otherwise.
- [ ] `COMMISSION` and `HYBRID` creator costs correctly reflect `commissionRate × revenue` using the rate precedence chain.
- [ ] `@preview` markers removed from both economics endpoints once revenue workflow is live.
- [ ] Revenue-absent shows continue to show null commission cost with a `compensation_type` indicator — no regression on existing behavior.
- [ ] All four open design questions above resolved and recorded in the technical design doc before implementation starts.

## Product Decisions

- **Revenue absence is not an error** — shows without revenue input continue to work; commission costs remain null. The `@preview` marker is removed only after the input workflow is live, not merely after the model is deployed.
- **Per-platform revenue** — revenue is tracked per `ShowPlatform` record, not as a single show-level aggregate, because different platforms may have materially different revenue figures for the same broadcast.
- **Contribution margin is derived, not stored** — margin is computed at query time from revenue and cost components. It is not persisted.
- **Rate precedence unchanged** — `ShowCreator.commissionRate` → `Creator.defaultCommissionRate`. This PRD does not alter the precedence chain.

## Design Reference

- Economics baseline: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Frontend P&L: `apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md`
- Business domain definitions: `docs/domain/BUSINESS.md` (GMV vs. sales distinction should be formally defined here before implementation)
- Studio creator roster PRD: `docs/prd/studio-creator-roster.md` (prerequisite: compensation defaults should be operator-managed before revenue inputs are prioritized)
