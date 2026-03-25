# Phase 4: P&L Visibility & Creator Operations

> **Status**: 🚧 Active (economics baseline shipped; extended scope in planning)
> **Primary tracker**: This file (`PHASE_4.md`)

## Goal

Build the P&L system on existing entities, focusing on the **L-side** (labor and creator costs). This phase is a portfolio of features that collectively deliver cost visibility and accurate cost input management for studio operators.

Key outcomes:
- Studio operators can manage labor rates and creator compensation defaults without system-admin intervention.
- Variable cost visibility (creator costs + shift labor) is surfaced via economics endpoints.
- Pre-show planning exports include estimated cost data.
- Creator assignment correctness is enforced (overlap + roster conflicts).
- Revenue inputs (P-side) complete the full P&L model.

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

## Documentation Structure

Phase 4 is a **portfolio of features**, each with its own PRD and per-feature design docs. Phase-level docs serve as indexes and cross-cutting references.

### Doc Flow (per feature)

```
docs/prd/<feature>.md                          ← PRD: user stories, ACs, product rules
    ↓
apps/erify_api/docs/design/<FEATURE>_DESIGN.md  ← BE design: data model, service, repo, controller
apps/erify_studios/docs/design/<FEATURE>_DESIGN.md ← FE design: routes, components, queries, state
    ↓
Implementation PR (code + tests)
    ↓
Post-ship: promote PRD → docs/features/, update phase-level index, run knowledge-sync
```

Exception: **Sidebar Redesign** — no PRD (FE-only config change). Uses existing [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) as its design doc. Post-ship must update related skills/memory that reference sidebar structure.

### Phase-Level Reference Docs

| Scope | Doc | Purpose |
| --- | --- | --- |
| Phase roadmap & sequencing | This file (`PHASE_4.md`) | Portfolio tracker, wave plan, PR plan |
| BE index across all features | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md) | API contract summary, authorization matrix, architecture rules |
| FE index across all features | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md) | Route plan, sidebar spec, UX rules, query key conventions |
| Authorization foundation | [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md) | Guard patterns, role hierarchy |
| Role use cases | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) | Per-role view access |

### Per-Feature Design Docs (created with each PR)

| Feature | PRD | BE Design | FE Design |
| --- | --- | --- | --- |
| Creator mapping | Shipped → [feature doc](../features/creator-mapping.md) | Covered in phase-level BE doc | Covered in phase-level FE doc |
| Economics baseline | Deferred → [feature doc](../features/show-economics.md) | TBD (after cost model review) | TBD (after cost model review) |
| Studio member roster | [PRD](../prd/studio-member-roster.md) | TBD (create with PR #1c) | TBD (create with PR #1c) |
| Studio creator roster | [PRD](../prd/studio-creator-roster.md) | TBD (create with PR #1b) | TBD (create with PR #1b) |
| Show planning export | [PRD](../prd/show-planning-export.md) | TBD (create with PR #2a) | TBD (create with PR #2a) |
| Creator availability hardening | [PRD](../prd/creator-availability-hardening.md) | TBD (create with PR #2b) | TBD (create with PR #2b) |
| P&L revenue workflow | [PRD](../prd/pnl-revenue-workflow.md) | TBD (create with PR #3) | TBD (create with PR #3) |
| Sidebar redesign | N/A (simple config) | N/A | [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) |

## Out of Scope for Phase 4

- Ticketing, material management, inventory — [Phase 5 Track B](./PHASE_5.md#track-b-operations-expansion-ticketing-materials-inventory).
- Advanced compensation engine (bonus, OT, tiered/volume commission) — [Phase 5 Track A](./PHASE_5.md#track-a-pl-revenue-side-p-side-completion).
- Creator HR & operations (HRMS, platform API integrations, fixed cost tracking) — [Phase 5 Track A](./PHASE_5.md#track-a-pl-revenue-side-p-side-completion).
- Full-text search, admin UX searchability refactor — Phase 5 (either track).

## Phase 4 Reopened Scope (2026-03-21)

Phase 4 is reopened to complete its original P&L economics goal. Task submission reporting was shipped during the interim.

### Economics Baseline (Developed — Deferred)

Deliver show-level and grouped economics endpoints for baseline variable cost visibility (creator costs + shift labor costs).

- Feature doc: [show-economics.md](../features/show-economics.md) (PRD promoted per lifecycle)
- Status: ⏸️ Developed but **merge deferred** (commit `8de31ffe`, 2026-03-22)
- **Branch**: `feat/show-economics-baseline` — 1 commit ahead of `master`, not yet merged
- Endpoints:
  - `GET /studios/:studioId/shows/:showId/economics` — single show variable cost breakdown
  - `GET /studios/:studioId/economics` — grouped economics (by show / schedule / client)
- Creator costs resolve `ShowCreator` overrides → `Creator` defaults; `COMMISSION`/`HYBRID` yield `null` computed cost.
- Shift costs are proportionally attributed by block overlap with show time window.

**Why deferred**: The current cost model covers fixed rate, hourly rate, commission, and hybrid compensation types. However, real operations may require additional cost components not yet modeled — bonus, OT, special allowances, ad-hoc arrangements. The economics service needs a cost model review before merging to ensure the computation architecture can accommodate these components without a rewrite. This review will happen after both studio rosters (Wave 1) ship, when the data input layer is stable.

**Merge target**: After Wave 1 completes, review cost model requirements, then merge (potentially with revisions) before Wave 2.

### Resolved from Ideation (2026-03-22)

Items resolved during the Phase 4 reopen window without full PRD promotion:

| Topic                                                    | Disposition             | Commit / PR                           | Notes                                                                                                                                        |
| -------------------------------------------------------- | ----------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend API Contract Consistency (`pageSize` → `limit`) | ✅ Implemented           | PRs #21, #23 (`cfd80c14`, `38b3c32c`) | All 15 `erify_studios` search schemas and `useTableUrlState` migrated; `pageSize` backcompat removed.                                        |
| API Read-Path Optimization (show / task-template slice)  | ✅ Partial slice shipped | PR #22 (`a06ddcac`)                   | Show DTO includes slimmed, studio task-summary and single-show query shaped, admin template blob-read reduced. Full ideation remains active. |
| Studios Internal Read Burst Hardening                    | ✅ Implemented           | PR #24 (`7def7a50`)                   | Request deduplication, `axios.isCancel()` guard, `refetchOnWindowFocus` disabled globally; rationale in `STUDIOS_INTERNAL_READ_TRAFFIC.md`.  |

### Pre-Development: Task Template Migration (2026-03-23)

The app reached usable moderation-template state after a one-off operational rebuild on **March 24, 2026**: the production studio shared-field catalog and moderation task templates were recreated from the real moderator worksheet CSV. That rebuild was intentionally executed as an operational data change, not as permanent repo-tracked tooling.

**Permanent product scope** for this repo:
1. Keep the studio task-template surface manager-friendly with a filtered paginated table
2. Preserve moderation vs. standard template filtering in the API so pagination stays truthful
3. Validate reporting against fresh submitted moderation tasks whenever the shared-field model changes

**Operational note**: Do not keep one-off reset/import scripts in the repo once the rebuild has been executed. Future worksheet-driven rebuilds should be treated as explicit operational work, not a standing app feature.

**Status**: ✅ Moderation templates rebuilt operationally on March 24, 2026. Ongoing follow-up is reporting validation plus template-surface refinement.

**Sequencing**: Can run in parallel with Wave 1. No dependency on roster PRDs or economics.

### Extended Scope (2026-03-22) — Active PRDs

Phase 4 expanded to cover full P&L operator foundations. Six new workstreams promoted from ideation:

| Workstream                                       | PRD                                                                             | Status                                | L-side Hook                                                                               | Wave |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| Sidebar redesign (erify_studios)                 | [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) | 🔲 Planned                             | —                                                                                         | 1    |
| Studio creator roster CRUD                       | [studio-creator-roster.md](../prd/studio-creator-roster.md)                     | 🔲 Planned                             | `StudioCreator.defaultRate/defaultRateType/defaultCommissionRate` → creator cost fallback | 1    |
| Studio member roster                             | [studio-member-roster.md](../prd/studio-member-roster.md)                       | 🔲 Planned                             | `StudioMembership.baseHourlyRate` → shift labor cost                                      | 1    |
| Show planning export with cost preview           | [show-planning-export.md](../prd/show-planning-export.md)                       | 🔲 Planned                             | `estimated_total_cost` column from economics                                              | 2    |
| Creator availability hardening (strict mode)     | [creator-availability-hardening.md](../prd/creator-availability-hardening.md)   | 🔲 Planned (depends on creator roster) | Conflict enforcement: overlap, roster state, inactive                                     | 2    |
| P&L revenue workflow (GMV/sales input)           | [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md)                       | 🔲 Planned (open design Qs)            | Activates COMMISSION/HYBRID creator cost computation                                      | 3    |

### Implementation Sequencing

#### Pre-Implementation Gates

| Gate | Blocks | Status |
| --- | --- | --- |
| **Economics cost model review** — review cost components (bonus, OT, allowances) and revise economics service if needed | Wave 2: Show Planning Export | ⏸️ Deferred to after Wave 1 |
| **Economics merge** — merge `feat/show-economics-baseline` (with potential revisions) to `master` | Wave 2: Show Planning Export | ⏸️ Deferred to after cost model review |
| **Financial arithmetic decision** — adopt `big.js` or accept floating-point risk | Wave 3: P&L Revenue Workflow | 🔲 Pending |

#### Dependency Graph

```
Pre-dev (parallel with Wave 1):
    └─► Task Template Migration ─────────────────── (operational CSV rebuild completed on March 24, 2026)

Wave 1 (can start now):
    ├─► Sidebar Redesign ──────────────────────────── (FE-only, no deps)
    ├─► Studio Creator Roster ─────────────────────── (StudioCreator model complete)
    └─► Studio Member Roster ──────────────────────── (no migration needed)

Post-Wave 1: Economics cost model review
    └─► Decide additional cost components (bonus, OT, allowances)
    └─► Revise and merge feat/show-economics-baseline

Economics merged to master (gate for Wave 2):
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
| **Studio Member Roster**  | M    | No migration needed. Add `POST`/`PATCH`/`DELETE` endpoints, self-demotion guard, FE page. |

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

Each feature ships as a separate PR with its own design docs. Order follows dependency graph.

| # | PR | Branch | Gate | Deliverables |
| --- | --- | --- | --- | --- |
| P | Task template migration | `feat/task-template-migration` | Real moderator worksheet CSV | Operational rebuild + template list refinement |
| 1a | Sidebar redesign | `feat/sidebar-redesign` | None | Code + update skills/memory referencing sidebar |
| 1b | Studio creator roster CRUD | `feat/studio-creator-roster` | None | PRD review → BE/FE design → code + tests |
| 1c | Studio member roster CRUD | `feat/studio-member-roster` | None | PRD review → BE/FE design → code + tests |
| R | Economics cost model review | — | Wave 1 complete | Review cost components, revise economics service |
| 0 | Economics baseline merge | `feat/show-economics-baseline` → `master` | Cost model review done | Code (potentially revised) + BE/FE design docs |
| 2a | Show planning export | `feat/show-planning-export` | PR #0 merged (economics on master) | PRD review → BE/FE design → code + tests |
| 2b | Creator availability hardening | `feat/creator-availability-hardening` | PR #1b merged (creator roster state) | PRD review → BE/FE design → code + tests |
| 3 | P&L revenue workflow | `feat/pnl-revenue-workflow` | Design Qs resolved + big.js adopted | PRD review → BE/FE design → code + tests |

PR P (template migration) runs in parallel with Wave 1. PRs 1a/1b/1c can be developed and reviewed in parallel. Economics merge (PR #0) waits for cost model review after Wave 1. PRs 2a/2b wait for their respective gates.

Per-PR workflow: review PRD → create `apps/erify_api/docs/design/<FEATURE>_DESIGN.md` + `apps/erify_studios/docs/design/<FEATURE>_DESIGN.md` → implement → post-ship knowledge-sync.

### Risks & Open Items

| Item | Risk | Mitigation |
| --- | --- | --- |
| Economics cost model may need rework for bonus/OT/allowances | High — could require architecture changes | Review after Wave 1 when roster data layer is stable; revise before merge |
| P&L Revenue Workflow has 4 unresolved design questions | High — blocks Wave 3 entirely | Resolve during Wave 1 so Wave 3 can start without delay |
| Task template migration depends on staging data availability | Medium — blocks operational readiness | Export samples early; can proceed with representative examples |
| Show Planning Export per-show economics batch cost | Medium — performance at scale | Define cap (max 90-day range) and batch computation strategy |
| No financial arithmetic library — JS `Number` with `.toFixed(2)` | Medium — floating-point accumulation | Adopt `big.js` before Wave 3 revenue workflow |

### Task Submission Reporting & Export (Shipped)

- Status: ✅ Shipped (PR #16, commit `831b58ca`, 2026-03-21)
- Feature doc: [task-submission-reporting.md](../features/task-submission-reporting.md)
- Canonical docs: [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)

## Definition of Done (Phase 4)

- Mapping/assignment flow is stable and merged-ready. ✅
- Creator mapping PRD intent and BE/FE design docs are synced and traceable by route/contract. ✅
- Economics baseline (variable cost side) shipped: per-show and grouped endpoints. ✅
- Studio member roster with `baseHourlyRate` editing implemented.
- Studio creator roster CRUD with compensation defaults implemented.
- P&L revenue workflow design questions resolved and GMV/sales input shipped.
- Show planning export (pre-show, with cost column) shipped.
- Creator availability strict-mode endpoint (overlap + roster conflict) shipped.
- Sidebar redesigned to function-based groups in `erify_studios`.
- Revenue side of P&L (COMMISSION/HYBRID cost activation) tracked in [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md).
