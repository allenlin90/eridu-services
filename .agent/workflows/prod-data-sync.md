---
description: Operational recipe for syncing prod Postgres data into local databases via scripts/sync-prod-to-local.sh, then running feature-specific data jobs and verification.
---

# Prod Data Sync Workflow

Step-by-step procedure for refreshing your local databases with prod data and validating against them.

**Skill:** `.agent/skills/prod-data-sync/SKILL.md`
**Spec:** `docs/superpowers/specs/2026-05-02-prod-data-sync-design.md`

## Pre-flight (manual)

Confirm before invoking:

1. You are on a feature branch (not `master`).
2. Local Postgres is running: `docker compose up -d database`.
3. You can afford to lose current local DB state. If not, commit/stash work first or back up the local DB (`pg_dump $DATABASE_URL > backup.sql`).
4. `.env` (gitignored) contains real values for `PROD_DATABASE_URL` and `PROD_ERIDU_AUTH_DATABASE_URL`. See `apps/erify_api/.env.example` for placeholders.
5. Tooling prerequisites are installed (one-time): bash >= 4.3 and the Postgres client tools (`pg_dump`, `psql`) on PATH. See [skill prerequisites](../skills/prod-data-sync/SKILL.md#prerequisites-one-time).

## 1. Sync

```bash
bash scripts/sync-prod-to-local.sh
```

- The script prints a warning banner showing prod and local hosts.
- 5-second abort window — Ctrl-C if anything looks wrong.
- Per-DB `pg_dump | psql` runs sequentially: `erify_api`, then `eridu_auth`.
- After sync, the script runs `pnpm prisma migrate status` for `erify_api`.

## 2. Migrate (feature-dependent)

After sync, your local schema matches prod's. If your feature branch has pending migrations:

- **erify_api (Prisma):** `cd apps/erify_api && pnpm prisma migrate deploy`
- **eridu_auth (Drizzle):** `cd apps/eridu_auth && pnpm db:migrate`

**Skip this step intentionally** if you want to inspect prod-state data *before* applying your branch's migrations. Example: task-template-redesign Phase 0 inspects v1 data and runs `--stamp-v1` normalization before applying v2 migrations.

## 3. Run feature-specific data jobs (optional)

Examples:

- Task-template redesign (illustrative — this script ships later, in task-template-redesign Phase 0):
  ```bash
  pnpm tsx apps/erify_api/scripts/normalize-task-template-schemas.ts --dry-run --stamp-v1
  ```
- Any other migration/normalization scripts that should be exercised against real data.

## 4. Verify (smoke test)

The acceptance criterion is: **the existing tech stack runs against the synced DB without code changes**.

1. Boot the API: `cd apps/erify_api && pnpm dev`.
2. Boot a frontend (e.g., `cd apps/erify_studios && pnpm dev`).
3. Sign in (or use the relevant auth path) and load a known studio / page.
4. If the apps boot and basic flows work, the sync is verified.

## 5. Revert (when done)

Two options:

- **Back to seed data.** Drop and re-seed both DBs:
  ```bash
  cd apps/erify_api && pnpm prisma migrate reset --skip-seed && pnpm db:seed
  cd apps/eridu_auth && pnpm db:reset
  ```
- **Stay on prod-like data.** Just re-run `bash scripts/sync-prod-to-local.sh` whenever you want a fresh prod snapshot.

## Drift cases (after `prisma migrate status`)

- **Local ahead of prod** (you have unapplied migrations locally) — expected on a feature branch. Run `pnpm prisma migrate deploy` to apply your branch's migrations on top of the synced prod schema. This is the normal "simulate the deploy" path.
- **Local behind prod** (prod has migrations your branch doesn't have) — your branch is out of date with `master`. Rebase/merge `master` first, then re-sync.
- **Divergent** (both sides have migrations the other doesn't) — branch is out of date AND has new migrations. Resolve by rebasing `master` first, then re-sync.

## Failure recovery

- **Script aborts pre-flight** — fix the env var or URL it complains about and re-run.
- **`pg_dump` fails** (auth/network/perms) — local DB unchanged. Verify prod credentials by connecting with `psql "$PROD_DATABASE_URL" -c 'SELECT 1'`.
- **`psql` fails mid-restore** — local DB is partially overwritten. Re-run the script; `--clean --if-exists` makes it idempotent.
- **One DB succeeds, the other fails** — first DB is already restored. Re-run; the script will redo both DBs (idempotent).
