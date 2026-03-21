# Ideation: Canonical Creator Naming and Legacy `mc` Deprecation

> **Status**: Deferred from Phase 4 feature branch merge
> **Origin**: Phase 4 feature branch merge gap (`feat/phase-4-p-and-l`), March 2026
> **Related**: [PHASE_4_PNL_BACKEND.md](../../apps/erify_api/docs/PHASE_4_PNL_BACKEND.md), [domain-refactor-cutover-strategy skill](../../.agent/skills/domain-refactor-cutover-strategy/SKILL.md), [data-compatibility-migration skill](../../.agent/skills/data-compatibility-migration/SKILL.md)

## What

Complete the creator-first naming consolidation across all backend modules, shared package exports, frontend routes/hooks, and docs. Remove legacy `mc`/`master_creator` compatibility aliases and mixed naming after the compatibility window closes.

## Why It Was Considered

- Creator-first naming was partially implemented during Phase 4. The terminology shift improves domain clarity for onboarding, documentation, and API consumers.
- Mixed `mc`/`creator` naming across modules, exports, schemas, and docs creates confusion and maintenance overhead.
- Legacy shims consume test surface area and obscure the canonical domain model.

## Why It Was Deferred

1. Compatibility aliases are still in use by some consumers — removing them before migration is complete would break existing integrations.
2. The compatibility-window and removal-gate criteria have not been formally defined.
3. Migration/backfill strategy for UID and alias cutover paths needs to be made explicit before execution.
4. The scope of `mc` references across backend modules, shared packages, frontend routes/hooks, and docs has not been fully audited.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. All active consumers (backend modules, frontend routes, package exports) have been audited and confirmed to use creator-first naming.
2. A compatibility window end date is agreed and communicated to any external consumers.
3. A migration/backfill strategy for UID and alias cutover is documented and approved.
4. Stale `mc` aliases are causing test failures or type errors that cannot be suppressed without impact.

## Implementation Notes (Preserved Context)

### Scope of the rename

- Define compatibility-window and removal-gate criteria for legacy `mc` aliases.
- Complete creator-first naming consolidation across backend modules, shared package exports, frontend routes/hooks, and docs.
- Keep migration/backfill strategy explicit for UID and alias cutover paths.
- Remove deprecated compatibility shims once consumers are fully migrated.

### Cutover approach

Follow the `.agent/skills/domain-refactor-cutover-strategy/SKILL.md` multi-phase playbook:
1. Scope isolation: identify all `mc` references by layer (schema, API types, service, routes, docs).
2. Contract-first ordering: update `@eridu/api-types` first, then consuming apps.
3. Alias → direct cutover: introduce creator-first names as primary, keep `mc` as deprecated alias until removal gate.
4. Stabilization: remove aliases after all consumers pass typecheck with creator-first names.

### Frontend dual-field fallback

During the transition, apply the `.agent/skills/data-compatibility-migration/SKILL.md` dual-field fallback helpers in the frontend so pages work correctly against both old and new API field names during the cutover window.
