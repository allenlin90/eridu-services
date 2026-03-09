---
description: HITL protocol for Phase 4 extension using one consolidated branch migration and deterministic local DB cycle
---

# Phase 4 HITL Single-Migration Workflow

Use this workflow for schema-affecting Phase 4 extension iterations.

## 1) Spec Checkpoint (before coding)

- Confirm the exact sub-step scope (schema/API/FE/tests/docs).
- Update active source docs first if behavior/contract changed:
  - `docs/roadmap/PHASE_4.md`
  - `docs/proposals/STUDIO_MC_ROSTER.md`

## 2) Branch Migration Rule

- Keep base migrations from `master` unchanged.
- Keep one branch migration directory for this initiative.
- If schema changes again, regenerate/rewrite that same branch migration directory.

## 3) Deterministic Local DB Cycle

Run on every schema iteration:

```bash
pnpm --filter erify_api db:local:refresh
```

Optional for cross-app auth id alignment:

```bash
pnpm --filter erify_api db:extid:sync
```

## 4) Verification

```bash
pnpm --filter erify_api lint
pnpm --filter erify_api typecheck
pnpm --filter erify_api test
```

Run impacted FE verification if UI/API contract changed.

## 5) Merge Gate

- Migration is Prisma-generated first.
- Manual SQL only for unsupported behavior, wrapped with:
  - `CUSTOM SQL START`
  - `CUSTOM SQL END`
- Migration SQL scope matches merged code only (no unrelated churn).
- Validate production-like apply once via `db:migrate:deploy` on fresh local prod-sim DB.
- Final docs/skills consistency pass before merge.
