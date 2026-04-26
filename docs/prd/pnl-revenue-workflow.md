# PRD: P&L Revenue Workflow (4.1)

> **Status: Visioning.** This document was drafted before [Phase 4 was simplified to a read-only viewer](./economics-cost-model.md). Treat as roadmap and future-feature reference, not a committed design — it will be redrafted when this workstream activates. Where this document conflicts with [`economics-cost-model.md`](./economics-cost-model.md), the cost model wins for Phase 4 scope.

> **Status**: 🔲 Planned
> **Phase**: 4 — Wave 4 (P&L Complete)
> **Workstream**: P&L revenue ("P") side — completing the P&L model. Resolves the `COMMISSION` / `HYBRID` commission portion that 2.1 leaves pending.
> **Depends on**: 1.2 Studio Creator Roster ✅ ([feature](../features/studio-creator-roster.md)) · 2.1 Economics Cost Model 🔲 ([PRD](./economics-cost-model.md)) · 2.2 Compensation Line Items + Freeze + Actuals 🔲 · 2.3 Economics Service 🔲 · 3.1 Studio Economics Review 🔲 (this PRD extends the same engine)
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) — revenue entry resolves `COMMISSION` and the `HYBRID` commission portion, applying the **frozen** `commissionRate` to revenue and promoting rows from `PARTIAL_ACTUAL` → `ACTUALIZED` per [§11](./economics-cost-model.md#11-downstream-impact). Contribution margin = `revenue − resolved_total_cost`, null-propagating per [§7](./economics-cost-model.md#7-nullability-bubbling).

## Problem

After Wave 2 ships, `COMMISSION` creators and the commission portion of `HYBRID` creators remain unresolved (`PARTIAL_ACTUAL`) because no revenue data exists to apply against the frozen `commissionRate`. The P&L model shows only costs with no revenue line, making contribution margin and full profitability analysis impossible.

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

| Model / Endpoint                                          | Fields / Behavior                                                              | Status                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------- |
| `ShowPlatform`                                            | `viewerCount` (no GMV/sales yet)                                               | ✅ Exists (partial)     |
| `GET /studios/:studioId/shows/:showId/economics`          | Built by 2.3; returns cost; commission rows are `PARTIAL_ACTUAL` until revenue | 🔲 Built by 2.3         |
| `GET /studios/:studioId/economics`                        | Built by 2.3; grouped read                                                     | 🔲 Built by 2.3         |
| `ShowCreator.commissionRate` (frozen at show-end via 2.2) | Frozen commission rate; this PRD applies it to revenue                         | ✅ Frozen by 2.2 freeze |
| `StudioCreator.defaultCommissionRate`                     | Default fallback (used at agreement time, not at revenue time)                 | ✅ Exists               |

## Requirements

### In Scope

1. **Add GMV and net sales fields to the show platform data model** — persist gross merchandise value (GMV) and net sales per `ShowPlatform` record. The exact data model (extension of `ShowPlatform` vs. new `ShowPlatformMetrics` table) is an open design question — see below.

2. **Revenue input UI** — ADMIN can enter GMV and net sales values on the show platform form in the studio app (`erify_studios`). Inputs are per-platform per show, reflecting that a show may stream on multiple platforms with different revenue figures.

3. **Economics service applies revenue to compute `COMMISSION` / `HYBRID`-commission creator costs** — once revenue is present for a show-platform, the engine multiplies revenue by the **frozen** `ShowCreator.commissionRate` (set at show-end by 2.2's freeze rule) to compute commission cost. `StudioCreator.defaultCommissionRate` is never read at this stage — only the frozen per-show rate.

4. **Contribution margin calculation** — economics response includes `contribution_margin = total_revenue - resolved_total_cost`. Margin is null when revenue is absent (per [cost-model §7](./economics-cost-model.md#7-nullability-bubbling) null-bubbling).

5. **Row state transitions** — when revenue resolves the last unresolved input on a row, `cost_state` transitions from `PARTIAL_ACTUAL` to `ACTUALIZED`.

### Out of Scope

- Tiered or volume-based commission formulas — deferred to a future compensation engine phase
- Bonus / OT / post-show cost adjustments — tracked in ideation; additive cost items are a separate model
- Platform API import (automated revenue ingestion from TikTok, YouTube, Shopee, etc.)
- Full revenue audit trail / correction history
- Fixed cost lines (rent, equipment) in the P&L model

## Open Design Questions (Wave 4 Gate)

These must be resolved before technical design begins. Implementation is blocked until all four decisions are recorded. Recommended decisions are provided below — confirm or override before Wave 4 starts.

> **Sequencing note**: These questions should be resolved during Wave 2/3 implementation so Wave 4 can start without delay.

### 1. Revenue data model: `ShowPlatform` extension vs. `ShowPlatformMetrics` table

**Option A — Extend `ShowPlatform`** (recommended): add `gmv` and `netSales` typed columns directly.
- Pro: simple, no join needed, consistent with existing `viewerCount` approach.
- Con: no support for corrections over time, no audit trail for revenue updates, `ShowPlatform` conflates stream configuration with financial outcomes.

**Option B — Separate `ShowPlatformMetrics` table**: new table linked to `ShowPlatform` with financial metric columns.
- Pro: clean separation of stream configuration vs. financial data; corrections are modeled as new records or updates to a dedicated financial record; enables future audit trail.
- Con: additional join in economics queries; more migration surface area.

**Recommended decision**: Option A. MVP scope does not require revenue correction history. The `metadata` field on `ShowPlatform` can hold an optional `revenue_notes` string for free-text context. If audit trail becomes a hard requirement, Option B can be migrated to without breaking the API contract.

### 2. Platform-specific metric differences

Different platforms report different revenue signals: TikTok has gifting revenue, YouTube has super chats and channel memberships, Shopee has ad revenue and commission. Some of these do not map to a simple GMV + net sales model.

**Recommended decision**: typed columns for `gmv` and `net_sales` (universal across platforms). Platform-specific breakdowns (gifting, super chats, ad revenue) stored in `ShowPlatform.metadata` JSON. These platform-specific signals are informational, not queryable in economics aggregation. If a specific platform metric becomes a business-critical query dimension, promote it to a typed column in a future migration.

### 3. Revenue input workflow

Who enters revenue and when?

**Recommended decision**: **Post-show manual entry** (confirmed as MVP workflow). Studio ADMIN enters GMV/sales figures after a show concludes. The data model must not preclude future platform API import, but automated ingestion is out of scope. Real-time entry adds complexity (partial data, race conditions) without clear product value for v1.

### 4. Numerical precision

**Resolved by [Phase 4 Architecture Guardrail 2](../roadmap/PHASE_4.md#architecture-guardrails).** All financial arithmetic uses `Prisma.Decimal` (backed by `decimal.js`, already in `@prisma/client`) end-to-end. No `Number` / `toFixed(2)` chains in aggregation paths. 4.1 inherits this rule from 2.2 / 2.3 — no separate decision needed.

## Backwards Compatibility

- Shows without revenue input continue to work unchanged — commission costs remain `null`, contribution margin is `null`.
- The `@preview` markers are removed only after the revenue input workflow is live and validated, not merely after the data model is deployed.
- Revenue-absent shows in economics responses include `compensation_type` indicator so consumers can distinguish "FIXED with no revenue needed" from "COMMISSION with revenue pending".
- Grouped economics endpoint aggregation handles mixed shows (some with revenue, some without) — null revenue shows are excluded from margin aggregation, not treated as zero.

## Acceptance Criteria

- [ ] GMV and net sales values are persisted per show-platform record.
- [ ] Studio ADMIN can enter GMV and net sales via the show platform form in `erify_studios`.
- [ ] Economics endpoint returns non-null commission creator cost when revenue is present for the show-platform, computed against the **frozen** `ShowCreator.commissionRate`.
- [ ] Economics endpoint returns contribution margin (`revenue - resolved_total_cost`) when revenue is present; null otherwise.
- [ ] `COMMISSION` and `HYBRID`-commission creator costs correctly reflect `frozen commissionRate × revenue`.
- [ ] Revenue-absent shows remain `PARTIAL_ACTUAL` (commission portion null) — no regression on Wave 2 behavior.
- [ ] When revenue is the last unresolved input, `cost_state` transitions to `ACTUALIZED`.
- [ ] All open design questions above resolved and recorded in the technical design doc before implementation starts.

## Product Decisions

- **Revenue absence is not an error** — shows without revenue input remain `PARTIAL_ACTUAL` for COMMISSION / HYBRID-commission creators. The cost-state transition to `ACTUALIZED` happens only when revenue arrives.
- **Per-platform revenue** — revenue is tracked per `ShowPlatform` record, not as a single show-level aggregate, because different platforms may have materially different revenue figures for the same broadcast.
- **Contribution margin is derived, not stored** — computed at query time from revenue and cost components. Not persisted.
- **Commission rate is frozen at show-end, not read live** — 4.1 multiplies revenue by the rate snapshotted on `ShowCreator.commissionRate` by 2.2's freeze rule. `StudioCreator.defaultCommissionRate` is never read at revenue resolution time.

## Design Reference

- 2.1 Cost Model: [`economics-cost-model.md`](./economics-cost-model.md)
- 2.2 Compensation Line Items + Freeze + Actuals: [`compensation-line-items.md`](./compensation-line-items.md)
- 2.3 Economics Service: [`SHOW_ECONOMICS_DESIGN.md`](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md)
- 3.1 Studio Economics Review: [`studio-economics-review.md`](./studio-economics-review.md)
- 4.1 Backend design: [`PNL_REVENUE_WORKFLOW_DESIGN.md`](../../apps/erify_api/docs/design/PNL_REVENUE_WORKFLOW_DESIGN.md)
- 4.1 Frontend design: [`PNL_REVENUE_WORKFLOW_DESIGN.md`](../../apps/erify_studios/docs/design/PNL_REVENUE_WORKFLOW_DESIGN.md)
- Business domain definitions: [`docs/domain/BUSINESS.md`](../domain/BUSINESS.md) (GMV vs. sales distinction should be formally defined here before implementation)
- Phase 4 roadmap: [`PHASE_4.md`](../roadmap/PHASE_4.md)
