# Phase 4 to Master: Scope-First Merge Program

> **Status**: Active execution plan
> **Last updated**: 2026-03-11

## Why this exists

`feat/phase-4-p-and-l` became too large to review and merge safely as one PR.
This file is the cross-session source of truth for slicing that work into reviewable, revertable PR scopes.

## Policy decisions

- Use `feat/phase-4-p-and-l` as implementation reference only, not as a direct merge unit.
- **Hard rule**: DO NOT use code from `feat/phase-4-p-and-l` directly.
- No cherry-pick replay, no bulk file copy, no direct patch lift from that branch.
- Re-implement each scoped change on cutover/post-cutover branches based on current decisions.
- Use the feature branch only to check proven patterns, edge cases, and expected behavior.
- Build each scope branch from current `master`.
- Scope PRs target `master` directly (one-by-one).
- Merge to `master` after each scope is smoke-green (do not wait for `S4` batch merge).
- Start post-cutover product work from refreshed branches after `S4` is merged to `master`.
- One PR = one topic with explicit non-goals and rollback plan.
- **Direct cutover policy (alpha environment)**:
  - Prefer direct `mc` -> `creator` rename/refactor.
  - Do not add new temporary compatibility layers unless a hard blocker is found.
- **Scope control policy (strict)**:
  - `S1` to `S4` are cutover-only (rename/refactor/parity hardening).
  - No net-new product features or workflow expansions in `S1` to `S4`.
  - Defer mapping/assignment enhancements to post-`S4` tracks.
- **Dependency policy**:
  - Economics scope starts only after mapping/assignment foundation is landed.

## Branch Topology

- **Reference only**: `feat/phase-4-p-and-l`
- **Active scope branch policy (one-by-one)**:
  - Keep only one active scope branch locally at a time (current: `cutover/s2-backend-creator-domain-cutover`).
  - Create the next scope branch only when previous scope is merged into `master`.
  - Delete completed/inactive scope branches to reduce branch noise.
- **Planned cutover scope branch names (create on demand)**:
  - `cutover/s1-creator-cutover-data-contracts` (completed)
  - `cutover/s2-backend-creator-domain-cutover` (active)
  - `cutover/s3-studios-frontend-creator-cutover`
  - `cutover/s4-membership-mapping-stabilization`
- **Planned post-cutover branch names (create on demand after S4->master)**:
  - `post-cutover/s5-mapping-assignment-foundation`
  - `post-cutover/s6-economics-preview-and-ops`
  - `post-cutover/s7-docs-agent-memory-sync`

## Scope Queue

### P0. System Route Layout Padding Hotfix (Completed)
- **Branch**: `merge/pre-s1-system-layout-padding` (merged, branch deleted)
- **Merged to master**: `a2f0fded` on 2026-03-11
- **Target areas**: `apps/erify_studios/src/routes/system/route.tsx` page container wrapper.
- **Reason**: restore expected `/system/*` page padding before starting scoped phase-4 merge slices.

### S1. Creator Naming Cutover: Data + Contracts
- **Branch**: `cutover/s1-creator-cutover-data-contracts`
- **Depends on**: none
- **Target areas**: Prisma schema/migration alignment, UID behavior, `@eridu/api-types` creator-first contracts.
- **Out of scope**: frontend route UI polish, docs/meta cleanup.
- **Done when**:
  - Creator-first IDs and schema/contract names are canonical.
  - No new runtime contract is introduced with `mc` naming.

### S2. Backend Creator Domain Cutover
- **Branch**: `cutover/s2-backend-creator-domain-cutover`
- **Depends on**: S1
- **Target areas**: `apps/erify_api` models/modules/controllers/services for creator/show-creator/studio-creator/admin surfaces.
- **Out of scope**: frontend route transitions, docs/meta.
- **Done when**:
  - Backend APIs used by studio/admin creator workflows are creator-first.
  - Backward-compatibility shims are not expanded.

### S3. Studios Frontend Creator Cutover
- **Branch**: `cutover/s3-studios-frontend-creator-cutover`
- **Depends on**: S2
- **Target areas**: `apps/erify_studios` creator routes, feature modules, API clients, query keys, route tree.
- **Out of scope**: backend-only migration scripts, docs/meta.
- **Done when**:
  - Studios creator workflows run on creator-first contracts.
  - Legacy `mc` naming is removed from active creator screens and API calls.

### S4. Cutover Stabilization + Parity Hardening
- **Branch**: `cutover/s4-membership-mapping-stabilization`
- **Depends on**: S3
- **Target areas**: cutover regressions, parity fixes, RBAC hardening, optimistic locking fixes caused by rename/refactor.
- **Out of scope**: new mapping UX, new assignment workflows, new role/features.
- **Done when**:
  - Creator cutover flows are parity-stable and smoke-green.
  - No net-new behavior is introduced versus pre-cutover workflows.

### S5. Mapping + Assignment Foundation (Post-Cutover)
- **Branch**: `post-cutover/s5-mapping-assignment-foundation`
- **Depends on**: S4
- **Target areas**: membership<->creator mapping model, assignment data flow, parity-safe UI/API foundations required for costs.
- **Out of scope**: economics calculation redesign, unrelated product backlog items.
- **Done when**:
  - Mapping/assignment workflow is stable on creator-first naming.
  - Required cost-input dimensions are available for economics scope.

### S6. Economics Preview + Rollout Ops (Post-Cutover)
- **Branch**: `post-cutover/s6-economics-preview-and-ops`
- **Depends on**: S5
- **Target areas**: economics preview behavior, migration rehearsal docs, backfill scripts.
- **Out of scope**: unrelated product backlog items.
- **Done when**:
  - Economics preview contract is consistent with mapping/assignment foundation.
  - Backfill/rehearsal tooling is executable and documented.

### S7. Docs / Agent / Memory Sync (Post-Cutover)
- **Branch**: `post-cutover/s7-docs-agent-memory-sync`
- **Depends on**: S6
- **Target areas**: roadmap/docs, `.agent/*`, `.claude/*` memory alignment.
- **Out of scope**: runtime behavior changes.
- **Done when**:
  - Documentation and agent memory match shipped behavior and merge strategy.

## Post-Cutover Queue (After S4 -> master)

- `S5` Mapping + Assignment Foundation (required before economics).
- `S6` Economics Preview + Rollout Ops.
- `S7` Docs / Agent / Memory Sync.
- Additional non-cutover role/product expansions.

## S1 Incident Preparedness

- Runbook: [PHASE_4_S1_HOTFIX_ROLLBACK.md](./PHASE_4_S1_HOTFIX_ROLLBACK.md)
- Policy:
  - Prefer roll-forward hotfix first.
  - Use new rollback migration only when roll-forward cannot restore service quickly.

## Post-S4 Cleanup Checklist (Tech Debt Control)

- Trigger: immediately after `S4` is merged to `master` and cutover rollout is stable.
- Deployment config cleanup:
  - [x] Reverted `.railway/erify_api.json` `preDeployCommand` back to migrate-only on 2026-03-11 (post-S1 deployment stabilization).
  - Remove temporary cutover wording from deployment/runbook docs.
- Script and command cleanup:
  - Remove temporary rollout-only command chains if no longer needed.
  - Keep backfill scripts only if retained as support tooling; otherwise archive/remove.
- Verification cleanup gate:
  - Run smoke on `/system/mcs`, `/admin/mcs`, and task assignment flow after cleanup.
  - Confirm no deploy-step dependency remains on one-time cutover operations.
- Done when:
  - Deploy pipeline is back to steady-state (no cutover-only hooks).
  - Docs and scripts reflect the post-cutover operating model.

## Execution Tracker

- **Current active scope**: `S2` backend creator domain cutover
- **Master merge gate**: per-scope merge allowed once smoke-green
- **Post-cutover start gate**: begin `S5` only after `S4` is merged to `master`
- **Current status by scope**:
  - `S1`: merged to `master` and deployed (2026-03-11)
  - `S2`: active
  - `S3`: pending
  - `S4`: pending
  - `S5`: planned (post-cutover)
  - `S6`: planned (post-cutover)
  - `S7`: planned (post-cutover)
- **S1 landed commits (latest first)**:
  - `25fd985e` feat(erify_api): canonicalize seeded mc uids to creator prefix
  - `8e64efbe` fix(studios): avoid refetching inactive show-task queries without queryFn
  - `8cdda661` feat(api-types): accept creator assignments in show update contract
  - `fe09536d` feat(api-types): add creator aliases to task and show summary contracts
  - `c23cda52` refactor(erify_api): generate canonical creator uids for new mc records
  - `d9329173` fix(erify_api): resolve mc uid aliases in repository and service paths
  - `61cfce07` fix(erify_api): accept creator uid aliases across mc endpoints
  - `59910c87` fix(erify_api): align mc admin dto with creator rate fields
  - `63a50ec7` feat(cutover-s1): add creator data-contract and db cutover foundation
- **S1 runtime-safety gate**:
  - Keep `/system/mcs` and `/admin/mcs` smoke-green after each commit before continuing.
- **S1 sign-off evidence (2026-03-11)**:
  - Verification gates passed:
  - `pnpm --filter @eridu/api-types lint`
  - `pnpm --filter @eridu/api-types typecheck`
  - `pnpm --filter @eridu/api-types test`
  - `pnpm --filter @eridu/api-types build`
  - `pnpm --filter erify_api lint`
  - `pnpm --filter erify_api typecheck`
  - `pnpm --filter erify_api test`
  - `pnpm --filter erify_api build`
  - `pnpm --filter erify_studios lint`
  - `pnpm --filter erify_studios typecheck`
  - `pnpm --filter erify_studios test`
  - `pnpm --filter erify_studios build`
  - No-reset runtime smoke passed on current DB state:
  - `pnpm --filter erify_api db:creator-uid:backfill` => `Creators to rewrite: 0`
  - `pnpm --filter erify_api db:studio-creator:backfill` => `Studio roster rows to backfill: 0`
  - `pnpm --filter erify_api manual:schedule:generate -- --shows=2 --clients=2` => payload generation succeeded
  - Note: API/FE interactive smoke remains required per environment before cutover merge to `master`.
- **S1 CD / rollout order (historical, completed)**:
  - Cutover deploy gate (pre-deploy hook) was executed in order during S1 rollout:  
    `pnpm --filter erify_api db:migrate:deploy`  
    `pnpm --filter erify_api db:creator-uid:backfill`  
    `pnpm --filter erify_api db:studio-creator:backfill`
  - This prevented app start before cutover backfills were complete.
  - Current steady-state pre-deploy is migrate-only:
    `pnpm --filter erify_api db:migrate:deploy`
  - Prisma Client generation stays in build (`pnpm --filter erify_api build` already runs `db:generate`).

## PR Definition of Done (every scope)

- Scope section in PR description: goal, in-scope, out-of-scope, rollback.
- Explicit confirmation in PR description: no direct code reuse from `feat/phase-4-p-and-l` (reference-only comparison).
- Verification for each changed workspace/package:
  - `pnpm --filter <workspace> lint`
  - `pnpm --filter <workspace> typecheck`
  - `pnpm --filter <workspace> test`
- Add `build` checks when package wiring/exports changed.
- Explicitly confirm no unrelated refactor drift.

## Session Handoff Log

- 2026-03-11: Switched strategy to integration-branch flow (`release/phase4-creator-cutover`) with scoped PRs merged there, then one final squash PR to `master`.
- 2026-03-11: Switched from integration-branch flow to direct scoped merges into `master` (S1 merged/deployed first to reduce hotfix risk).
- 2026-03-11: Deleted temporary `merge/*` helper branches; standardized cutover scope branches under `cutover/*`.
- 2026-03-11: Pre-S1 UI hotfix merged to `master` (`a2f0fded`) for `/system/*` page padding parity.
- 2026-03-11: Merge program initialized. Policy set to direct creator cutover (no compatibility phase-out by default).
- 2026-03-11: S1 marked complete with verification gates green and no-reset DB/script smoke evidence captured.
- 2026-03-11: Switched to one-scope-at-a-time branch hygiene; removed inactive local cutover branches and kept only active `S2` branch.
- 2026-03-11: Branch split updated: current implementation branch renamed to `cutover/s1-creator-cutover-data-contracts`; separate `cutover/s2-backend-creator-domain-cutover` branch recreated for next scope.
- 2026-03-11: Added S1 hotfix/rollback runbook to support fast incident response after merge.
