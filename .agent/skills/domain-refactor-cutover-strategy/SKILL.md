---
name: domain-refactor-cutover-strategy
description: Multi-phase domain renaming and cutover strategy. Use when planning or executing a large-scale rename (models, routes, contracts, UI) across the monorepo, or when reviewing a cutover scope branch for completeness and safety.
---

# Domain Refactor Cutover Strategy

Guides multi-phase domain renames across the monorepo (backend, frontend, shared contracts). Derived from the Phase 4 mc→creator cutover (S1–S4).

## When to Use

- Planning a rename that spans DB models, API contracts, backend services, and frontend features.
- Reviewing or extending an in-progress cutover scope branch.
- Deciding whether to add backward-compatibility aliases vs. direct rename.

## Core Principles

1. **Scope isolation**: One branch per scope, one scope at a time. Merge to `master` before starting the next.
2. **Contract-first**: Rename shared contracts (`@eridu/api-types`) before backend consumers, backend before frontend.
3. **DB internals last (or never)**: Prisma model names and DB columns are expensive to rename (migration + backfill). Prefer keeping DB internals stable and renaming at the service/API boundary.
4. **No net-new features**: Cutover scopes are rename/refactor only. Defer product changes to post-cutover branches.

## Phase Ordering

```
S1  Data + Contracts     → @eridu/api-types, UID strategy, Prisma schema alignment
S2  Backend Domain       → Services, controllers, orchestration, route aliases
S3  Frontend Domain      → Feature modules, API clients, route tree, query keys
S4  Stabilization        → Remove legacy aliases, tighten contracts, parity hardening
```

Each phase has explicit in-scope, out-of-scope, and "done when" criteria.

## Decision: Alias Phase vs. Direct Cutover

| Strategy | When to use | Trade-off |
|---|---|---|
| **Alias phase** (S2-style) | Multiple consumers depend on old name; need transition window | More code temporarily, but zero-downtime migration |
| **Direct cutover** | Single consumer or alpha environment; no external API contract | Simpler, fewer files touched, but requires coordinated deploy |

**Default for this repo**: Direct cutover (alpha environment, no external consumers). Add aliases only when a hard blocker requires coexistence.

## Scope Branch Hygiene

- Branch naming: `cutover/s{N}-{description}` for cutover, `post-cutover/s{N}-{description}` for follow-ups.
- One active scope branch at a time. Delete completed branches.
- Each scope must pass full verification gates before merge:
  ```bash
  pnpm --filter <affected> lint
  pnpm --filter <affected> typecheck
  pnpm --filter <affected> test
  pnpm --filter <affected> build
  ```

## Verification Checklist Per Scope

- [ ] No runtime imports of the old contract path (e.g. `@eridu/api-types/mcs` → eliminated)
- [ ] No old route wiring in active admin/studio/me controllers
- [ ] No old DTO symbol names in active service/controller code
- [ ] Legacy references in DB-level internals are documented (not accidental)
- [ ] Tests updated to use new naming
- [ ] Smoke test on affected UI routes

## Stabilization Scope (S4-style)

The final cutover scope removes all backward-compatibility aliases:

1. **Contract contraction**: Remove legacy input/output aliases from API schemas.
2. **Route contraction**: Remove legacy admin route aliases.
3. **Symbol contraction**: Remove legacy DTO/service method aliases.
4. **Parity hardening**: Verify end-to-end flows with creator-only contracts.

## Rollback Strategy

- Prefer roll-forward hotfix over revert.
- Keep rollback migration ready for DB schema changes (S1).
- For non-DB scopes (S2–S4), `git revert` of the squashed merge commit is sufficient.

## Reference

- [PHASE_4_MERGE_PROGRAM.md](../../../docs/roadmap/PHASE_4_MERGE_PROGRAM.md) — Execution tracker and session handoff log.
- [data-compatibility-migration](../data-compatibility-migration/SKILL.md) — Frontend fallback patterns during cutover transition.
