# Phase 4: P&L Visibility & Creator Operations

> **Status**: 🚧 Active — Wave 1 shipped; cost model locked; 2.2 Tasks 1-6 merged; money library standardized (PR [#69](https://github.com/allenlin90/eridu-services/pull/69)); 11 PRs remaining.
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

Rows are ordered top-to-bottom as execution order. Rows with `—` in the dependency column can ship in any order or in parallel; rows with an explicit dependency should ship after the named row. **No row depends on a row below it.**

| # | PR | Depends on | Status | PR link |
| - | -- | ---------- | ------ | ------- |
| 1 | Money library standardization — adopt `Big` (big.js) on FE, tighten BE `decimalToString`, update Finance Guardrail #2 | — | ✅ Merged | [#69](https://github.com/allenlin90/eridu-services/pull/69) |
| 2 | [Shift unified date range + export at `/shifts`](#pr-2--shift-unified-date-range--export) — one picker drives the cost snapshot, records list, and current-view export | — | 🚧 In progress | — |
| 3 | [Shift cost-column cleanup at `/shifts`](#pr-3--shift-cost-column-cleanup) — drop stored shift cost columns, add live `total_cost`, revise FE columns | PR 2 | 🔲 Planned | — |
| 4 | Show-operations export + actuals at `/show-operations` — unified date range, export, show-actuals input, missing-actuals queue | — | 🔲 Planned | — |
| 5 | Creator compensation editability — per-show edit dialog + per-creator date-range review | — | 🔲 Planned | — |
| 6 | Roster snapshot-warning copy on member/creator roster edit dialogs | — | 🔲 Planned | — |
| 7 | Strict-mode creator availability with conflict metadata | — | 🔲 Planned | — |
| 8 | [Member `base_hourly_rate` wire-type migration](#pr-8--member-base_hourly_rate-wire-type-migration) — `z.number()` → `z.string()` end-to-end (Finance Guardrail #2 follow-up surfaced by PR 1) | — | 🔲 Planned | — |
| 9 | Per-member shift compensation review (date-range) | PR 4 | 🔲 Planned | — |
| 10 | Self-view compensation reads + flag-missing-actuals affordance (`/me/compensation/*`) | PR 4, PR 5 | 🔲 Planned | — |
| 11 | Cross-user creator/member compensation reads + show drill-in | PR 10 | 🔲 Planned | — |
| 12 | Operational rollup endpoint + economics review surface (`/studios/:id/finance/economics`) | PR 11 | 🔲 Planned | — |

### How to use this list

- **Picking up a PR**: write a 1-3 sentence brief in a sub-section below (or just open the PR with that as the description). Mark status `🚧 In progress`.
- **Wrapping up a PR (before merge, not after)**: as part of the PR's own commits, flip the row to `✅`, replace the brief with the PR link in the table, and update any other docs the PR's outcome affects — canonical docs in `docs/features/` and `apps/*/docs/` reflecting what actually shipped, and forward-looking roadmaps (e.g. drop now-shipped items from [`PHASE_5.md`](./PHASE_5.md) deferrals). Land docs atomically with the code so `master` always matches the roadmap; do not leave status flips for a follow-up commit. Prefer squash-merging the PR.
- **Discovering a new boundary or dependency**: re-cluster the rows and re-check the "no row depends on a row below" invariant. Predictions made before code drift; this list should match reality, not the original guess.

### PR 2 · Shift unified date range + export

**Brief** — Studio admin opens `/studios/:id/shifts?view=table`. Two sections today (cost snapshot + records list) each have their own date picker, so the page does not have one current-view range to export. This PR lifts the date range to one picker driving both sections and adds an "Export" button that downloads the current view as CSV/JSON. No DB migration, cost-column rename, or `total_cost` response-shape change in this PR.

### PR 3 · Shift cost-column cleanup

**Brief** — The shift records list shows a stored `Projected Cost` column that drifts from current state. This PR renames the FE column to `Total Cost`, backs it with a live calculation from `hourlyRate × block-duration + STUDIO_SHIFT(_BLOCK) line items`, and drops the stored `projected_cost` / `calculated_cost` columns (every writer in the same change set since `projected_cost` is `NOT NULL`). No new BE endpoints — `total_cost` joins the existing shift list response shape. Money rendering uses `toDecimalDisplayString` from `@/lib/decimal-format` (shipped in PR 1).

### PR 8 · Member `base_hourly_rate` wire-type migration

**Brief** — Surfaced during PR 1 review. `StudioMemberResponse.base_hourly_rate` and the add/update request schemas are typed as `z.number()` in `packages/api-types/src/memberships/schemas.ts`, so the BE Prisma.Decimal is coerced through a JS number on serialize and the FE receives a number that has already lost precision past `Number.MAX_SAFE_INTEGER` before any formatter runs. This PR migrates the wire type to `z.string()` end-to-end: response schema, add/update request schemas, BE serializer (use `decimalToString`), FE input parsing in `add-member-dialog` / `edit-member-dialog` (use `toMoneyString`), and the column renderer in `member-columns.tsx` (use `toDecimalDisplayString`). Closes the last JS-number money path on the studio-members surface and brings it in line with the creator-roster fields already migrated in PR 1. No DB migration required (`StudioMembership.baseHourlyRate` is already `Decimal` in Prisma).

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
