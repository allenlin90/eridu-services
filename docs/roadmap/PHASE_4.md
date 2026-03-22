# Phase 4: P&L Visibility & Creator Operations

> **Status**: 🚧 Active (economics baseline shipped; extended scope in planning)
> **Primary tracker**: This file (`PHASE_4.md`)

## Goal

Deliver creator mapping + assignment foundations on top of the creator-first baseline, with economics redesign deferred to next phase.

## Phase 4 Baseline

- Creator naming cutover/renaming/refactoring is a **completed prerequisite inside Phase 4** and is merged to `master`.
- Phase 4 deliverable is the creator mapping + assignment foundation (BE/FE + smoke stabilization).
- Economics implementation is intentionally deferred to next phase redesign scope.

## Phase 4 Delivery Summary

### 1. Creator Mapping + Assignment (Done)

- Studio-level creator mapping contracts and endpoints are implemented.
- Show-level creator assignment flows (single-show and bulk workflows) are implemented.
- Mapping behavior and smoke coverage are stabilized for merge to `master`.

### 2. Economics Baseline (Deferred)

- Economics redesign and implementation moved to next phase.
- Revenue/performance-driven profit logic remains deferred.

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

### Economics Baseline (Shipped)

Deliver show-level and grouped economics endpoints for baseline variable cost visibility (creator costs + shift labor costs).

- PRD: [show-economics.md](../prd/show-economics.md)
- Status: ✅ Shipped (commit `8de31ffe`, 2026-03-22, branch `feat/show-economics-baseline`)
- Endpoints:
  - `GET /studios/:studioId/shows/:showId/economics` — single show variable cost breakdown
  - `GET /studios/:studioId/economics` — grouped economics (by show / schedule / client)
- Creator costs resolve `ShowCreator` overrides → `Creator` defaults; `COMMISSION`/`HYBRID` yield `null` computed cost (revenue side deferred to ideation).
- Shift costs are proportionally attributed by block overlap with show time window.

### Resolved from Ideation (2026-03-22)

Items resolved during the Phase 4 reopen window without full PRD promotion:

| Topic | Disposition | Commit / PR | Notes |
| ----- | ----------- | ----------- | ----- |
| Frontend API Contract Consistency (`pageSize` → `limit`) | ✅ Implemented | PRs #21, #23 (`cfd80c14`, `38b3c32c`) | All 15 `erify_studios` search schemas and `useTableUrlState` migrated; `pageSize` backcompat removed. |
| API Read-Path Optimization (show / task-template slice) | ✅ Partial slice shipped | PR #22 (`a06ddcac`) | Show DTO includes slimmed, studio task-summary and single-show query shaped, admin template blob-read reduced. Full ideation remains active. |
| Studios Internal Read Burst Hardening | ✅ Implemented | PR #24 (`7def7a50`) | Request deduplication, `axios.isCancel()` guard, `refetchOnWindowFocus` disabled globally; rationale in `STUDIOS_INTERNAL_READ_TRAFFIC.md`. |

### Extended Scope (2026-03-22) — Active PRDs

Phase 4 expanded to cover full P&L operator foundations. Six new workstreams promoted from ideation:

| Workstream | PRD | Status | L-side Hook |
| ---------- | --- | ------ | ----------- |
| Studio member roster + helper eligibility gating | [studio-member-roster.md](../prd/studio-member-roster.md) | 🔲 Planned | `StudioMembership.baseHourlyRate` → shift labor cost |
| Studio creator roster CRUD | [studio-creator-roster.md](../prd/studio-creator-roster.md) | 🔲 Planned | `Creator.defaultRate/defaultRateType/defaultCommissionRate` → creator cost fallback |
| P&L revenue workflow (GMV/sales input) | [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md) | 🔲 Planned (open design Qs) | Activates COMMISSION/HYBRID creator cost computation |
| Show planning export with cost preview | [show-planning-export.md](../prd/show-planning-export.md) | 🔲 Planned | `estimated_total_cost` column from economics |
| Creator availability hardening (strict mode) | [creator-availability-hardening.md](../prd/creator-availability-hardening.md) | 🔲 Planned (depends on creator roster) | Conflict enforcement: overlap, roster state, inactive |
| Sidebar redesign (erify_studios) | [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) | 🔲 Planned | — |

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
