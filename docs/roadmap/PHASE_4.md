# Phase 4: P&L Visibility & Creator Operations

> **Status**: 🚧 Active (economics baseline shipped; extended scope in planning)
> **Primary tracker**: This file (`PHASE_4.md`)

## Goal

Deliver full P&L operator foundations: creator mapping + assignment, variable cost visibility (economics baseline), studio-managed rosters for accurate cost inputs, show planning export, and revenue workflow to complete the P&L model.

## Phase 4 Baseline

- Creator naming cutover/renaming/refactoring is a **completed prerequisite inside Phase 4** and is merged to `master`.
- Phase 4 deliverable is the creator mapping + assignment foundation (BE/FE + smoke stabilization).
- Economics implementation is intentionally deferred to next phase redesign scope.

## Phase 4 Delivery Summary

### 1. Creator Mapping + Assignment (Done)

- Studio-level creator mapping contracts and endpoints are implemented.
- Show-level creator assignment flows (single-show and bulk workflows) are implemented.
- Mapping behavior and smoke coverage are stabilized for merge to `master`.

### 2. Economics Baseline (Shipped — Reopened Scope)

- Variable cost endpoints shipped (commit `8de31ffe`, 2026-03-22).
- Revenue/performance-driven profit logic tracked in extended scope (Wave 3).

### 3. Docs / Agent / Memory Sync (Done)

- Roadmap and app-local design docs aligned with delivered mapping scope and deferred economics scope.

## Architecture Guardrails (Phase 4 Baseline)

- Finance arithmetic must live in dedicated economics domain services/calculators.
- Controllers must stay transport-focused (authz, DTO parsing, response shaping only).
- Orchestration services may coordinate flows but must not own financial formulas.
- `metadata` is not a compensation rule engine and must not store executable bonus logic.
- Complex compensation (bonus, post-show adjustments, tiered/volume commission, hybrid rule sets) is explicitly deferred.

## Canonical Specs (Shipped — App-Local Docs)

PRDs for this phase have been deleted per lifecycle rules. Shipped behavior is owned by app-local docs.

| Scope                            | Backend Doc                                                                       | Frontend Doc                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Roles & authorization foundation | [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md) | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) |
| Creator mapping & assignment     | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md)        | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md)                       |

## Out of Scope for Phase 4

- Ticketing/material management and unrelated backlog tracks (see [Phase 5](./PHASE_5.md)).
- Advanced profit engine and complex compensation policies (tiered/volume commission, bonus, OT).
- Creator HR & operations (HRMS, platform API integrations, fixed cost tracking) — deferred to Phase 5.
- Full-text search, admin UX searchability refactor — deferred to Phase 5.

## Phase 4 Reopened Scope (2026-03-21)

Phase 4 is reopened to complete its original P&L economics goal. Task submission reporting was shipped during the interim.

### Economics Baseline (Developed — Pending Merge)

Deliver show-level and grouped economics endpoints for baseline variable cost visibility (creator costs + shift labor costs).

- Feature doc: [show-economics.md](../features/show-economics.md) (PRD promoted per lifecycle)
- Status: ✅ Developed (commit `8de31ffe`, 2026-03-22)
- **Branch**: `feat/show-economics-baseline` — 1 commit ahead of `master`, not yet merged
- **Merge target**: Must be merged to `master` before Wave 2 (Show Planning Export depends on economics endpoints)
- Endpoints:
  - `GET /studios/:studioId/shows/:showId/economics` — single show variable cost breakdown
  - `GET /studios/:studioId/economics` — grouped economics (by show / schedule / client)
- Creator costs resolve `ShowCreator` overrides → `Creator` defaults; `COMMISSION`/`HYBRID` yield `null` computed cost (revenue side deferred to ideation).
- Shift costs are proportionally attributed by block overlap with show time window.

### Resolved from Ideation (2026-03-22)

Items resolved during the Phase 4 reopen window without full PRD promotion:

| Topic                                                    | Disposition             | Commit / PR                           | Notes                                                                                                                                        |
| -------------------------------------------------------- | ----------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend API Contract Consistency (`pageSize` → `limit`) | ✅ Implemented           | PRs #21, #23 (`cfd80c14`, `38b3c32c`) | All 15 `erify_studios` search schemas and `useTableUrlState` migrated; `pageSize` backcompat removed.                                        |
| API Read-Path Optimization (show / task-template slice)  | ✅ Partial slice shipped | PR #22 (`a06ddcac`)                   | Show DTO includes slimmed, studio task-summary and single-show query shaped, admin template blob-read reduced. Full ideation remains active. |
| Studios Internal Read Burst Hardening                    | ✅ Implemented           | PR #24 (`7def7a50`)                   | Request deduplication, `axios.isCancel()` guard, `refetchOnWindowFocus` disabled globally; rationale in `STUDIOS_INTERNAL_READ_TRAFFIC.md`.  |

### Extended Scope (2026-03-22) — Active PRDs

Phase 4 expanded to cover full P&L operator foundations. Six new workstreams promoted from ideation:

| Workstream                                       | PRD                                                                             | Status                                | L-side Hook                                                                               | Wave |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| Sidebar redesign (erify_studios)                 | [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) | 🔲 Planned                             | —                                                                                         | 1    |
| Studio creator roster CRUD                       | [studio-creator-roster.md](../prd/studio-creator-roster.md)                     | 🔲 Planned                             | `StudioCreator.defaultRate/defaultRateType/defaultCommissionRate` → creator cost fallback | 1    |
| Studio member roster + helper eligibility gating | [studio-member-roster.md](../prd/studio-member-roster.md)                       | 🔲 Planned                             | `StudioMembership.baseHourlyRate` → shift labor cost                                      | 1    |
| Show planning export with cost preview           | [show-planning-export.md](../prd/show-planning-export.md)                       | 🔲 Planned                             | `estimated_total_cost` column from economics                                              | 2    |
| Creator availability hardening (strict mode)     | [creator-availability-hardening.md](../prd/creator-availability-hardening.md)   | 🔲 Planned (depends on creator roster) | Conflict enforcement: overlap, roster state, inactive                                     | 2    |
| P&L revenue workflow (GMV/sales input)           | [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md)                       | 🔲 Planned (open design Qs)            | Activates COMMISSION/HYBRID creator cost computation                                      | 3    |

### Implementation Sequencing

#### Pre-Implementation Gates

| Gate | Blocks | Status |
| --- | --- | --- |
| **Prisma migration** — add `isHelper` + `version` to `StudioMembership` | Wave 1: Studio Member Roster | 🔲 Pending |
| **Economics merge** — merge `feat/show-economics-baseline` (`8de31ffe`) to `master` | Wave 2: Show Planning Export | 🔲 Pending (1 commit ahead of master) |
| **Financial arithmetic decision** — adopt `big.js` or accept floating-point risk | Wave 3: P&L Revenue Workflow | 🔲 Pending |

#### Dependency Graph

```
Wave 1 (no economics dependency — can start now):
    ├─► Sidebar Redesign ──────────────────────────── (FE-only, no deps)
    ├─► Studio Creator Roster ─────────────────────── (StudioCreator model complete)
    └─► Studio Member Roster ──────────────────────── (needs isHelper + version migration)

Economics merged to master (gate for Wave 2):
    │
    ├─► Wave 2: Show Planning Export ──────────────── (needs economics endpoints)
    └─► Wave 2: Creator Availability Hardening ────── (needs creator roster from Wave 1)

Design Qs resolved + big.js adopted (gate for Wave 3):
    └─► Wave 3: P&L Revenue Workflow ──────────────── (needs design Q resolution + big.js)
            └─► Removes @preview markers, activates COMMISSION/HYBRID
```

#### Wave 1 — Foundation (parallel, no inter-dependencies)

| Workstream                | Size | Scope                                                                                                                                 |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Sidebar Redesign**      | S    | Pure FE refactor: `sidebar-config.tsx` + `studio-route-access.ts`. Ships navigation homes for all new pages.                          |
| **Studio Creator Roster** | M    | `StudioCreator` model is complete. Add `POST`/`PATCH` write endpoints, version-guarded compensation updates, FE roster page.          |
| **Studio Member Roster**  | M    | Requires Prisma migration first. Add `POST`/`PATCH`/`DELETE` endpoints, self-demotion guard, helper eligibility enforcement, FE page. |

**Milestone 1**: Economics endpoint reflects roster-managed rates for FIXED creators; shift costs reflect updated `baseHourlyRate`. Sidebar shows function-based groups with new page navigation.

#### Wave 2 — Export & Assignment Integrity

| Workstream                         | Size | Scope                                                                                                                                                                     |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Show Planning Export**           | M    | New endpoint with CSV/JSON, date-range filtering, `estimated_total_cost` column from economics. Performance cap needed for batch computation.                             |
| **Creator Availability Hardening** | M    | `strict=true` mode on availability endpoint: overlap detection, roster membership check, typed error codes in `@eridu/api-types`. Resolves `add-creator-dialog.tsx` TODO. |

**Milestone 2**: Operators can download pre-show planning sheet with cost data; conflicting creator assignments are flagged before save.

#### Wave 3 — Revenue Activation (completes P&L model)

| Workstream               | Size | Scope                                                                                                                                                                                  |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P&L Revenue Workflow** | L    | 4 design Qs must be resolved first. `big.js` adoption. Schema migration for GMV/net_sales. Revenue input UI. Removes `@preview` markers. Activates COMMISSION/HYBRID cost computation. |

**Milestone 3**: Full P&L visible for shows with revenue data; economics endpoints no longer `@preview`.

### PR Plan

Each workstream ships as a separate PR for focused review. Order follows dependency graph.

| # | PR | Branch | Gate |
| --- | --- | --- | --- |
| 0 | Economics baseline merge | `feat/show-economics-baseline` → `master` | None — can merge now |
| 1a | Sidebar redesign | `feat/sidebar-redesign` | None |
| 1b | Studio creator roster CRUD | `feat/studio-creator-roster` | None |
| 1c | Studio member roster CRUD | `feat/studio-member-roster` | Prisma migration (isHelper + version) |
| 2a | Show planning export | `feat/show-planning-export` | PR #0 merged (economics on master) |
| 2b | Creator availability hardening | `feat/creator-availability-hardening` | PR #1b merged (creator roster state) |
| 3 | P&L revenue workflow | `feat/pnl-revenue-workflow` | Design Qs resolved + big.js adopted |

PRs 1a/1b/1c can be developed and reviewed in parallel. PRs 2a/2b wait for their respective gates.

### Risks & Open Items

| Item                                                              | Risk                                 | Mitigation                                                   |
| ----------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| P&L Revenue Workflow has 4 unresolved design questions            | High — blocks Wave 3 entirely        | Resolve during Wave 1 so Wave 3 can start without delay      |
| Show Planning Export per-show economics batch cost                | Medium — performance at scale        | Define cap (max 90-day range) and batch computation strategy |
| Member roster helper eligibility touches task assignment path     | Medium — regression risk             | Dedicated tests for assignment with `isHelper=false`         |
| Economics FE gap — no frontend pages consume shipped BE endpoints | Medium — invisible to operators      | Consider lightweight economics summary page in Wave 2        |
| No financial arithmetic library — JS `Number` with `.toFixed(2)`  | Medium — floating-point accumulation | Adopt `big.js` before Wave 3 revenue workflow                |

### Task Submission Reporting & Export (Shipped)

- Status: ✅ Shipped (PR #16, commit `831b58ca`, 2026-03-21)
- Feature doc: [task-submission-reporting.md](../features/task-submission-reporting.md)
- Canonical docs: [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)

## Definition of Done (Phase 4)

- Mapping/assignment flow is stable and merged-ready. ✅
- Creator mapping PRD intent and BE/FE design docs are synced and traceable by route/contract. ✅
- Economics baseline (variable cost side) shipped: per-show and grouped endpoints. ✅
- Studio member roster with `baseHourlyRate` editing and helper eligibility gating implemented.
- Studio creator roster CRUD with compensation defaults implemented.
- P&L revenue workflow design questions resolved and GMV/sales input shipped.
- Show planning export (pre-show, with cost column) shipped.
- Creator availability strict-mode endpoint (overlap + roster conflict) shipped.
- Sidebar redesigned to function-based groups in `erify_studios`.
- Revenue side of P&L (COMMISSION/HYBRID cost activation) tracked in [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md).
