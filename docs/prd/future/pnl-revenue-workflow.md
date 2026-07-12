# PRD: P&L Revenue Workflow (4.1)

> **Status: Future target.** This document predates [Phase 4's simplified read-only cost reference viewer](../../domain/economics-cost-model.md). Treat it as future-feature context, not a Phase 4 close requirement. Redraft it when revenue planning restarts. Where this document conflicts with [`economics-cost-model.md`](../../domain/economics-cost-model.md) or the Phase 4 task-input actuals plan, the Phase 4 cost model and roadmap win.

> **Status**: ⏭️ Future target
> **Phase**: Future P&L workstream after simplified Phase 4
> **Workstream**: P&L revenue ("P") side — completing the P&L model. Resolves the `COMMISSION` / `HYBRID` commission portion that remains pending in Phase 4.
> **Depends on**: Studio Creator Roster ✅ ([feature](../../features/studio-creator-roster.md)) · Economics Cost Model ✅ ([contract](../../domain/economics-cost-model.md)) · Compensation Line Items + Actuals ✅ · Costs Dashboard ✅
> **Canonical semantics**: [economics-cost-model.md](../../domain/economics-cost-model.md) — commission components remain unresolved without revenue; future revenue work must use the snapshotted `commissionRate` and the cost model's null-bubbling contract. Platform-scoped operational facts such as GMV, views, and violation records do not define financial revenue semantics, net sales, contribution margin, or commission resolution.

## Problem

After the simplified Phase 4 cost stack ships, `COMMISSION` creators and the commission portion of `HYBRID` creators remain unresolved (`cost = null` with `unresolved_reasons`) because no revenue data exists to apply against the snapshotted `commissionRate`. The P&L model shows only costs with no revenue line, making contribution margin and full profitability analysis impossible.

Key questions unanswered today:

- *"What is the contribution margin for this show after creator and shift costs?"*
- *"Which shows are profitable vs. loss-making after commission payouts?"*
- *"What is the total revenue this studio generated this month across all platforms?"*
- *"What did this creator earn in commissions on this show?"*

`ShowPlatform.viewerCount` exists, and Phase 4 may add task-sourced platform GMV/views plus platform violation records. Those facts are operational performance inputs, not a complete revenue workflow. The economics service is already architected to accept revenue as input, but future revenue planning still needs to define financial revenue semantics such as net sales, revenue corrections, and commission resolution.

## Users

- **Studio ADMIN**: enter and review revenue data per show-platform; view contribution margin
- **Finance**: P&L by show, schedule, and client for accounting and forecasting; removes the `@preview` blocker
- **BD / Commerce**: performance metrics for client reporting and pricing decisions

## Existing Infrastructure

| Model / Endpoint                                 | Fields / Behavior                                                          | Status             |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------ |
| `ShowPlatform`                                   | `viewerCount` exists; Phase 4 task extraction may add platform-scoped GMV/views and violation child records; net sales, CTR/CTO promotion, and revenue correction policy remain future scope | ✅ Exists (partial) |
| `GET /studios/:studioId/shows/:showId/economics` | Built by 2.3; returns cost; commission rows remain nullable until revenue  | 🔲 Built by 2.3     |
| `GET /studios/:studioId/economics`               | Built by 2.3; grouped read                                                 | 🔲 Built by 2.3     |
| `ShowCreator.commissionRate`                     | Assignment snapshot commission rate; this future PRD applies it to revenue | ✅ Exists           |
| `StudioCreator.defaultCommissionRate`            | Default fallback (used at agreement time, not at revenue time)             | ✅ Exists           |

## Requirements

### In Scope

1. **Define financial revenue fields on top of platform performance facts** — if Phase 4 has already added platform-scoped GMV and views, decide whether the revenue workflow reuses GMV as an input, adds net sales and revenue-specific fields to `ShowPlatform`, or introduces a dedicated `ShowPlatformMetrics` / revenue record. The exact data model is an open design question — see below.

2. **Revenue input UI** — ADMIN can enter or review revenue values on a per-platform per-show surface in the studio app (`erify_studios`). Inputs are per `ShowPlatform`, reflecting that a show may stream on multiple platforms with different revenue figures. If Phase 4 task submissions already produce GMV, this UI consumes or reconciles that fact instead of creating a second anonymous input.

3. **Economics service applies revenue to compute `COMMISSION` / `HYBRID`-commission creator costs** — once revenue is present for a show-platform, the engine multiplies revenue by the snapshotted `ShowCreator.commissionRate` to compute commission cost. `StudioCreator.defaultCommissionRate` is never read at this stage — only the per-show assignment snapshot.

4. **Contribution margin calculation** — economics response includes `contribution_margin = total_revenue - resolved_total_cost`. Margin is null when revenue is absent (per [cost-model rollup semantics](../../domain/economics-cost-model.md#null-bubbling-at-rollup-grains)).

5. **Nullable cost resolution** — when revenue resolves the last unresolved input on a row, `cost` becomes non-null and the relevant `unresolved_reasons` disappear. The simplified Phase 4 model does not persist a `cost_state`.

### Out of Scope

- Tiered or volume-based commission formulas — deferred to a future compensation engine phase
- Bonus / OT / post-show cost adjustments — tracked in ideation; additive cost items are a separate model
- Platform API import (automated revenue ingestion from TikTok, YouTube, Shopee, etc.), except where Phase 4 already records manually entered seller-center facts through task submissions
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

**Recommended decision**: keep Phase 4's typed `gmv` and view-count fields on `ShowPlatform`, then add revenue-specific fields such as `net_sales` only when the revenue workflow starts. Platform-specific breakdowns (gifting, super chats, ad revenue) can stay in metadata or a metrics child model until a specific signal becomes a business-critical query dimension. Metrics such as CTR/CTO should be promoted by a later migration, not bundled into the Phase 4 task-input work.

### 3. Revenue input workflow

Who enters revenue and when?

**Recommended decision**: **Post-show manual entry** (confirmed as MVP workflow). Studio ADMIN enters GMV/sales figures after a show concludes. The data model must not preclude future platform API import, but automated ingestion is out of scope. Real-time entry adds complexity (partial data, race conditions) without clear product value for v1.

### 4. Numerical precision

**Resolved by [Finance Guardrail #2](../../engineering/FINANCE_GUARDRAILS.md).** All financial arithmetic uses `Prisma.Decimal` (backed by `decimal.js`, already in `@prisma/client`) end-to-end. No `Number` / `toFixed(2)` chains in aggregation paths. Future revenue work inherits this rule — no separate decision needed.

## Backwards Compatibility

- Shows without revenue input continue to work unchanged — commission costs remain `null`, contribution margin is `null`.
- The `@preview` markers are removed only after the revenue input workflow is live and validated, not merely after the data model is deployed.
- Revenue-absent shows in economics responses include `compensation_type` indicator so consumers can distinguish "FIXED with no revenue needed" from "COMMISSION with revenue pending".
- Grouped economics endpoint aggregation handles mixed shows (some with revenue, some without) — null revenue shows are excluded from margin aggregation, not treated as zero.

## Acceptance Criteria

- [ ] Financial revenue fields, including net sales, are persisted or resolved per show-platform record.
- [ ] Studio ADMIN can enter or review revenue values via a per-platform show surface in `erify_studios`, reusing Phase 4 typed performance facts where applicable.
- [ ] Economics endpoint returns non-null commission creator cost when revenue is present for the show-platform, computed against the snapshotted `ShowCreator.commissionRate`.
- [ ] Economics endpoint returns contribution margin (`revenue - resolved_total_cost`) when revenue is present; null otherwise.
- [ ] `COMMISSION` and `HYBRID`-commission creator costs correctly reflect `snapshotted commissionRate × revenue`.
- [ ] Revenue-absent shows keep nullable commission cost and explicit `unresolved_reasons` — no regression on Phase 4 cost behavior.
- [ ] When revenue is the last unresolved input, `cost` becomes non-null and commission-related `unresolved_reasons` clear.
- [ ] All open design questions above resolved and recorded in the technical design doc before implementation starts.

## Product Decisions

- **Revenue absence is not an error** — shows without revenue input keep nullable commission cost for COMMISSION / HYBRID-commission creators.
- **Per-platform revenue** — revenue is tracked per `ShowPlatform` record, not as a single show-level aggregate, because different platforms may have materially different revenue figures for the same broadcast.
- **Platform performance is not creator attendance** — platform stream timing, GMV, views, and similar performance facts are scoped to `ShowPlatform` or a dedicated platform metrics child model. Platform violations are child records because one stream can have many violations. Creator-specific actual attendance belongs to `ShowCreator`.
- **Contribution margin is derived, not stored** — computed at query time from revenue and cost components. Not persisted.
- **Commission rate is snapshotted, not read live** — future revenue work multiplies revenue by the rate persisted on `ShowCreator.commissionRate`. `StudioCreator.defaultCommissionRate` is never read at revenue resolution time.

## Design Reference

Future revenue design drafts were removed because revenue is no longer required to close Phase 4 and must be redrafted when revenue planning restarts.

- Cost semantics: [`economics-cost-model.md`](../../domain/economics-cost-model.md)
- Shipped cost workflow: [`post-production-costs.md`](../../features/post-production-costs.md)
- Business domain definitions: [`BUSINESS.md`](../../domain/BUSINESS.md) (GMV vs. sales distinction should be formally defined here before implementation)
- Phase 4 roadmap: [`PHASE_4.md`](../../roadmap/PHASE_4.md)
