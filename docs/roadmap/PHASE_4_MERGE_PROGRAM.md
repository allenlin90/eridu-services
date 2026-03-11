# Phase 4 to Master: Scope-First Merge Program

> **Status**: Active execution plan
> **Last updated**: 2026-03-11

## Why this exists

`feat/phase-4-p-and-l` became too large to review and merge safely as one PR.
This file is the cross-session source of truth for slicing that work into reviewable, revertable PR scopes.

## Policy decisions

- Use `feat/phase-4-p-and-l` as implementation reference only, not as a direct merge unit.
- Build each scope branch from `master`.
- PRs should target `master` (dependencies allowed where unavoidable).
- One PR = one topic with explicit non-goals and rollback plan.
- **Direct cutover policy (alpha environment)**:
  - Prefer direct `mc` -> `creator` rename/refactor.
  - Do not add new temporary compatibility layers unless a hard blocker is found.

## Scope Queue

### S1. Creator Naming Cutover: Data + Contracts
- **Branch**: `merge/s1-creator-cutover-data-contracts`
- **Depends on**: none
- **Target areas**: Prisma schema/migration alignment, UID behavior, `@eridu/api-types` creator-first contracts.
- **Out of scope**: frontend route UI polish, docs/meta cleanup.
- **Done when**:
  - Creator-first IDs and schema/contract names are canonical.
  - No new runtime contract is introduced with `mc` naming.

### S2. Backend Creator Domain Cutover
- **Branch**: `merge/s2-backend-creator-domain-cutover`
- **Depends on**: S1
- **Target areas**: `apps/erify_api` models/modules/controllers/services for creator/show-creator/studio-creator/admin surfaces.
- **Out of scope**: frontend route transitions, docs/meta.
- **Done when**:
  - Backend APIs used by studio/admin creator workflows are creator-first.
  - Backward-compatibility shims are not expanded.

### S3. Studios Frontend Creator Cutover
- **Branch**: `merge/s3-studios-frontend-creator-cutover`
- **Depends on**: S2
- **Target areas**: `apps/erify_studios` creator routes, feature modules, API clients, query keys, route tree.
- **Out of scope**: backend-only migration scripts, docs/meta.
- **Done when**:
  - Studios creator workflows run on creator-first contracts.
  - Legacy `mc` naming is removed from active creator screens and API calls.

### S4. Membership + Creator Mapping Workflow Stabilization
- **Branch**: `merge/s4-membership-mapping-stabilization`
- **Depends on**: S3
- **Target areas**: roster/mapping UX, bulk assignment behavior, RBAC hardening, optimistic locking fixes.
- **Out of scope**: broad docs/agent memory sync.
- **Done when**:
  - Membership and mapping flows are functionally stable and test-covered.
  - Known phase-4 blockers in those flows are closed.

### S5. Economics Preview + Rollout Ops
- **Branch**: `merge/s5-economics-preview-and-ops`
- **Depends on**: S4
- **Target areas**: economics preview behavior, migration rehearsal docs, backfill scripts.
- **Out of scope**: unrelated product backlog items.
- **Done when**:
  - Economics preview contract is consistent with current scope.
  - Backfill/rehearsal tooling is executable and documented.

### S6. Docs / Agent / Memory Sync
- **Branch**: `merge/s6-docs-agent-memory-sync`
- **Depends on**: S5
- **Target areas**: roadmap/docs, `.agent/*`, `.claude/*` memory alignment.
- **Out of scope**: runtime behavior changes.
- **Done when**:
  - Documentation and agent memory match shipped behavior and merge strategy.

## PR Definition of Done (every scope)

- Scope section in PR description: goal, in-scope, out-of-scope, rollback.
- Verification for each changed workspace/package:
  - `pnpm --filter <workspace> lint`
  - `pnpm --filter <workspace> typecheck`
  - `pnpm --filter <workspace> test`
- Add `build` checks when package wiring/exports changed.
- Explicitly confirm no unrelated refactor drift.

## Session Handoff Log

- 2026-03-11: Merge program initialized. Policy set to direct creator cutover (no compatibility phase-out by default).
