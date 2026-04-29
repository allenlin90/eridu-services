# PRD: P&L Revenue Workflow (4.1)

> **Status: Future target.** This document was drafted before [Phase 4 was simplified to a read-only cost reference viewer](./economics-cost-model.md). Treat it as future-feature context, not a Phase 4 close requirement. It must be redrafted when revenue planning restarts. Where this document conflicts with [`economics-cost-model.md`](./economics-cost-model.md), the cost model wins for Phase 4 scope.

> **Status**: ⏭️ Future target
> **Phase**: Future P&L workstream after simplified Phase 4
> **Workstream**: P&L revenue ("P") side — completing the P&L model. Resolves the `COMMISSION` / `HYBRID` commission portion that remains pending in Phase 4.
> **Depends on**: 1.2 Studio Creator Roster ✅ ([feature](../features/studio-creator-roster.md)) · 2.1 Economics Cost Model 🔲 ([PRD](./economics-cost-model.md)) · 2.2 Compensation Line Items + Actuals 🔲 · 2.3 Economics Service 🔲 · 3.1 Studio Economics Review 🔲
> **Canonical semantics**: [economics-cost-model.md](./economics-cost-model.md) — Phase 4 leaves commission components unresolved; future revenue work must use the snapshotted `commissionRate` and the cost model's null-bubbling contract.

## Problem

After the simplified Phase 4 cost stack ships, `COMMISSION` creators and the commission portion of `HYBRID` creators remain unresolved (`cost = null` with `unresolved_reasons`) because no revenue data exists to apply against the snapshotted `commissionRate`. The P&L model shows only costs with no revenue line, making contribution margin and full profitability analysis impossible.

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
| `GET /studios/:studioId/shows/:showId/economics`          | Built by 2.3; returns cost; commission rows remain nullable until revenue      | 🔲 Built by 2.3         |
| `GET /studios/:studioId/economics`                        | Built by 2.3; grouped read                                                     | 🔲 Built by 2.3         |
| `ShowCreator.commissionRate`                              | Assignment snapshot commission rate; this future PRD applies it to revenue     | ✅ Exists               |
| `StudioCreator.defaultCommissionRate`                     | Default fallback (used at agreement time, not at revenue time)                 | ✅ Exists               |

## Requirements

### In Scope

1. **Add GMV and net sales fields to the show platform data model** — persist gross merchandise value (GMV) and net sales per `ShowPlatform` record. The exact data model (extension of `ShowPlatform` vs. new `ShowPlatformMetrics` table) is an open design question — see below.

2. **Revenue input UI** — ADMIN can enter GMV and net sales values on the show platform form in the studio app (`erify_studios`). Inputs are per-platform per show, reflecting that a show may stream on multiple platforms with different revenue figures.

3. **Economics service applies revenue to compute `COMMISSION` / `HYBRID`-commission creator costs** — once revenue is present for a show-platform, the engine multiplies revenue by the snapshotted `ShowCreator.commissionRate` to compute commission cost. `StudioCreator.defaultCommissionRate` is never read at this stage — only the per-show assignment snapshot.

4. **Contribution margin calculation** — economics response includes `contribution_margin = total_revenue - resolved_total_cost`. Margin is null when revenue is absent (per [cost-model §7](./economics-cost-model.md#7-nullability-bubbling) null-bubbling).

5. **Nullable cost resolution** — when revenue resolves the last unresolved input on a row, `cost` becomes non-null and the relevant `unresolved_reasons` disappear. The simplified Phase 4 model does not persist a `cost_state`.

### Out of Scope

- Tiered or volume-based commission formulas — deferred to a future compensation engine phase
- Bonus / OT / post-show cost adjustments — tracked in ideation; additive cost items are a separate model
- Platform API import (automated revenue ingestion from TikTok, YouTube, Shopee, etc.)
- Full revenue audit trail / correction history
- Fixed cost lines (rent, equipment) in the P&L model

## Open Design Questions (Future Revenue Gate)

These must be resolved before technical design begins. Implementation is blocked until all four decisions are recorded. Recommended decisions are provided below — confirm or override before future revenue work starts.

> **Sequencing note**: These questions can wait until the simplified Phase 4 cost stack is confirmed.

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

**Resolved by [Phase 4 Architecture Guardrail 2](../roadmap/PHASE_4.md#architecture-guardrails).** All financial arithmetic uses `Prisma.Decimal` (backed by `decimal.js`, already in `@prisma/client`) end-to-end. No `Number` / `toFixed(2)` chains in aggregation paths. Future revenue work inherits this rule from 2.2 / 2.3 — no separate decision needed.

## Backwards Compatibility

- Shows without revenue input continue to work unchanged — commission costs remain `null`, contribution margin is `null`.
- The `@preview` markers are removed only after the revenue input workflow is live and validated, not merely after the data model is deployed.
- Revenue-absent shows in economics responses include `compensation_type` indicator so consumers can distinguish "FIXED with no revenue needed" from "COMMISSION with revenue pending".
- Grouped economics endpoint aggregation handles mixed shows (some with revenue, some without) — null revenue shows are excluded from margin aggregation, not treated as zero.

## Acceptance Criteria

- [ ] GMV and net sales values are persisted per show-platform record.
- [ ] Studio ADMIN can enter GMV and net sales via the show platform form in `erify_studios`.
- [ ] Economics endpoint returns non-null commission creator cost when revenue is present for the show-platform, computed against the snapshotted `ShowCreator.commissionRate`.
- [ ] Economics endpoint returns contribution margin (`revenue - resolved_total_cost`) when revenue is present; null otherwise.
- [ ] `COMMISSION` and `HYBRID`-commission creator costs correctly reflect `snapshotted commissionRate × revenue`.
- [ ] Revenue-absent shows keep nullable commission cost and explicit `unresolved_reasons` — no regression on Phase 4 cost behavior.
- [ ] When revenue is the last unresolved input, `cost` becomes non-null and commission-related `unresolved_reasons` clear.
- [ ] All open design questions above resolved and recorded in the technical design doc before implementation starts.

## Product Decisions

- **Revenue absence is not an error** — shows without revenue input keep nullable commission cost for COMMISSION / HYBRID-commission creators.
- **Per-platform revenue** — revenue is tracked per `ShowPlatform` record, not as a single show-level aggregate, because different platforms may have materially different revenue figures for the same broadcast.
- **Contribution margin is derived, not stored** — computed at query time from revenue and cost components. Not persisted.
- **Commission rate is snapshotted, not read live** — future revenue work multiplies revenue by the rate persisted on `ShowCreator.commissionRate`. `StudioCreator.defaultCommissionRate` is never read at revenue resolution time.

## Design Reference

- 2.1 Cost Model: [`economics-cost-model.md`](./economics-cost-model.md)
- 2.2 Compensation Line Items + Actuals: [`compensation-line-items.md`](./compensation-line-items.md)
- 2.3 Economics Service: [`economics-service.md`](./economics-service.md)
- 2.3 Backend Design: [`SHOW_ECONOMICS_DESIGN.md`](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md)
- 3.1 Studio Economics Review: [`studio-economics-review.md`](./studio-economics-review.md)
- 4.1 Backend design: [`PNL_REVENUE_WORKFLOW_DESIGN.md`](../../apps/erify_api/docs/design/PNL_REVENUE_WORKFLOW_DESIGN.md)
- 4.1 Frontend design: [`PNL_REVENUE_WORKFLOW_DESIGN.md`](../../apps/erify_studios/docs/design/PNL_REVENUE_WORKFLOW_DESIGN.md)
- Business domain definitions: [`docs/domain/BUSINESS.md`](../domain/BUSINESS.md) (GMV vs. sales distinction should be formally defined here before implementation)
- Phase 4 roadmap: [`PHASE_4.md`](../roadmap/PHASE_4.md)
