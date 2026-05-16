# Phase 4: P&L Visibility & Creator Operations

> **Status**: 🚧 Active — Wave 1 shipped; cost model locked; 2.2 Tasks 1-6 merged; 9 PRs remaining.
> **Last updated**: 2026-05-16
> **Cost contract**: [`docs/domain/economics-cost-model.md`](../domain/economics-cost-model.md) — locked semantics, read first.
> **Finance guardrails**: [`docs/engineering/FINANCE_GUARDRAILS.md`](../engineering/FINANCE_GUARDRAILS.md)
> **Journey traces**: [creator-operations.md](../workflows/creator-operations.md) · [shift-operations.md](../workflows/shift-operations.md)
> **Auth + endpoint matrix**: [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)

## Goal

Build the L-side (cost) of P&L on existing studio entities, while completing studio operational autonomy so studios no longer depend on `/system/*` routes for routine workflows. Phase 4 produces **read-only reference figures**, not payments. No money moves through the system; recipient acknowledgement, dispute, payment processing, and bank reconciliation are post-Phase-4.

## Shipped

- ✅ **Wave 1 — Studio autonomy** (1.1-1.5): sidebar redesign, creator roster, member roster, creator onboarding, show management. See [`docs/features/`](../features/).
- ✅ **Cost model locked**: [`docs/domain/economics-cost-model.md`](../domain/economics-cost-model.md).
- ✅ **2.2 Foundation — Tasks 1-6** (PRs [#59](https://github.com/allenlin90/eridu-services/pull/59), [#60](https://github.com/allenlin90/eridu-services/pull/60), [#62](https://github.com/allenlin90/eridu-services/pull/62), [#63](https://github.com/allenlin90/eridu-services/pull/63), [#64](https://github.com/allenlin90/eridu-services/pull/64), [#65](https://github.com/allenlin90/eridu-services/pull/65)): system + studio compensation line-item APIs, actuals + snapshot readiness, creator-mapping compensation UX, shift workflow UI.

## Remaining PRs

Each row is one user-facing change. A row with a brief sub-section below means work is being picked up — the brief is written when the PR starts and deleted when the PR merges (the PR description + the canonical doc become the record).

Rows are ordered top-to-bottom as execution order: rows 1-6 have no dependencies and can ship in any order or in parallel; rows 7-10 each depend on a row above. **No row depends on a row below it.**

| # | PR | Depends on | Status | PR link |
| - | -- | ---------- | ------ | ------- |
| 1 | [Money library standardization](#pr-1--money-library-standardization) — adopt `Big` (big.js) on FE, tighten BE `decimalToString`, update Finance Guardrail #2 | — | 🚧 In progress | — |
| 2 | [Shift export at `/shifts`](#pr-2--shift-export) — unified date range, export, live `total_cost` (drops stored cost columns) | — | 🚧 Next | — |
| 3 | Show-operations export + actuals at `/show-operations` — unified date range, export, show-actuals input, missing-actuals queue | — | 🔲 Planned | — |
| 4 | Creator compensation editability — per-show edit dialog + per-creator date-range review | — | 🔲 Planned | — |
| 5 | Roster snapshot-warning copy on member/creator roster edit dialogs | — | 🔲 Planned | — |
| 6 | Strict-mode creator availability with conflict metadata | — | 🔲 Planned | — |
| 7 | Per-member shift compensation review (date-range) | PR 3 | 🔲 Planned | — |
| 8 | Self-view compensation reads + flag-missing-actuals affordance (`/me/compensation/*`) | PR 3, PR 4 | 🔲 Planned | — |
| 9 | Cross-user creator/member compensation reads + show drill-in | PR 8 | 🔲 Planned | — |
| 10 | Operational rollup endpoint + economics review surface (`/studios/:id/finance/economics`) | PR 9 | 🔲 Planned | — |

### How to use this list

- **Picking up a PR**: write a 1-3 sentence brief in a sub-section below (or just open the PR with that as the description). Mark status `🚧 In progress`.
- **PR merged**: replace the brief with the PR link in the table. Update the relevant `docs/features/` and `apps/*/docs/` canonical docs with what actually shipped (not what was predicted). Mark the row `✅`.
- **Discovering a new boundary or dependency**: re-cluster the rows and re-check the "no row depends on a row below" invariant. Predictions made before code drift; this list should match reality, not the original guess.

### PR 1 · Money library standardization

**Brief** — Today the FE has two money-formatting paths: a safe BigInt-based `toMoneyString` util (used in input dialogs) and ad-hoc `Number(value).toFixed(2)` display calls in column renderers (4 sites). The BE serializer at `apps/erify_api/src/lib/utils/decimal-to-string.util.ts` silently calls `.toFixed(2)` on JS numbers, which violates Finance Guardrail #2. This PR adopts `Big` (big.js, ~2.5 KB gzipped, same author and rounding defaults as `Prisma.Decimal` / decimal.js used on BE), rewrites the FE util as a thin wrapper around `Big`, replaces the unsafe display calls with `Big(value).toFixed(2)`, tightens the BE util to throw on JS-number inputs instead of silently rounding, and updates Finance Guardrail #2 to name the libraries explicitly. Adds `big.js` + `@types/big.js` to `apps/erify_studios`; no other dependency changes.

### PR 2 · Shift export

**Brief** — Studio admin opens `/studios/:id/shifts?view=table`. Two sections today (cost snapshot + records list) each have their own date picker; the records list shows a stored `Projected Cost` column that drifts from current state. This PR lifts the date range to one picker driving both sections, renames the column to `Total Cost` backed by a live calculation from `hourlyRate × block-duration + STUDIO_SHIFT(_BLOCK) line items`, drops the stored `projected_cost` / `calculated_cost` columns (every writer in the same change set since `projected_cost` is `NOT NULL`), and adds an "Export" button that downloads the current view as CSV/JSON. No new BE endpoints — `total_cost` joins the existing shift list response shape. Money rendering uses `Big()` from PR 1 if PR 1 has merged; otherwise picks up the convention when PR 1 lands.

## Out of scope (post-Phase-4)

Each item has an extension sketch in cost-model §4:

- Revenue (P-side), commission resolution, contribution margin → [`docs/prd/future/pnl-revenue-workflow.md`](../prd/future/pnl-revenue-workflow.md)
- Settlement, freeze, grace tolerance, payment processing, bank-statement reconciliation
- Recipient acknowledgement, dispute, recipient-initiated adjustments
- Notifications when manager edits actuals
- Standing / schedule-scoped / global / recurring / HR line items
- `ShowCreator` and `ShowPlatform` actual columns (extension points, dormant in Phase 4)
- Advanced compensation rule engine
- Platform / creator-app / punch-clock actuals sources
- Studio schedule management — deferred 2026-04-22; Google Sheets remains the scheduling path. Materials at [`docs/prd/future/studio-schedule-management.md`](../prd/future/studio-schedule-management.md) and the two `STUDIO_SCHEDULE_MANAGEMENT_DESIGN.md` design docs.

## Definition of Done

Phase 4 closes when every row in the PR table is `✅`. The cost-model contract remains the locked semantic source; phase doc tracks status only.

## Verification gates per PR

```
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

App-local design docs land alongside the implementation PR only when a PR introduces a novel pattern.

## Phase 5 Deferrals

| Workstream | Reference | Track |
| ---------- | --------- | ----- |
| Studio reference data (clients, platforms, types, standards, statuses) | [PRD](../prd/studio-reference-data.md) | C |
| Studio creator profile editing | [PRD](../prd/studio-creator-profile.md) | C |
| Studio snapshot/audit trail visibility | — | C |
| Advanced compensation rule engine | — | A |
| Creator HR & operations (HRMS, fixed costs) | — | A |
| Ticketing, material management, inventory | — | B |
| Payment processing and bank-statement reconciliation | — | A |
| Recipient acknowledgement / dispute on read-only reference figures | — | A |
| Recipient-initiated adjustment requests | — | A |
| Notifications when manager edits actuals | — | B |
| Platform and creator-app actuals sources | — | A |
| P&L revenue workflow, commission resolution, contribution margin | [Future PRD](../prd/future/pnl-revenue-workflow.md) | A |
