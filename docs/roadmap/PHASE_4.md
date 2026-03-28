# Phase 4: P&L Visibility & Creator Operations

> **Status**: 🚧 Active (economics baseline shipped; extended scope in planning)
> **Primary tracker**: This file (`PHASE_4.md`)

## Goal

Build the P&L system on existing entities, focusing on the **L-side** (labor and creator costs). This phase is a portfolio of features that collectively deliver cost visibility and accurate cost input management for studio operators.

Key outcomes:
- Studio operators can manage labor rates and creator compensation defaults without system-admin intervention.
- Studio admins can onboard brand-new creators from the studio workspace without falling back to `/system/*`.
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

### 4. Studio Creator Onboarding Gap (Critical Path)

- Studio creator roster CRUD shipped, but studio creator management is still incomplete.
- Current studio roster flows can only add or reactivate creators who already exist in the global catalog.
- `/system/creators` remains the only shipped path for creating a brand-new creator, which keeps normal studio onboarding dependent on system-admin-only routes.
- Creator mapping still permits non-rostered catalog creators in some flows, so roster membership is not yet the authoritative assignment gate.
- **Implementation bug**: `bulkAssignCreatorsToShow` only checks for *inactive* roster entries — creators with *no roster entry at all* are silently assigned. This must be fixed as part of the onboarding PR.
- Track the corrective scope in [studio-creator-onboarding.md](../prd/studio-creator-onboarding.md) and treat it as a blocker for completing studio creator management.

### 5. Studio Autonomy Gap Analysis (2026-03-28)

A cross-reference of `/admin/*` vs `/studios/*` routes revealed that studios depend on system admins for several routine operations beyond creator onboarding. The gaps are prioritized below and tracked via new PRDs:

| Gap | Severity | Current State | Phase | PRD |
| --- | --- | --- | --- | --- |
| **Show CRUD** — studios cannot create, update, or delete shows | Critical | Read-only + creator assign at studio level | 4 (extended) | [studio-show-management.md](../prd/studio-show-management.md) |
| **Schedule management** — studios have zero schedule endpoints | High | Admin-only; studios manage shifts but not schedules | 4 (extended) | [studio-schedule-management.md](../prd/studio-schedule-management.md) |
| **Reference data** — clients, platforms, types, standards, statuses are admin-only CRUD | Medium | Read-only lookups at studio level | 5 (candidate) | [studio-reference-data.md](../prd/studio-reference-data.md) |
| **Creator profile editing** — name/alias changes require system admin | Low | Studios can edit roster overrides but not global profile | 5 (candidate) | [studio-creator-profile.md](../prd/studio-creator-profile.md) |
| **Snapshot/audit trail** — studios cannot view schedule/show version history | Low | Admin-only read endpoint | 5 (candidate) | — (track in Phase 5) |

**Show CRUD is the most impactful untracked gap** — every show setup requires system admin intervention, which is more frequent and operationally blocking than creator onboarding. Studio schedule management is the next priority since schedules group shows into publishable work periods.

## Architecture Guardrails (Phase 4 Baseline)

- Finance arithmetic must live in dedicated economics domain services/calculators.
- Controllers must stay transport-focused (authz, DTO parsing, response shaping only).
- Orchestration services may coordinate flows but must not own financial formulas.
- `metadata` is not a compensation rule engine and must not store executable bonus logic.
- `CompensationLineItem` records are flat monetary amounts entered by humans (or written by a future rule engine). The model stores **outcomes**, not **rules**. Rule engines (OT multipliers, tiered commission formulas) that compute these amounts are Phase 5 scope.
- The compensation system is a single-entry cost journal, not a double-entry ledger. If full accounting is needed, integrate with external accounting software.
- `CompensationTarget` follows the `TaskTarget` polymorphic pattern: single intermediate table with `targetType` + `targetId` discriminator and nullable FK columns for Prisma referential integrity. New engagement types add a nullable FK column — one table, additive migrations only.
- A person can be both a `StudioMembership` and a `StudioCreator` simultaneously. Line items attach to the **association record** via `CompensationTarget` — separate target records, independent P&L cost buckets.

## Documentation Structure

Phase 4 is a **portfolio of features**, each with its own lifecycle document (PRD before ship, feature doc after ship) and per-feature design docs where retained. Phase-level docs serve as indexes and cross-cutting references.

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
| BE index across all features | [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md) | Phase-level backend index, shared guardrails, per-feature design links |
| FE index across all features | [PHASE_4_PNL_FRONTEND.md](../../apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md) | Phase-level frontend index, shared UX/query rules, per-feature design links |
| Authorization foundation | [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md) | Guard patterns, role hierarchy |
| Role use cases | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) | Per-role view access |

### Per-Feature Design Docs (created with each PR)

| Feature | Product Doc | BE Design | FE Design |
| --- | --- | --- | --- |
| Creator mapping | Shipped → [feature doc](../features/creator-mapping.md) | Shipped feature; no retained design doc | Shipped feature; no retained design doc |
| Economics baseline | Deferred → [feature doc](../features/show-economics.md) | [SHOW_ECONOMICS_DESIGN.md](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md) | [SHOW_ECONOMICS_DESIGN.md](../../apps/erify_studios/docs/design/SHOW_ECONOMICS_DESIGN.md) |
| Studio member roster | Shipped → [feature doc](../features/studio-member-roster.md) | Shipped (PR #28) | Shipped (PR #28) |
| Studio creator roster | Shipped → [feature doc](../features/studio-creator-roster.md) | [STUDIO_CREATOR_ROSTER.md](../../apps/erify_api/docs/STUDIO_CREATOR_ROSTER.md) | [STUDIO_CREATOR_ROSTER.md](../../apps/erify_studios/docs/STUDIO_CREATOR_ROSTER.md) |
| Studio creator onboarding & roster-first assignment | [PRD](../prd/studio-creator-onboarding.md) | TBD (create with implementation PR) | TBD (create with implementation PR) |
| Compensation line items | [PRD](../prd/compensation-line-items.md) | [COMPENSATION_LINE_ITEMS_DESIGN.md](../../apps/erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md) | [COMPENSATION_LINE_ITEMS_DESIGN.md](../../apps/erify_studios/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md) |
| Show planning export | [PRD](../prd/show-planning-export.md) | [SHOW_PLANNING_EXPORT_DESIGN.md](../../apps/erify_api/docs/design/SHOW_PLANNING_EXPORT_DESIGN.md) | [SHOW_PLANNING_EXPORT_DESIGN.md](../../apps/erify_studios/docs/design/SHOW_PLANNING_EXPORT_DESIGN.md) |
| Creator availability hardening | [PRD](../prd/creator-availability-hardening.md) | [CREATOR_AVAILABILITY_HARDENING_DESIGN.md](../../apps/erify_api/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) | [CREATOR_AVAILABILITY_HARDENING_DESIGN.md](../../apps/erify_studios/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md) |
| P&L revenue workflow | [PRD](../prd/pnl-revenue-workflow.md) | [PNL_REVENUE_WORKFLOW_DESIGN.md](../../apps/erify_api/docs/design/PNL_REVENUE_WORKFLOW_DESIGN.md) | [PNL_REVENUE_WORKFLOW_DESIGN.md](../../apps/erify_studios/docs/design/PNL_REVENUE_WORKFLOW_DESIGN.md) |
| Sidebar redesign | N/A (simple config) | N/A | [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) |
| Studio show management | [PRD](../prd/studio-show-management.md) | TBD (create with implementation PR) | TBD (create with implementation PR) |
| Studio schedule management | [PRD](../prd/studio-schedule-management.md) | TBD (create with implementation PR) | TBD (create with implementation PR) |
| Studio reference data | [PRD](../prd/studio-reference-data.md) | TBD (create with implementation PR) | TBD (create with implementation PR) |
| Studio creator profile editing | [PRD](../prd/studio-creator-profile.md) | TBD (create with implementation PR) | TBD (create with implementation PR) |

## Out of Scope for Phase 4

- Ticketing, material management, inventory — [Phase 5 Track B](./PHASE_5.md#track-b-operations-expansion-ticketing-materials-inventory).
- Advanced compensation engine (bonus, OT, tiered/volume commission) — [Phase 5 Track A](./PHASE_5.md#track-a-pl-revenue-side-p-side-completion).
- Creator HR & operations (HRMS, platform API integrations, fixed cost tracking) — [Phase 5 Track A](./PHASE_5.md#track-a-pl-revenue-side-p-side-completion).
- Full-text search, admin UX searchability refactor — Phase 5 (either track).
- Studio reference data management (clients, platforms, types, standards, statuses) — [Phase 5 Track C](./PHASE_5.md#track-c-studio-autonomy-completion).
- Studio creator profile editing (name/alias at studio level) — [Phase 5 Track C](./PHASE_5.md#track-c-studio-autonomy-completion).
- Studio snapshot/audit trail visibility — [Phase 5 Track C](./PHASE_5.md#track-c-studio-autonomy-completion).

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

### Extended Scope (2026-03-22) — Workstream Lifecycle

Phase 4 expanded to cover full P&L operator foundations plus a critical creator-onboarding correction. The workstreams below are tracked across Waves 1-3:

| Workstream                                       | Lifecycle Doc                                                                   | Status                                | L-side Hook                                                                               | Wave |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| Sidebar redesign (erify_studios)                 | [SIDEBAR_REDESIGN.md](../../apps/erify_studios/docs/design/SIDEBAR_REDESIGN.md) | 🔲 Planned                             | —                                                                                         | 1    |
| Studio creator roster CRUD                       | [studio-creator-roster.md](../features/studio-creator-roster.md)                | ✅ Implemented                          | `StudioCreator.defaultRate/defaultRateType/defaultCommissionRate` → creator cost fallback | 1    |
| Studio creator onboarding + roster-first assignment | [studio-creator-onboarding.md](../prd/studio-creator-onboarding.md)              | 🔲 Planned (critical-path blocker)      | Removes `/system/*` dependency for new talent intake; makes active roster membership mandatory for assignment | 1    |
| Studio member roster                             | [studio-member-roster.md](../features/studio-member-roster.md)                  | ✅ Shipped (PR #28)                     | `StudioMembership.baseHourlyRate` → shift labor cost                                      | 1    |
| Compensation line items                          | [compensation-line-items.md](../prd/compensation-line-items.md)                 | 🔲 Planned (post-Wave 1)               | Supplemental cost items (bonus, allowance, OT, deduction) for members + creators; no implicit cross-show proration in Phase 4 | R+   |
| Show planning export with cost preview           | [show-planning-export.md](../prd/show-planning-export.md)                       | 🔲 Planned                             | `estimated_total_cost` column from economics                                              | 2    |
| Creator availability hardening (strict mode)     | [creator-availability-hardening.md](../prd/creator-availability-hardening.md)   | 🔲 Planned (depends on onboarding gate) | Conflict enforcement: overlap, roster state, inactive                                     | 2    |
| P&L revenue workflow (GMV/sales input)           | [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md)                       | 🔲 Planned (open design Qs)            | Activates COMMISSION/HYBRID creator cost computation                                      | 3    |
| Studio show management (CRUD)                    | [studio-show-management.md](../prd/studio-show-management.md)                   | 🔲 Planned (studio autonomy gap)       | Studios can create/update/delete shows without `/admin/*`; enables studio-owned cost tracking | 1+   |
| Studio schedule management                       | [studio-schedule-management.md](../prd/studio-schedule-management.md)           | 🔲 Planned (studio autonomy gap)       | Studios can create/publish schedules without `/admin/*`; schedule-level cost grouping       | 1+   |

### Implementation Sequencing

#### Pre-Implementation Gates

| Gate | Blocks | Status |
| --- | --- | --- |
| **Studio creator onboarding + roster-first assignment** — ship studio-side create/onboard flow outside `/system/*` and reject off-roster assignments | Wave 2: Creator Availability Hardening; completion of studio creator management in Phase 4 | 🔲 Planned (critical path) |
| **Economics cost model review** — review cost components (bonus, OT, allowances) and design CompensationLineItem integration | Wave 2: Show Planning Export | ⏸️ Deferred to after Wave 1 |
| **Compensation line items** — implement `CompensationLineItem` + `CompensationTarget` schema, CRUD, and economics integration | Wave 2: Show Planning Export (line items feed into economics aggregation) | 🔲 Planned (post-Wave 1) |
| **Economics merge** — merge `feat/show-economics-baseline` (with compensation line item integration) to `master` | Wave 2: Show Planning Export | ⏸️ Deferred to after cost model review + compensation line items |
| **Financial arithmetic decision** — adopt `big.js` or accept floating-point risk | Wave 3: P&L Revenue Workflow | 🔲 Pending |

#### Dependency Graph

```
Pre-dev (parallel with Wave 1):
    └─► Task Template Migration ─────────────────── (operational CSV rebuild completed on March 24, 2026)

Wave 1 (in progress):
    ├─► Sidebar Redesign ──────────────────────────── (FE-only, no deps)
    ├─► Studio Creator Roster ─────────────────────── ✅ Implemented
    ├─► Studio Creator Onboarding + Roster-First ──── (depends on creator roster; blocks creator-management completion)
    │       └─► Includes fix for roster enforcement bug (non-rostered creators silently assigned)
    └─► Studio Member Roster ──────────────────────── ✅ Shipped (PR #28)

Wave 1+ (studio autonomy — can parallel with post-Wave 1 economics work):
    ├─► Studio Show Management ──────────────────── (no deps; removes admin bottleneck for show CRUD)
    └─► Studio Schedule Management ──────────────── (benefits from show management; removes admin bottleneck for schedules)

Post-Wave 1: Economics cost model review + Compensation line items
    ├─► Decide additional cost components (bonus, OT, allowances)
    ├─► Implement CompensationLineItem + CompensationTarget (schema, CRUD, economics integration)
    └─► Revise and merge feat/show-economics-baseline (with line item aggregation)

Economics merged to master (gate for Wave 2):
    ├─► Wave 2: Show Planning Export ──────────────── (needs economics endpoints)
    └─► Wave 2: Creator Availability Hardening ────── (needs creator roster + onboarding gate)

Design Qs resolved + big.js adopted (gate for Wave 3):
    └─► Wave 3: P&L Revenue Workflow ──────────────── (needs design Q resolution + big.js)
            └─► Removes @preview markers, activates COMMISSION/HYBRID

Phase 5 (studio autonomy completion):
    ├─► Studio Reference Data ───────────────────── (clients, platforms, types, standards, statuses)
    ├─► Studio Creator Profile Editing ──────────── (name/alias at studio level)
    └─► Studio Snapshot/Audit Trail ─────────────── (version history for studios)
```

#### Wave 1 — Foundation

| Workstream                | Size | Scope                                                                                                                                 |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Sidebar Redesign**      | S    | Pure FE refactor: `sidebar-config.tsx` + `studio-route-access.ts`. Ships navigation homes for all new pages.                          |
| **Studio Creator Roster** | M    | ✅ Implemented. Delivered root `GET`/`POST`/`PATCH` roster routes, version-guarded compensation updates, the `/studios/$studioId/creators` page, and inactive-roster enforcement for availability discovery and bulk assignment writes. |
| **Studio Creator Onboarding + Roster-First Assignment** | M    | New studio-side onboarding flow under `/studios/$studioId/creators`: search existing catalog first, create + roster new creators outside `/system/*`, and enforce active-roster-only assignment in creator mapping. |
| **Studio Member Roster**  | M    | ✅ Shipped. No migration needed; delivered `POST`/`PATCH`/`DELETE` endpoints, self-demotion guard, and the studio member roster page. |

**Milestone 1**: Sidebar shows function-based groups with new page navigation. Studio admins can onboard creators without `/system/*`, and creator mapping is roster-first. Economics endpoint reflects roster-managed rates for FIXED creators; shift costs reflect updated `baseHourlyRate`.

#### Wave 1+ — Studio Autonomy (parallel with post-Wave 1 economics)

| Workstream                    | Size | Scope                                                                                                                                                   |
| ----------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Studio Show Management**    | M    | Studio-scoped show CRUD (`POST`/`PATCH`/`DELETE`). Admin + Manager create/update; Admin-only delete. Platform assignment at studio level. No cross-studio. |
| **Studio Schedule Management** | M    | Studio-scoped schedule CRUD + validate/publish/duplicate/snapshots/monthly overview. Admin publish/delete; Manager create/update/duplicate/view.           |

**Milestone 1+**: Studios can create, update, and delete shows and schedules without system admin intervention. Combined with Wave 1 roster features, studios are operationally self-sufficient for day-to-day workflows.

#### Wave 2 — Export & Assignment Integrity

| Workstream                         | Size | Scope                                                                                                                                                                     |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Show Planning Export**           | M    | New endpoint with CSV/JSON, date-range filtering, `estimated_total_cost` column from economics. Performance cap needed for batch computation.                             |
| **Creator Availability Hardening** | M    | `strict=true` mode on availability endpoint: overlap detection, roster membership check, typed error codes in `@eridu/api-types`. Depends on roster-first onboarding so `NOT_IN_ROSTER` is studio-operator-resolvable. Resolves `add-creator-dialog.tsx` TODO. |

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
| 1c | Studio member roster CRUD | — | — | ✅ Shipped (PR #28, 2026-03-27) |
| 1d | Studio creator onboarding + roster-first assignment | `feat/studio-creator-onboarding` | PR #1b merged (creator roster) | PRD review → BE/FE design → code + tests |
| R | Economics cost model review | — | Wave 1 complete | Review cost components, design CompensationLineItem integration |
| R+ | Compensation line items | `feat/compensation-line-items` | Wave 1 complete | Schema migration + CRUD + economics service integration |
| 0 | Economics baseline merge | `feat/show-economics-baseline` → `master` | Cost model review + compensation line items done | Code (revised with line item aggregation) + BE/FE design docs |
| 2a | Show planning export | `feat/show-planning-export` | PR #0 merged (economics on master) | PRD review → BE/FE design → code + tests |
| 2b | Creator availability hardening | `feat/creator-availability-hardening` | PR #1d merged (roster-first onboarding gate) | PRD review → BE/FE design → code + tests |
| 1e | Studio show management | `feat/studio-show-management` | None (can start immediately) | PRD review → BE/FE design → code + tests |
| 1f | Studio schedule management | `feat/studio-schedule-management` | Benefits from PR #1e (show management) | PRD review → BE/FE design → code + tests |
| 3 | P&L revenue workflow | `feat/pnl-revenue-workflow` | Design Qs resolved + big.js adopted | PRD review → BE/FE design → code + tests |

PR P (template migration) runs in parallel with Wave 1. PRs 1a/1b can be developed and reviewed in parallel; PR 1c is shipped. PR 1d is now on the critical path for complete studio creator management. **PRs 1e/1f (studio autonomy)** have no hard prerequisites and can run in parallel with post-Wave 1 economics work — 1e (show management) should land before 1f (schedule management) since schedules group shows. Economics cost model review (PR #R) and compensation line items (PR #R+) run post-Wave 1, before economics merge. PRs 2a/2b wait for their respective gates.

Per-PR workflow: review PRD → update/refine the relevant per-feature BE/FE design docs under `apps/*/docs/design/` → implement → post-ship knowledge-sync.

### Current Execution Plan (updated 2026-03-28)

After PR #30 (studio creator roster) merges to `master`, the next actions are:

#### Immediate (start after PR #30 merge)

| Priority | PR | Workstream | Size | Why Now |
| --- | --- | --- | --- | --- |
| **Primary** | 1d | [Studio Creator Onboarding + Roster-First](../prd/studio-creator-onboarding.md) | M | **Critical path blocker** for Wave 1 completion. Fixes roster enforcement bug, removes `/system/*` dependency, unblocks Wave 2. Also addresses 2 minor code warnings from PR #30 review (cache invalidation helper export, internal schema enum). |
| Parallel | 1a | Sidebar Redesign | S | FE-only, no deps. Ships navigation homes for all new pages. Quick win. |
| Parallel | 1e | [Studio Show Management](../prd/studio-show-management.md) | M | Highest-impact studio autonomy gap. No deps. PRD ready. Every show setup currently requires system admin. |

**Per-PR workflow**: review PRD → create BE/FE design docs under `apps/*/docs/design/` → implement → post-ship knowledge-sync.

#### After Wave 1 Completes (PR #1d merged)

| Priority | PR | Workstream | Gate |
| --- | --- | --- | --- |
| 1 | R | Economics cost model review | Wave 1 complete |
| 2 | R+ | [Compensation Line Items](../prd/compensation-line-items.md) | Cost model review done |
| 3 | 0 | Economics baseline merge (`feat/show-economics-baseline` → `master`) | Compensation line items done |
| Parallel | 1f | [Studio Schedule Management](../prd/studio-schedule-management.md) | Benefits from PR #1e |

#### After Economics Merge (PR #0 on master)

| Priority | PR | Workstream | Gate |
| --- | --- | --- | --- |
| 1 | 2a | [Show Planning Export](../prd/show-planning-export.md) | Economics on master |
| 2 | 2b | [Creator Availability Hardening](../prd/creator-availability-hardening.md) | PR #1d merged (roster-first gate) |

#### After Design Qs Resolved + big.js Adopted

| Priority | PR | Workstream | Gate |
| --- | --- | --- | --- |
| 1 | 3 | [P&L Revenue Workflow](../prd/pnl-revenue-workflow.md) | Design Qs resolved + big.js |

#### Deferred to Phase 5 (Track C: Studio Autonomy Completion)

- Studio reference data management — [PRD](../prd/studio-reference-data.md)
- Studio creator profile editing — [PRD](../prd/studio-creator-profile.md)
- Studio snapshot/audit trail visibility

### Risks & Open Items

| Item | Risk | Mitigation |
| --- | --- | --- |
| Economics cost model may need rework for bonus/OT/allowances | High — could require architecture changes | Review after Wave 1 when roster data layer is stable; revise before merge |
| P&L Revenue Workflow has 4 unresolved design questions | High — blocks Wave 3 entirely | Resolve during Wave 1 so Wave 3 can start without delay |
| Studio creator management is still incomplete without studio-side onboarding | High — studios still depend on `/system/*` for new talent; roster can be bypassed in mapping | Ship studio creator onboarding + roster-first assignment before marking creator management complete |
| Task template migration depends on staging data availability | Medium — blocks operational readiness | Export samples early; can proceed with representative examples |
| Show Planning Export per-show economics batch cost | Medium — performance at scale | Define cap (max 90-day range) and batch computation strategy |
| No financial arithmetic library — JS `Number` with `.toFixed(2)` | Medium — floating-point accumulation | Adopt `big.js` before Wave 3 revenue workflow |
| Roster enforcement bug — non-rostered creators silently assigned to shows | High — roster can be bypassed entirely | Fix in studio creator onboarding PR (roster-first assignment enforcement) |
| Studio show/schedule management adds scope to Phase 4 | Medium — extends timeline | Wave 1+ has no deps on economics; can parallel with cost model review |
| Economics branch drift — `feat/show-economics-baseline` unmerged since 2026-03-22 | Medium — merge conflict risk grows | Rebase periodically as Wave 1 features merge to master |

### Task Submission Reporting & Export (Shipped)

- Status: ✅ Shipped (PR #16, commit `831b58ca`, 2026-03-21)
- Feature doc: [task-submission-reporting.md](../features/task-submission-reporting.md)
- Canonical docs: [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)

## Definition of Done (Phase 4)

- Mapping/assignment flow is stable and merged-ready. ✅
- Creator mapping PRD intent and BE/FE design docs are synced and traceable by route/contract. ✅
- Economics baseline (variable cost side) shipped: per-show and grouped endpoints. ✅
- Studio member roster with `baseHourlyRate` editing implemented. ✅
- Studio creator roster CRUD with compensation defaults implemented. ✅
- Studio-side creator onboarding outside `/system/*` is shipped, and active studio roster membership is required for creator assignment.
- Compensation line items (`CompensationLineItem` + `CompensationTarget`) shipped with economics integration.
- P&L revenue workflow design questions resolved and GMV/sales input shipped.
- Show planning export (pre-show, with cost column) shipped.
- Creator availability strict-mode endpoint (overlap + roster conflict) shipped.
- Sidebar redesigned to function-based groups in `erify_studios`.
- Studio show CRUD shipped — studios can create, update, and delete shows without `/admin/*`.
- Studio schedule management shipped — studios can create, validate, publish, and duplicate schedules without `/admin/*`.
- Revenue side of P&L (COMMISSION/HYBRID cost activation) tracked in [pnl-revenue-workflow.md](../prd/pnl-revenue-workflow.md).
