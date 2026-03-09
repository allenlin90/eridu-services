# DB Migration Rehearsal (Production-Like)

Use this runbook to rehearse DB migration rollout locally using the same command style as production deployment.

Scope in this document:
- `erify_api` Prisma migrations
- Phase 4 consolidated rollout migration:
  - `20260307120000_phase4_economics_foundation`

## Local HITL Baseline Cycle (Deterministic Dev Setup)

For schema iterations on this branch, use the local baseline cycle:

```bash
pnpm --filter erify_api db:local:refresh
```

Optional ext-id sync for cross-app auth mapping:

```bash
export ERIDU_AUTH_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eridu_auth"
pnpm --filter erify_api db:extid:sync
```

`db:extid:sync` updates `erify_api.users.ext_id` only. It never mutates `eridu_auth.user.id`.

This ensures a new developer can reset, migrate, and seed into a runnable local environment without manual SQL patching.

## Rules for Production-Like Simulation

- Do not use `prisma migrate dev` during rehearsal.
- Use `prisma migrate deploy` only.
- Use a fresh database (or a database snapshot restored to pre-rollout state).

## 0) Prepare Environment

Set the same environment style used by deployment (especially `DATABASE_URL`).

Example:

```bash
cd apps/erify_api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erify_api_prod_sim"
```

For local dev reset workflow, set your working local DB URL:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erify_api"
```

## 1) Confirm Pending Migrations

```bash
pnpm db:migrate:status
```

Expected before deploy:
- The consolidated Phase 4 migration appears as pending on a pre-rollout DB.

## 2) Apply Migrations Like Production

```bash
pnpm db:migrate:deploy
```

Expected:
- All pending migrations applied in order.
- No schema drift errors.

## 3) Re-Check Status

```bash
pnpm db:migrate:status
```

Expected after deploy:
- Database is up to date (no pending migrations).

## 4) Runtime Smoke Checks

Start API:

```bash
pnpm dev
```

Verify key endpoints:
- `GET /studios/:studioId/mcs/availability?date_from=...&date_to=...`
- `PATCH /studios/:studioId/shows/mc-assignments/bulk` (append mode)
- `PUT /studios/:studioId/shows/mc-assignments/bulk` (replace mode)
- `GET /studios/:studioId/shows/:showId/economics`
- `GET /studios/:studioId/economics?...`
- `GET /studios/:studioId/performance?...`

## 5) Failure Handling Rule

- Do not edit already-applied migrations in shared/prod-like environments.
- Fix forward with a new migration.

Canonical policy reference:
- `docs/product/DB_MIGRATION_POLICY.md`
