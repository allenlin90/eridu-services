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
  - Keep only one active scope branch locally at a time (current: `cutover/s3-studios-frontend-creator-cutover`).
  - Create the next scope branch only when previous scope is merged into `master`.
  - Delete completed/inactive scope branches to reduce branch noise.
- **Planned cutover scope branch names (create on demand)**:
  - `cutover/s1-creator-cutover-data-contracts` (completed)
  - `cutover/s2-backend-creator-domain-cutover` (completed)
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

- **Current active scope**: `S4` cutover stabilization + parity hardening (ready to merge)
- **Master merge gate**: per-scope merge allowed once smoke-green
- **Post-cutover start gate**: begin `S5` only after `S4` is merged to `master`
- **Current status by scope**:
  - `S1`: merged to `master` and deployed (2026-03-11)
  - `S2`: merged to `master` and deployed (2026-03-11)
  - `S3`: merged to `master` and deployed (2026-03-11)
  - `S4`: ready to merge to `master` (verification complete on 2026-03-11)
  - `S5`: planned (post-cutover)
  - `S6`: planned (post-cutover)
  - `S7`: planned (post-cutover)
- **S4 kickoff slices (stabilization-only)**
  - `S4-A` Compatibility contraction: completed.
  - `S4-B` Backend contract tightening: completed.
  - `S4-C` Membership/assignment parity: completed.
  - `S4-D` Cutover cleanup: completed (verification + merge-readiness sign-off).
- **S3 progress (frontend creator-first cutover)**
  - System admin route switched from `/system/mcs` to `/system/creators`.
  - Sidebar/nav updated from **MCs** to **Creators**.
  - Creator management API calls switched to creator-first endpoints (`/admin/creators`).
  - Creator management query keys switched to `['creators', ...]`.
  - Internal studios module naming cut over from `features/mcs/*` to `features/creators/*` (API hooks, dialogs, table config, tests).
  - Legacy fallback field reads (`mcs`, `mc_*`, `mc_names`) are centralized in `erify_studios/src/lib/creator-utils.ts` instead of scattered active UI code.
  - Show admin list filter switched to `creator_name` (replacing active `mc_name` usage).
  - Show edit form now submits `creators[]` (creator-first payload) with legacy `mcs[]` read fallback.
  - Studio task/show UIs now display **Creators** labels with legacy data fallback (`mc_*`) where needed.
  - Verification passed on branch:
  - `pnpm --filter erify_studios lint`
  - `pnpm --filter erify_studios typecheck`
  - `pnpm --filter erify_studios test`
  - `pnpm --filter erify_studios build`
- **S3 landed commits (latest first)**:
  - `fb732652` test(cutover-s3): cover creator compatibility fallback helpers
  - `190149f4` refactor(cutover-s3): centralize creator fallback mapping in studios frontend
  - `3791b3d0` docs(cutover-s3): update studios creator route/module references
  - `b35753b8` refactor(cutover-s3): rename studios creator module from mcs to creators
  - `f0f2fec8` feat(cutover-s3): switch studios creator surfaces to creator-first naming
- **S3 sign-off evidence (2026-03-11)**:
  - Verification gates passed:
  - `pnpm --filter erify_studios lint`
  - `pnpm --filter erify_studios typecheck`
  - `pnpm --filter erify_studios test`
  - `pnpm --filter erify_studios build`
  - Manual smoke checklist:
  - `/system/creators` loads and CRUD actions work for system admin.
  - `/system/shows` creator search uses `creator_name` filter successfully.
  - Show update dialog preserves selected creators (creator-first payload with compatibility fallback read).
  - Studio dashboard operational-day show list renders creator names.
  - `/studios/:studioId/my-tasks` show-group details render creators without MC-labeled UI.
- **S4 progress (stabilization + parity hardening)**
  - `S4-A` started on `cutover/s4-membership-mapping-stabilization`.
  - Removed remaining `mc/mcs` fallback reads from active `erify_studios` runtime code.
  - Tightened creator utility mapping to creator-first fields only (`creator_id`, `creator_name`, `creator_names`).
  - Removed legacy `mcs` fallback field from studios show API local type.
  - Added/updated utility tests to lock creator-first behavior.
  - `S4-B` route contraction started:
  - removed legacy admin aliases `/admin/mcs` and `/admin/show-mcs`.
  - removed legacy show assignment endpoints `PATCH /admin/shows/:id/mcs/remove` and `PATCH /admin/shows/:id/mcs/replace`.
  - retained creator-first endpoints only for these admin surfaces.
  - removed legacy `mc_name` query alias from show filtering contracts/repository (creator-first `creator_name` is now canonical).
  - removed legacy show-orchestration remove/replace `mcs` DTO aliases and service aliases (`removeMCsFromShow`, `replaceMCsForShow`).
  - removed legacy `mcs` input alias from show create/update assignment contracts (creator assignments are creator-only at API boundary).
  - removed legacy `mcs` output alias from show orchestration responses (`showWithAssignmentsDto` now emits `creators[]` only).
  - removed legacy `mc_id` input alias and legacy `mc_*` output aliases from show-creator contract (`admin/show-creators` is creator-only).
  - removed legacy `mc` alias from backdoor user create payload contract and `user-with-mc` DTO output (creator-only API boundary).
  - removed legacy task-summary aliases (`mcs`, `mc_names`) from task contracts and studio task-orchestration responses.
  - removed legacy `mcs[]` schedule-planning plan-document alias at API boundary (creator-only `creators[]` accepted).
  - aligned schedule validation/publishing flows to consume `creators[]` plan assignments end-to-end (DB `showMC` internals unchanged).
  - removed legacy `mc_links_*` publish-summary aliases (creator-only `creator_links_*` counters at API boundary).
  - `S4-C` parity hardening started:
  - user creation payload/DTO symbols are now creator-first in admin/backdoor APIs (Prisma `mc` relation internals unchanged).
  - removed remaining `userWithMc*` DTO symbol naming in favor of `userWithCreator*`.
  - switched creator model schema contracts to import from `@eridu/api-types/creators` (no runtime imports remain on `@eridu/api-types/mcs`).
  - removed legacy `@eridu/api-types/mcs` package entrypoint and alias schemas from shared contracts.
  - renamed admin backend module paths to creator-first structure (`admin/creators/*`, `admin/show-creators/*`) and aligned controller/module symbols.
  - renamed show-orchestration internal assignment payload fields to creator-first naming (`creators`, `showCreators`, `creatorId`) while keeping DB `showMC` persistence internals unchanged.
  - renamed schedule-planning internal lookup variable naming from `mcs` to `creators` for creator-first consistency (no behavior change).
  - updated schedule-planning manual payload generator to emit `creators[].creatorId`.
  - Verification passed on branch:
  - `pnpm --filter erify_studios lint`
  - `pnpm --filter erify_studios typecheck`
  - `pnpm --filter erify_studios test`
  - `pnpm --filter erify_studios build`
  - `pnpm --filter @eridu/api-types lint`
  - `pnpm --filter @eridu/api-types typecheck`
  - `pnpm --filter @eridu/api-types test`
  - `pnpm --filter erify_api lint`
  - `pnpm --filter erify_api typecheck`
  - `pnpm --filter erify_api test -- admin-show.controller.spec.ts admin-creator.controller.spec.ts admin-show-creator.controller.spec.ts`
  - `pnpm --filter erify_api test -- admin-show.controller.spec.ts show.repository.spec.ts`
  - `pnpm --filter erify_api test -- admin-show.controller.spec.ts show-orchestration.service.spec.ts`
  - `pnpm --filter erify_api test -- admin-show.controller.spec.ts admin-show-creator.controller.spec.ts show-orchestration.service.spec.ts`
  - `pnpm --filter erify_api test -- admin-show.controller.spec.ts admin-show-creator.controller.spec.ts show-orchestration.service.spec.ts backdoor-user.controller.spec.ts user.schema.spec.ts`
  - `pnpm --filter erify_api test -- show-orchestration.service.spec.ts admin-show.controller.spec.ts`
  - `pnpm --filter erify_api test -- validation.service.spec.ts publishing.service.spec.ts schedule-planning.service.spec.ts schedule-planning.schema.spec.ts`
  - `pnpm --filter erify_api test -- schedule-planning.schema.spec.ts validation.service.spec.ts publishing.service.spec.ts schedule-planning.service.spec.ts schedule.service.spec.ts`
  - `pnpm --filter erify_api test -- schedule-planning.schema.spec.ts publishing.service.spec.ts schedule-planning.service.spec.ts admin-schedule.controller.spec.ts`
  - `pnpm --filter erify_api test -- user.schema.spec.ts user.service.spec.ts admin-user.controller.spec.ts backdoor-user.controller.spec.ts`
  - `pnpm --filter erify_api test -- admin-creator.controller.spec.ts mc.service.spec.ts`
  - `pnpm --filter @eridu/api-types lint`
  - `pnpm --filter @eridu/api-types typecheck`
  - `pnpm --filter @eridu/api-types build`
  - `pnpm --filter erify_api test`
  - `pnpm --filter erify_api build`
  - `pnpm --filter erify_api test -- task-orchestration.service.spec.ts`
  - `pnpm --filter erify_studios lint`
  - `pnpm --filter erify_studios typecheck`
  - `pnpm --filter erify_studios test`
  - `pnpm --filter erify_studios build`
- **S4 final merge-readiness check (2026-03-11)**
  - Branch `cutover/s4-membership-mapping-stabilization` is clean and ahead of `master` by 17 commits.
  - Legacy runtime route/import cleanup confirmed:
  - no `/admin/mcs` route wiring
  - no `/admin/show-mcs` route wiring
  - no `@eridu/api-types/mcs` import usage
  - no `userWithMc*` DTO symbol usage
  - Remaining `mc/mcs` mentions in active runtime are explicit reject-legacy guards only (`z.never`) for schedule-planning payload compatibility enforcement.
- **S2 delivered scope (backend route/contract cutover)**:
  - Add creator-first admin route aliases:
    - `admin/creators` (alias of `admin/mcs`)
    - `admin/show-creators` (alias of `admin/show-mcs`)
    - `admin/shows/:id/creators/remove`
    - `admin/shows/:id/creators/replace`
  - Add creator-first DTO aliases for show orchestration payloads:
    - request aliases: `creator_ids`, `creators[].creator_id`
    - response alias: `creators[]` alongside legacy `mcs[]`
  - Add creator-first alias support for show-creator payload contract:
    - `admin/show-creators` accepts `creator_id` input alias
    - show-creator response includes `creator_id`, `creator_name`, `creator_alias_name` alongside legacy `mc_*`
  - Add creator-named orchestration methods (`removeCreatorsFromShow`, `replaceCreatorsForShow`) and route wiring.
  - Add creator-first show list filter alias support:
    - `creator_name` query alias for admin/studio show search (legacy `mc_name` retained)
  - Add creator-first studio task-summary parity:
    - `studios/:studioId/shows` task-summary query supports `creator_name` alias (`mc_name` retained)
    - task-summary show payload emits `creators[]` alongside legacy `mcs[]`
  - Harden creator route orchestration parity:
    - `removeCreatorsFromShow` / `replaceCreatorsForShow` run as first-class transactional paths
    - creator route replacement errors now return creator-labeled not-found messages
  - Add creator aliases on user payload contracts:
    - `create user` accepts `creator` input alias (legacy `mc` retained)
    - `user-with-mc` response emits `creator` alongside legacy `mc`
  - Add creator aliases in schedule-planning contracts:
    - plan document accepts `creators[]` assignments and normalizes to legacy `mcs[]`
    - publish summary emits `creator_links_*` alongside legacy `mc_links_*`
  - Add creator-first schedule validation parity:
    - validation accepts creator-only assignments (`creators[]`) without requiring legacy `mcs[]`
    - validation messages use creator-first wording (legacy DB/UID internals remain unchanged)
  - Keep legacy `mc` routes/contracts available during S2/S3 transition; final removal remains S4 gate.
- **S2 landed commits (latest first)**:
  - `a407092c` fix(manual-test): send origin header in auth login smoke script
  - `ffdf7401` refactor(cutover-s2): make creator orchestration paths first-class
  - `044a6b82` feat(cutover-s2): make schedule validation creator-first with mc fallback
  - `9551ebdf` feat(cutover-s2): add creator aliases in schedule planning contracts
  - `1f5fa71e` fix(cutover-s2): hydrate backdoor users before creator/mc serialization
  - `8df88a39` feat(cutover-s2): add creator aliases for user payloads
  - `cda4fecc` feat(cutover-s2): add creator aliases to studio show task summary
  - `d02b49c7` feat(show): add creator_name query alias with mc_name compatibility
  - `3391f260` refactor(erify_api): add creator-first show-creator payload and service aliases
  - `0f3380a8` feat(erify_api): add creator-first admin route and assignment DTO aliases
- **S2 sign-off evidence (2026-03-11)**:
  - Verification gates passed:
  - `pnpm --filter @eridu/api-types lint`
  - `pnpm --filter @eridu/api-types typecheck`
  - `pnpm --filter @eridu/api-types test`
  - `pnpm --filter erify_api lint`
  - `pnpm --filter erify_api typecheck`
  - `pnpm --filter erify_api test`
  - Runtime smoke passed:
  - `manual:schedule:regen-and-run` succeeded end-to-end (upload/validate/publish).
  - Admin creator route smoke succeeded:
  - `/admin/shows/:id/creators/replace` (success + creator-not-found path)
  - `/admin/shows/:id/creators/remove`
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
- 2026-03-11: S2 started with backend creator-first admin route aliases and show-orchestration creator DTO aliases (legacy `mc` routes retained for transition safety).
- 2026-03-11: Extended S2 with creator-first show-creator payload aliases and creator-named orchestration service methods.
- 2026-03-11: Added creator-first show list query alias (`creator_name`) with legacy `mc_name` compatibility.
- 2026-03-11: S2 merged into local `master`; tracker updated and next scope shifted to `S3`.
- 2026-03-11: S3 route/module cutover landed in `erify_studios` (`/system/creators`, `features/creators/*`, creator-first query keys/endpoints).
- 2026-03-11: S3 compatibility hardening landed with centralized fallback helper (`src/lib/creator-utils.ts`) and dedicated utility tests.
- 2026-03-11: S3 confirmed healthy on production; S4 branch started (`cutover/s4-membership-mapping-stabilization`) for stabilization/parity hardening.
- 2026-03-11: S4-A contraction landed in `erify_studios`: active runtime reads are creator-only (`creator_*`) with verification green.
- 2026-03-11: S4-B route contraction removed legacy admin aliases (`/admin/mcs`, `/admin/show-mcs`) and legacy show `mcs` assignment endpoints.
- 2026-03-11: S4-B query contraction removed legacy `mc_name` show-filter alias from shared schemas and repository logic.
- 2026-03-11: S4-B removed legacy show-orchestration `mcs` DTO/service aliases; creator remove/replace paths are now canonical.
- 2026-03-11: S4-B removed legacy `mcs` input alias from show create/update assignment contracts (`creators[]` only at API boundary).
- 2026-03-11: S4-B removed legacy `mcs`/`mc_*` aliases from show orchestration and show-creator API outputs; `admin/show-creators` contract is creator-only.
- 2026-03-11: S4-B removed legacy `mc` alias from user creation/backdoor payload contracts and `userWithMc` DTO output.
- 2026-03-11: S4-B removed legacy task-summary aliases (`mcs`, `mc_names`) from task contracts and studio task-orchestration output.
- 2026-03-11: S4-B removed legacy schedule-planning `mcs[]` payload alias; plan docs and manual payload generator are now creator-only (`creators[]`).
- 2026-03-11: S4-B removed legacy schedule publish-summary `mc_links_*` aliases; creator-only counters are now canonical.
- 2026-03-11: S4-C started with user/admin/backdoor creator-first naming parity: removed `userWithMc*` symbols and switched user creation payload internals from `mc` to `creator` (DB relation unchanged).
- 2026-03-11: S4-C updated creator model schema contracts to source from `@eridu/api-types/creators`; runtime `@eridu/api-types/mcs` imports are now eliminated.
- 2026-03-11: S4-C removed legacy shared contract export path `@eridu/api-types/mcs` and deleted alias schema files from `packages/api-types/src/mcs`.
- 2026-03-11: S4-C renamed admin backend module paths/symbols from `mcs/show-mcs` to `creators/show-creators` to remove lingering MC naming in active API module structure.
- 2026-03-11: S4-C renamed show-orchestration internal assignment payload fields from `mcs/showMcs/mcId` to creator-first naming (`creators/showCreators/creatorId`) with unchanged DB persistence model.
- 2026-03-11: S4-C renamed schedule-planning internal lookup variables from `mcs` to `creators` (behavior unchanged, creator-first readability only).
- 2026-03-11: S4-D final cleanup/check completed; full lint/typecheck/test/build gates passed for `@eridu/api-types`, `erify_api`, and `erify_studios`; branch marked ready to merge to `master`.
