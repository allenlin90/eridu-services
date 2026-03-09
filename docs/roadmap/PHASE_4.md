# Phase 4: P&L Visibility & MC Operations

> **Status**: ⚠️ Re-baselining in progress (core delivered on 2026-03-07)

## Goal

Phase 4 makes show-level profitability visible by connecting talent staffing, compensation, and show performance into one operational and financial flow.

## Why Re-baseline Now

Core Phase 4 features shipped, but verification found gaps that block final close:

1. MC roster is still global, not studio-scoped.
2. No explicit creator onboarding flow for studio talent pool management.
3. Assignment UX still has edge-case defects (for example, combobox behavior around inputs like `mc 1`).
4. Documentation drift exists between shipped behavior and canonical docs.

## Final Phase 4 Scope (Revised)

### Workstream 1: RBAC and route policy hardening

- Keep current role model (`ADMIN`, `MANAGER`, `MEMBER`, `TALENT_MANAGER`, `DESIGNER`, `MODERATION_MANAGER`).
- Keep financial overview restricted to `ADMIN` and `MANAGER`.
- Keep creator staffing actions available to `ADMIN`, `MANAGER`, `TALENT_MANAGER`.
- Ensure BE guards and FE route policy remain consistent with `ROLE_ACCESS_MATRIX.md`.

### Workstream 2: Studio MC roster foundation (`StudioMc`)

- Add `StudioMc` schema and migration/backfill.
- Introduce studio-scoped creator pool with `isActive` and studio default compensation.
- Preserve existing `ShowMC` linkage (no breaking relation refactor).

Reference design: [STUDIO_MC_ROSTER.md](../proposals/STUDIO_MC_ROSTER.md)

### Workstream 3: Creator onboarding workflow (missing today)

Add first-class onboarding flow for studio-scoped creators:

1. Add creator to studio roster.
2. Configure studio-level compensation defaults (optional override of global MC defaults).
3. Set active/inactive roster status.
4. Use roster members for assignment flows.

### Workstream 4: Studio membership roster (new scope extension)

Add a dedicated studio membership roster flow for helper/task-assignment operations:

1. Manage helper-ready studio members in a roster workflow.
2. Keep this workflow separate from creator roster concerns.
3. Restrict member roster management to `ADMIN` and `MANAGER`.
4. Use member roster helper-eligibility in task-assignment readiness and assignee selection flows.

### Workstream 5: Assignment and availability consistency

- Keep bulk modes:
  - `PATCH` append
  - `PUT` replace
- Align availability with studio roster scope.
- Fix creator search/mapping UX defects in bulk dialog and show-level mapping.
- Preserve existing task generation and assignment flows (no behavior regression).

### Workstream 6: Economics alignment and regression safety

- Move compensation fallback from 2-tier to 3-tier:
  - `ShowMC -> StudioMc -> MC`
- Keep P&L formulas unchanged.
- Ensure no economics regression after migration/backfill.

## Implementation Sequence and Verification Gates

### Step 1: Data and contract foundation

Deliverables:
- `StudioMc` Prisma model.
- One consolidated Prisma-generated migration for Phase 4 remaining scope, then documented manual SQL adjustments if needed.
- Backfill SQL for `(studio_id, mc_id)` pairs derived from historical assignments.

Verify:
- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api test`
- Deterministic local DB cycle:
  - `pnpm --filter erify_api db:local:refresh`
  - Optional cross-app auth mapping sync:
    - `pnpm --filter erify_api db:extid:sync` (pull from auth DB IDs)
- Migration dry-run on local DB clone and rollback simulation.

### Step 2: Backend roster and onboarding APIs

Deliverables:
- Studio roster endpoints (list/add/update status/remove).
- Assignment endpoints updated to respect roster scope.
- Availability endpoint filtered by roster first, then conflict window.
- Bulk assignment behavior kept as append/replace with clear response semantics.

Verify:
- Controller/service/repository tests for roster CRUD and availability filtering.
- Role-access tests for all new/updated endpoints.

### Step 3: Frontend onboarding and mapping UX

Deliverables:
- Studio creators routes are purpose-split for clarity:
  - `/studios/:studioId/creators` for roster onboarding/list management.
  - `/studios/:studioId/creators/mapping` for show assignment workflows.
- Roster page supports onboarding lifecycle (add/set defaults/activate/deactivate).
- Bulk mapping dialog resolves current search and selection clarity issues.
- Existing assigned creators are visible and actionable for replace/append decisions.

Verify:
- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios test`
- Smoke flow: onboard creator -> assign (append/replace) -> confirm show mapping.

### Step 4: Studio member roster for task assignment (new)

Deliverables:
- Define member roster data model/workflow in studio membership domain.
- Expose member roster management for `ADMIN` and `MANAGER`.
- Integrate member-roster helper-eligibility constraints into task assignment readiness and assignment UI.
- Backend foundation implemented:
  - `GET /studios/:studioId/studio-memberships` is now `ADMIN`/`MANAGER`.
  - `POST /studios/:studioId/studio-memberships` supports studio-scoped membership invite/onboarding.
  - `PATCH /studios/:studioId/studio-memberships/:id/role` supports role change in member roster workflow (`ADMIN` only).
  - `PATCH /studios/:studioId/studio-memberships/:id/helper` toggles helper readiness in membership metadata.
  - Task assignment enforcement now requires helper-enabled assignee for non-`ADMIN`/`MANAGER` roles.
  - Helper toggle applies optimistic-concurrency retry (via `updatedAt` guard) to reduce lost updates on metadata writes.
  - Task assignee resolution now uses scoped membership lookup (no studio-wide membership list scan).
- Frontend baseline implemented:
  - Studio Admin navigation includes dedicated `Member Roster` route:
    - `/studios/:studioId/members`
  - Member roster management is now route-based (not modal state coupled to review queue).
  - Task assignment comboboxes only list helper-eligible members (plus role-default `ADMIN`/`MANAGER`).
  - Helper roster includes invite-member and role-change actions in-page.
  - Roster UX polish applied for both creator/member roster pages:
    - simplified action-first layout (summary cards removed)
    - paginated table parity with search/filter toolbar and pagination footer
    - search-aware empty states
    - clearer action labels and selected-state feedback for onboarding actions
  - Invite flow now uses searchable user lookup combobox (no raw `user_id` input required).

Verify:
- Role-access tests for member roster endpoints and FE route visibility.
- Task-assignment smoke flow using member roster membership.

### Step 5: Economics integration and regression checks

Deliverables:
- Economics service reads 3-tier fallback.
- Existing economics APIs remain contract-compatible.

Verify:
- Economics unit tests for fixed/commission/hybrid scenarios across fallback tiers.
- Snapshot comparison before/after migration to validate expected parity for unchanged data.

### Step 6: Documentation and knowledge sync close

Deliverables:
- Canonical docs updated and cross-linked.
- Skills/rules updated for migration workflow and roster/onboarding patterns.

Verify:
- `docs/roadmap/PHASE_4.md`
- `apps/erify_api/docs/MC_OPERATIONS.md`
- `apps/erify_api/docs/SHOW_ECONOMICS.md`
- `apps/erify_studios/docs/MC_MAPPING.md`
- `docs/product/ROLE_ACCESS_MATRIX.md`
- `docs/product/BUSINESS.md`

## Exit Criteria to Mark Phase 4 Complete

1. Studio-scoped creator roster exists and is used by assignment/availability.
2. Creator onboarding workflow exists in both BE and FE.
3. Studio member roster workflow exists for task assignment (`ADMIN`/`MANAGER` owned).
4. Bulk append/replace behavior is stable and tested.
5. Economics uses 3-tier fallback without regression in core calculations.
6. Canonical docs match shipped behavior (no endpoint/method drift).

## Merge Gate Checklist (TODO Before Production Merge)

1. Scope freeze and final diff audit across BE/FE/docs.
2. Confirm one consolidated branch migration only.
3. Run full verification:
   - `pnpm --filter erify_api lint`
   - `pnpm --filter erify_api typecheck`
   - `pnpm --filter erify_api test`
   - `pnpm --filter erify_studios lint`
   - `pnpm --filter erify_studios typecheck`
   - `pnpm --filter erify_studios test`
4. Fresh-env rehearsal:
   - reset DB, migrate, seed, ext-id sync
   - smoke test core Phase 4 flows end-to-end
5. RBAC regression check against `docs/product/ROLE_ACCESS_MATRIX.md`.
6. API contract sanity check (document all intentional breaking changes).
7. Migration risk review (data impact, backfill behavior, runtime expectations).
8. Deployment runbook finalized (downtime steps + rollback/forward-fix plan).
9. Final docs and skills sync to shipped behavior.
10. Merge gate sign-off checklist completed by owner(s).

## Deferred From Phase 4

Features deferred to later phases:

- Ad-hoc ticketing (cross-functional, show/client-targeted tickets)
- Material management engine (asset versioning, show-material linking)
- Review quality hardening (transition enforcement, rejection notes)
- Client self-service (separate FE app)

## Canonical Docs

- [MC Operations](../../apps/erify_api/docs/MC_OPERATIONS.md)
- [Show Economics](../../apps/erify_api/docs/SHOW_ECONOMICS.md)
- [MC Mapping UI](../../apps/erify_studios/docs/MC_MAPPING.md)
- [Role Access Matrix](../product/ROLE_ACCESS_MATRIX.md)
- [Studio MC Roster Proposal](../proposals/STUDIO_MC_ROSTER.md)
