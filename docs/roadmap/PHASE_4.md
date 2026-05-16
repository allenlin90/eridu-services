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

| # | PR | Depends on | Status | PR link |
| - | -- | ---------- | ------ | ------- |
| 1 | [Shift export at `/shifts`](#pr-1--shift-export) — unified date range, export, live `total_cost` (drops stored cost columns) | — | 🚧 Next | — |
| 2 | Show-operations export + actuals at `/show-operations` — unified date range, export, show-actuals input, missing-actuals queue | — | 🔲 Planned | — |
| 3 | Creator compensation editability — per-show edit dialog + per-creator date-range review | — | 🔲 Planned | — |
| 4 | Per-member shift compensation review (date-range) | PR 2 | 🔲 Planned | — |
| 5 | Roster snapshot-warning copy on member/creator roster edit dialogs | — | 🔲 Planned | — |
| 6 | Self-view compensation reads + flag-missing-actuals affordance (`/me/compensation/*`) | PR 2, PR 3 | 🔲 Planned | — |
| 7 | Cross-user creator/member compensation reads + show drill-in | PR 6 | 🔲 Planned | — |
| 8 | Operational rollup endpoint + economics review surface (`/studios/:id/finance/economics`) | PR 7 | 🔲 Planned | — |
| 9 | Strict-mode creator availability with conflict metadata | — | 🔲 Planned | — |

PRs 1, 2, 3, 5, 9 can start in parallel. PR 4 needs PR 2 (uses the missing-actuals surface). PR 6 needs PR 2 + PR 3. PR 7 needs PR 6. PR 8 needs PR 7.

### How to use this list

- **Picking up a PR**: write a 1-3 sentence brief in a sub-section below (or just open the PR with that as the description). Mark status `🚧 In progress`.
- **PR merged**: replace the brief with the PR link in the table. Update the relevant `docs/features/` and `apps/*/docs/` canonical docs with what actually shipped (not what was predicted). Mark the row `✅`.
- **Discovering a new boundary**: re-cluster the rows. Predictions made before code drift; this list should match reality, not the original guess.

### PR 1 · Shift export

**Brief** — Studio admin opens `/studios/:id/shifts?view=table`. Two sections today (cost snapshot + records list) each have their own date picker; the records list shows a stored `Projected Cost` column that drifts from current state. This PR lifts the date range to one picker driving both sections, renames the column to `Total Cost` backed by a live calculation from `hourlyRate × block-duration + STUDIO_SHIFT(_BLOCK) line items`, drops the stored `projected_cost` / `calculated_cost` columns (every writer in the same change set since `projected_cost` is `NOT NULL`), and adds an "Export" button that downloads the current view as CSV/JSON. No new BE endpoints — `total_cost` joins the existing shift list response shape.

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
