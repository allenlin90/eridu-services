# PRD: Economics Cost Model (R — Cost Model Review)

> **Status**: 🔲 Active — lock docs-only; no code
> **Phase**: 4 — Post-Wave 1 critical-path gate
> **Workstream**: L-side P&L visibility — canonical cost semantics
> **Gates**: R+ Compensation Line Items, E0 Economics Baseline Merge, 2a Studio Economics Review, 2b Show Planning Export, Wave 3 P&L Revenue Workflow
> **Depends on**: Studio Member Roster ✅ (1c), Studio Creator Roster ✅ (1b), Studio Show Management ✅ (1e); deferred branch [`feat/show-economics-baseline`](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md)

## Purpose

Lock the semantic contract for studio cost computation **before** R+ / E0 / 2a land code that encodes the rules. Every downstream economics document links here for definitions of "projected", "actualized", line-item composition, and nullability behavior. This document is authoritative; if it conflicts with an older doc, this wins and the older doc should be updated.

R is docs-only. It does not introduce endpoints, schemas, or migrations. R+ implements the line-item channel; E0 integrates the semantics into the deferred economics branch; 2a consumes the resulting `cost_state` field in the review workspace.

## Non-Goals

- Revenue (P-side) — Wave 3.
- Automated rule engine for OT/tiered commission/bonus formulas — Phase 5.
- Double-entry ledger or general-ledger export — out of product scope.
- Proration of schedule-scoped or standing/global line items across shows — not in Phase 4.
- Historical budget-vs-actual variance against a frozen plan snapshot — deferred.
- Additive platform cost allocation across multi-platform shows — deferred until show-platform economics exist.

## Terminology

| Term               | Definition                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Show row**       | One row of economics output keyed by a `Show`. Rollups (schedule/client/platform) are aggregations of show rows. |
| **Base cost**      | Resolvable cost from persisted rates and shifts alone — no line items applied.                                   |
| **Line-item cost** | Sum of applicable `CompensationLineItem` records whose scope matches the row grain.                              |
| **Resolved total** | `base + lineItems`. Null if base contains an unresolved input.                                                   |
| **Cost state**     | One of four explicit labels on each row: `PROJECTED`, `ACTUALIZED`, `PARTIAL_ACTUAL`, `UNRESOLVED`.              |
| **Horizon**        | Caller-supplied filter: `future`, `past`, `all`. Splits rows by `Show.endTime` relative to the request time.     |

## 1. Projected → Actualized State Machine

Each show row carries exactly one `cost_state` value. The rules are evaluated in order; the first matching row wins.

| State            | Required conditions                                                                                                                                                                                                           | Meaning                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROJECTED`      | `Show.endTime` > now                                                                                                                                                                                                          | Future or in-flight. Totals use current persisted assignments, rates, and shifts. Line items with `effectiveDate` in the future are included.                                                                   |
| `ACTUALIZED`     | `Show.endTime` ≤ now **AND** every linked `StudioShift` has `calculatedCost` set **AND** every linked `ShowCreator` has a resolvable base cost (`FIXED` / `HOURLY`, or `COMMISSION`/`HYBRID` with revenue resolved in Wave 3) | Fully resolved occurred cost. Safe for accounting roll-up.                                                                                                                                                      |
| `PARTIAL_ACTUAL` | `Show.endTime` ≤ now **AND** one or more inputs still unresolved, but at least one input (shift or creator) is resolved                                                                                                       | Some cost is known; the rest is either pending confirmation (shift still using `projectedCost`) or awaiting Wave 3 (COMMISSION/HYBRID without revenue). Known subtotals are exposed; unresolved ones stay null. |
| `UNRESOLVED`     | `Show.endTime` ≤ now **AND** no input resolves (no shifts exist and all creators are COMMISSION/HYBRID without revenue)                                                                                                       | Edge case. Typically a completed show for which no cost basis is yet knowable. Row surfaces explicitly as unresolved — not as zero.                                                                             |

### Rationale

- Time-based-alone states (just `endTime` passed) would mislabel rows as actual while shifts are still in manager-projected state.
- Human finalize actions were rejected in favor of automatic state derivation to keep the engine stateless and avoid a new confirmation workflow in Phase 4.
- The `PARTIAL_ACTUAL` state exists specifically to keep unresolved creator cost honest until Wave 3 revenue ships.

### Late adjustments after ACTUALIZED

Once a row is `ACTUALIZED`, later edits (e.g., a manager retroactively edits `StudioShift.calculatedCost`) recompute the row to the new value. The state remains `ACTUALIZED`. Phase 4 does **not** snapshot the prior actual. Historical variance is out of scope.

## 2. Resolution Precedence — Base Cost

### Member shift labor

- Per-block cost: `block.calculatedCost ?? block.projectedCost`.
- Attribution: shift blocks attribute to the show they overlap in time.
- If a block spans multiple shows (rare), cost is allocated proportionally by overlap minutes. This is the existing behavior on the deferred branch; R does not change it.

### Creator base cost

Precedence for rate:

1. `ShowCreator.agreedRate` if set for this show
2. `StudioCreator.defaultRate`

Precedence for compensation type:

1. `ShowCreator.compensationType` if set
2. `StudioCreator.defaultRateType`

Rules by compensation type:

| Type         | Resolvable in Phase 4?                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIXED`      | ✅ Rate × 1                                                                                                                                        |
| `HOURLY`     | ✅ Rate × show duration                                                                                                                            |
| `COMMISSION` | ❌ Base stays `null` until Wave 3 revenue                                                                                                          |
| `HYBRID`     | ❌ Base stays `null` until Wave 3 revenue (fixed portion alone is not considered resolved — otherwise the hybrid model leaks an incomplete number) |

`null` base propagates as described in §4.

## 3. Line-Item Composition

Canonical rules for how `CompensationLineItem` records combine with base cost. These supersede any earlier text in `SHOW_ECONOMICS_DESIGN.md` or `compensation-line-items.md` on the same points.

### Item-type semantics (Phase 4)

Phase 4 stores **outcomes, not rules**. All five item types are flat monetary amounts. No item type carries special computation.

| `item_type` | Sign         | Special semantics in Phase 4?                                                                                                                                                                                                          |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BONUS`     | `amount ≥ 0` | None — flat addition                                                                                                                                                                                                                   |
| `ALLOWANCE` | `amount ≥ 0` | None — flat addition                                                                                                                                                                                                                   |
| `OVERTIME`  | `amount ≥ 0` | **None**. Label-only distinction from `BONUS` for reporting filters. No shift-block binding in Phase 4. The Phase 5 Advanced Compensation Engine will *write* `OVERTIME` records as its output; it will not change how R+ stores them. |
| `DEDUCTION` | `amount < 0` | None — flat subtraction                                                                                                                                                                                                                |
| `OTHER`     | Any non-zero | Escape hatch for finance teams. No roll-up categorization beyond "other".                                                                                                                                                              |

### Sign enforcement

- `DEDUCTION` requires `amount < 0`.
- All other types require `amount ≥ 0`.
- Enforced at R+ input validation; already specified in [compensation-line-items.md](./compensation-line-items.md).

### Target-level application

Line items apply to their target first (`MEMBERSHIP` or `STUDIO_CREATOR`), then aggregate upward. **Target subtotals may go negative** when deductions exceed additions — this is intentional. Finance needs the correction to show explicitly rather than being clamped at zero.

Consequence: a creator subtotal of `-$100` is valid and appears in the show row as `-$100`, reducing the show total accordingly.

### Scope → grain attribution

| Line item scope                   | Show row | Schedule row                   | Client row                    | Platform row (Phase 4) |
| --------------------------------- | -------- | ------------------------------ | ----------------------------- | ---------------------- |
| `show_id` set                     | ✅        | ✅ (rolled up through its show) | ✅                             | filter/dimension only  |
| `schedule_id` set, `show_id` null | ❌        | ✅                              | ❌ (not prorated across shows) | ❌                      |
| both null                         | ❌        | ❌                              | ❌                             | ❌                      |

Standing/global items (both scopes null) remain visible in compensation list/breakdown endpoints for the target and date range, but stay **out of economics aggregation** in Phase 4. An explicit allocation policy is a Phase 5 prerequisite for including them.

### Effective date → horizon filter

A line item enters a row's total when its `effectiveDate` falls within the row's effective range:

- Row `cost_state = PROJECTED`: include line items with `effectiveDate ≤ Show.endTime` (or unset, interpreted as "immediate"). Future-dated items that fall within the row's horizon are included — they represent committed future cost.
- Row `cost_state ∈ {ACTUALIZED, PARTIAL_ACTUAL, UNRESOLVED}`: include line items with `effectiveDate ≤ now` (or unset). A future-dated item attached to a past show does not contribute to actual cost until its effective date passes.
- Items with `effectiveDate = null` are treated as immediate/one-off and count as of `createdAt`.

### Line-item subtotal exposure

Rows always surface `line_item_cost` as a distinct field, even when base cost is null. This lets finance see "$200 of known supplemental cost on this creator" without waiting on the unresolved base.

## 4. Nullability Bubbling

Rows must not silently coerce unknown cost to zero. Follow these rules:

### Per-target (creator or member)

| Base                                       | Line items | `base_cost` | `line_item_cost` | `resolved_total_cost`                                              |
| ------------------------------------------ | ---------- | ----------- | ---------------- | ------------------------------------------------------------------ |
| Resolved                                   | Any        | Known       | Known            | `base + lineItems`                                                 |
| `null` (COMMISSION/HYBRID, no revenue yet) | None       | `null`      | `0`              | `null`                                                             |
| `null`                                     | Present    | `null`      | Known subtotal   | `null` — line-item cost is exposed but `resolved_total` stays null |

### Per-show

- Sum resolved targets. If **any** target has `resolved_total_cost = null`, the show's `resolved_total_cost` is also `null`. Row state per §1.
- `projected_total_cost` and `actual_total_cost` (horizon-specific) follow the same rule within their horizon.
- Counts (`creator_count`, `show_count`, unresolved count) never null.

### Per-schedule / per-client / per-platform (rollup grains)

- Rollup totals propagate null: if any child row is null, the rollup is null.
- Rollup responses MUST expose the unresolved child count so the UI can render "2 of 17 shows unresolved" rather than silently hiding the rollup.
- No silent null-to-zero coercion at any level.

This is stricter than a naive `SUM(...)` and matches 2a's acceptance criteria ([studio-economics-review.md L172](./studio-economics-review.md#L172)).

## 5. Response Shape Implications

R doesn't define response schemas (R+/E0 do), but fixes these field-level requirements that E0 must honor:

- `cost_state` — one of the four §1 values. Required on every show row.
- `base_cost` — nullable. Shift + creator base only.
- `line_item_cost` — non-nullable; `0` when no items.
- `resolved_total_cost` — nullable. `null` if any underlying input is unresolved.
- `projected_total_cost` / `actual_total_cost` — nullable; populated only in the matching horizon.
- `unresolved_reason` — optional string array explaining *why* a row or rollup is partial/unresolved (e.g., `["creator:smc_alice:commission_pending_revenue"]`). Drives the UI "explain why" requirement in 2a.

## 6. Worked Examples

### Example A — Fully actualized

- Show ended yesterday.
- Shift block has `calculatedCost = $120`.
- Creator `FIXED`, `agreedRate = $300`.
- One `BONUS` line item on creator, `amount = $50`, `effectiveDate = yesterday`.

Result: `cost_state = ACTUALIZED`, `base = 420`, `line_item_cost = 50`, `resolved_total = 470`.

### Example B — Partial actual, commission creator

- Show ended yesterday.
- Shift block has `calculatedCost = $120`.
- Creator `COMMISSION`, no revenue yet.
- One `BONUS` line item on creator, `amount = $200`, `effectiveDate = yesterday`.

Result: `cost_state = PARTIAL_ACTUAL`, shift base `= 120`, creator base `= null`, `line_item_cost = 200` (visible, split out), creator `resolved_total = null`, show `resolved_total = null`, `unresolved_reason = ["creator:smc_x:commission_pending_revenue"]`.

### Example C — Deduction drives target negative

- Show in future, projected.
- Creator `FIXED`, `agreedRate = $400`.
- One `DEDUCTION` on creator, `amount = -$500`.

Result: `cost_state = PROJECTED`, creator `base = 400`, `line_item_cost = -500`, creator `resolved_total = -100` (intentional, visible in the row), show `resolved_total = -100`.

### Example D — Schedule-scoped line item

- Schedule row aggregates 10 shows; each show resolved to `$400` total.
- One schedule-scoped `ALLOWANCE` on a creator, `schedule_id = sched_x`, `show_id = null`, `amount = $1500`, `effectiveDate = within range`.

Result: schedule `projected_total_cost = 10×400 + 1500 = 5500`. No show row changes (schedule-scoped items never touch show rows). Client row rolling up this schedule includes the `$5500`.

### Example E — Future-dated line item on past show

- Show ended last week.
- Line item `effectiveDate = next week`, `BONUS`, `amount = $100`.

Result: `cost_state = ACTUALIZED` (if other inputs resolve), `line_item_cost = 0` in actualized view (line item effective date > now). The same item counts as `projected` contribution if the caller includes `next week` in their date range; in that case the row's horizon straddles both, and 2a's horizon filter decides visibility.

## 7. Downstream Impact

### R+ Compensation Line Items

- Sign validation: per item_type (§3).
- `OVERTIME` has no shift-binding requirement in Phase 4 (§3).
- Target subtotal may go negative; input validation does NOT clamp (§3).
- `effectiveDate` is the temporal anchor; `createdAt` is the fallback.

### E0 Economics Baseline Merge

- Add `cost_state` field (§1) to both show-level and grouped responses.
- Add `unresolved_reason` field (§5) to rows and rollups.
- Compute `base_cost` / `line_item_cost` / `resolved_total_cost` separately (§4).
- Null-propagate per §4; do not coerce to zero.
- Rebase the branch and ship with R+ integration.

### 2a Studio Economics Review

- Consume `cost_state` to color rows and filter by `cost_state ∈ {ACTUALIZED, PARTIAL_ACTUAL}` when horizon = past, `PROJECTED` when horizon = future.
- Display `unresolved_reason` per row and as a rollup summary ("2 of 17 shows unresolved because…").
- Preflight returns counts by `cost_state`.
- 90-day range cap remains as stated in the 2a PRD.

### 2b Show Planning Export

- Inherits §1 and §2 unchanged. Planning export is future-horizon only → `cost_state = PROJECTED` is the only state it sees.

### Wave 3 P&L Revenue Workflow

- Revenue entry resolves `COMMISSION` / `HYBRID` base cost.
- No other §1–§4 rules change; revenue arrival simply moves rows from `PARTIAL_ACTUAL` → `ACTUALIZED`.
- Contribution margin = `revenue − resolved_total_cost`; null-propagates the same way.

## 8. Edge Cases & Open Items

These are called out so downstream implementers recognize them; R locks the resolution.

- **Shift block spans multiple shows**: existing proportional-overlap allocation retained. R does not change it.
- **Creator removed from a show after it ran**: historical line items remain attributed to the (now-deleted) `ShowCreator`; soft-delete is preserved per compensation-line-items soft-delete rule.
- **Show soft-deleted after actualized**: excluded from aggregation. If a caller needs audit, admin tooling remains the surface. Studio economics excludes soft-deleted rows.
- **Multiple line items on the same target with overlapping effective dates**: all apply additively (no dedup). If a manager enters duplicate records, that is an input-correctness problem, not an aggregation rule.
- **Line item on a target that was later deactivated**: item stays valid (historical cost preserved per R+ PRD). R does not introduce deactivation-scrub behavior.

## 9. Acceptance (for this PRD)

R is complete when:

- [ ] This doc is merged on `master`.
- [ ] [PHASE_4.md](../roadmap/PHASE_4.md) row R links here.
- [ ] [compensation-line-items.md](./compensation-line-items.md) references this doc as the composition authority.
- [ ] [studio-economics-review.md](./studio-economics-review.md) references this doc for `cost_state` and nullability.
- [ ] [pnl-revenue-workflow.md](./pnl-revenue-workflow.md) references this doc for where revenue resolves COMMISSION/HYBRID.
- [ ] [SHOW_ECONOMICS_DESIGN.md](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md) flags this doc as the authoritative update target.

No code verification. R+, E0, and 2a each verify their respective slice when they ship.

## 10. Glossary Anchors

For linking from other docs:

- `#1-projected--actualized-state-machine` — cost state rules
- `#2-resolution-precedence--base-cost` — rate and type precedence
- `#3-line-item-composition` — item type semantics, scope attribution
- `#4-nullability-bubbling` — null propagation rules
- `#5-response-shape-implications` — required fields for E0

## Product Decisions

- **Automatic state derivation, not human finalize.** Transitions happen from data alone (end time, `calculatedCost`, creator resolvability). Keeps the engine stateless and avoids a finalize workflow in Phase 4.
- **OT is label-only in Phase 4.** No shift binding. The Phase 5 rule engine will produce `OVERTIME` records as its output without changing storage semantics.
- **DEDUCTION applies at target level; target cost can go negative.** Finance-faithful; the correction is visible rather than clamped.
- **Line-item subtotals always exposed, even when base is null.** Keeps known supplemental cost visible during COMMISSION/HYBRID pending-revenue states.
- **Null propagates through rollups.** No silent zero-coercion at any grain. Partial-count surfaces explicitly to the UI.
- **Phase 4 stores outcomes, not rules.** Rule engine, proration, allocation policies are all Phase 5.

## Design Reference

- R+ Compensation Line Items: [compensation-line-items.md](./compensation-line-items.md)
- E0 Economics Baseline: [docs/features/show-economics.md](../features/show-economics.md), [SHOW_ECONOMICS_DESIGN.md](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md)
- 2a Studio Economics Review: [studio-economics-review.md](./studio-economics-review.md)
- 2b Show Planning Export: [show-planning-export.md](./show-planning-export.md)
- Wave 3 P&L Revenue: [pnl-revenue-workflow.md](./pnl-revenue-workflow.md)
- Phase 4 Roadmap: [PHASE_4.md](../roadmap/PHASE_4.md)
