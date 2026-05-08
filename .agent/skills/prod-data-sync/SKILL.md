---
name: prod-data-sync
description: Sync production Postgres data into local databases for high-fidelity development and migration verification. Use when a feature must be exercised against real prod-shaped data (real cardinalities, JSON envelope variants, referential edge cases) and local seed data is insufficient.
---

# Prod Data Sync

A one-command bash script (`scripts/sync-prod-to-local.sh`) replaces both local Postgres databases with current prod data via `pg_dump | psql`. Designed for solo-dev-with-full-prod-access; governance tightens as the team grows.

**Spec:** `docs/superpowers/specs/2026-05-02-prod-data-sync-design.md`
**Workflow:** `.agent/workflows/prod-data-sync.md`

## When to Use

- A feature must be verified against real prod-shaped data, e.g.:
  - Schema migrations that depend on real JSON envelope variants (task-template v1→v2).
  - Reporting/analytics behavior that depends on real cardinalities.
  - Bugs that only reproduce under real referential conditions.
- "Real-data seed" use case: improve day-to-day DX by developing against actual prod shapes instead of curated synthetic seed data.

## When NOT to Use

- **In CI.** This script touches prod credentials. It must never run in CI.
- **Against any non-local target.** The script enforces this, but do not attempt to bypass.
- **When local DB state must be preserved.** Sync overwrites both local databases. Commit/stash/back up first.
- **When seed data would suffice.** Prefer `pnpm db:seed` (or `db:seed:full`, `db:seed:report-simulation`) for cases that can be expressed in seed profiles. Sync is the heavier-weight option.

## Read-Only Invariant on Prod (Hard Rule)

The script never writes to a `PROD_*` URL. Enforced by:

1. Only `pg_dump` is ever invoked with `PROD_*`. `psql` is invoked exclusively against local URLs.
2. Pre-flight aborts unless `DATABASE_URL` / `ERIDU_AUTH_DATABASE_URL` host is one of `localhost` / `127.0.0.1` / `::1`.
3. Pre-flight aborts if any `PROD_*` URL host equals any local URL host.

**Any future change to this script must preserve this invariant.** If you want incremental sync, implement it locally (diff after dump) — never via prod-side temp tables, replication slots, or `pg_export_snapshot()` write transactions.

## Prerequisites (one-time)

- **bash >= 4.3.** macOS ships 3.2; install a newer one with `brew install bash`. The script's first check enforces this.
- **Postgres client tools (`pg_dump`, `psql`) on PATH.** The Postgres docker container is not enough — the script runs on the host. On macOS:
  ```bash
  brew install libpq
  echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  ```
  (libpq is keg-only, so the PATH export is required.)

## How to Invoke

1. Ensure `PROD_DATABASE_URL` and `PROD_ERIDU_AUTH_DATABASE_URL` are set in your gitignored `.env` (placeholders in `apps/erify_api/.env.example`).
2. Ensure local Postgres is running (`docker compose up -d database`).
3. Run:
   ```bash
   bash scripts/sync-prod-to-local.sh
   ```
4. Observe the warning banner and the 5-second abort window.
5. After sync, follow the post-sync hints (run `prisma migrate deploy` and/or `db:migrate` if needed).

## Efficient Agent Loop

Use this sequence when running the workflow from an agent terminal:

1. Load this skill and `.agent/workflows/prod-data-sync.md`.
2. Check the branch and local DB reachability before syncing:
   ```bash
   git status --short --branch
   set -a
   source apps/erify_api/.env
   PATH="/opt/homebrew/opt/libpq/bin:$PATH" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select 1 as ok;"
   ```
3. Run the sync script once using host Postgres tools:
   ```bash
   PATH="/opt/homebrew/opt/libpq/bin:$PATH" bash scripts/sync-prod-to-local.sh
   ```
4. If sandboxing blocks Docker socket or `localhost` DB access, request escalation for the same command. Do not interpret `Operation not permitted` as the database being down.
5. If the script fails on a prod connection timeout or proxy close, run the failure triage below before retrying or changing anything.

## Failure Triage

Keep the triage read-only and short. Do not print connection strings.

1. Verify each prod URL with a minimal query:
   ```bash
   set -a
   source .env
   source apps/erify_api/.env
   PATH="/opt/homebrew/opt/libpq/bin:$PATH" psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select 1 as ok;"
   PATH="/opt/homebrew/opt/libpq/bin:$PATH" psql "$PROD_ERIDU_AUTH_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select 1 as ok;"
   ```
2. If `psql` fails, stop and report prod connectivity as the blocker.
3. If `psql` succeeds but full sync times out, confirm `pg_dump` can at least read schema:
   ```bash
   PATH="/opt/homebrew/opt/libpq/bin:$PATH" pg_dump "$PROD_DATABASE_URL" --schema-only --no-owner --no-privileges >/tmp/erify_api_prod_schema_check.sql
   ```
4. If schema dump succeeds, treat the failure as transient proxy/data-transfer instability. Retry the standard sync once after prod is confirmed healthy.
5. If the retry fails again, report the blocker and ask before using a partial or table-excluded restore. A failed `pg_dump | psql` can leave the local DB partially overwritten; re-running the script is the normal recovery path.

For suspected size issues, use a qualified table-size query instead of guessing:

```sql
select
  c.relname as table_name,
  s.n_live_tup::bigint as estimated_rows,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_stat_user_tables s
join pg_class c on c.oid = s.relid
order by pg_total_relation_size(c.oid) desc
limit 20;
```

## Post-Sync Shape Checks

After a successful sync, prove the local data shape before testing feature behavior. For task-template v1/v2 work, check the local template and snapshot keys:

```sql
select
  tt.uid,
  tt.name,
  tt.version,
  jsonb_object_keys(tt.current_schema::jsonb) as schema_key
from task_templates tt
where tt.uid = 'ttpl_OtVn1kdHi_V_8TZftv52'
order by schema_key;
```

```sql
select
  t.uid,
  t.status,
  t.version,
  s.version as snapshot_version,
  jsonb_object_keys(s.schema::jsonb) as schema_key
from tasks t
join task_templates tt on tt.id = t.template_id
join task_template_snapshots s on s.id = t.snapshot_id
where tt.uid = 'ttpl_OtVn1kdHi_V_8TZftv52'
order by t.updated_at desc, schema_key
limit 20;
```

Use table aliases for JSON schema columns such as `tt.current_schema`; unqualified names can collide with Postgres built-ins.

## How to Extend the Exclude List

To skip the row data for a table while keeping its schema (e.g., for large blob/audit tables), edit the script's `EXCLUDED_TABLES_ERIFY_API` or `EXCLUDED_TABLES_ERIDU_AUTH` arrays:

```bash
EXCLUDED_TABLES_ERIFY_API=(
  "audit_log"        # large + sensitive, not needed for local dev
)
```

Document why each table is excluded inline. The table's schema is preserved (only `--exclude-table-data` is used), so application code that queries the table will still find it (just empty).

## Governance Upgrade Roadmap

This v1 design is calibrated for a solo-dev environment with full prod access. Reopen and tighten when:

| Trigger | Upgrade |
|---|---|
| Second developer joins | Move `PROD_*` credentials out of `.env` into a secret manager (e.g., 1Password CLI). |
| Prod credential is admin role | Provision and switch to a `SELECT`-only Postgres role. |
| Non-trusted developers / external contributors | Add column-level PII sanitization (per-table `UPDATE ... SET email = ...` after restore). |
| Sync becomes slow / disk-heavy | Grow the `EXCLUDED_TABLES_*` lists. Consider excluding `material_assets`-style blob tables. |

## Related

- Operational recipe: `.agent/workflows/prod-data-sync.md`
- Design doc: `docs/superpowers/specs/2026-05-02-prod-data-sync-design.md`
- First consumer: `docs/ideation/task-template-redesign.md`
