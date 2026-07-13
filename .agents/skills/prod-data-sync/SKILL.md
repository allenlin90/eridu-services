---
name: prod-data-sync
description: Sync production Postgres into local databases when explicit testing needs real cardinalities or edge cases.
---

# Prod Data Sync

One-command bash script (`scripts/sync-prod-to-local.sh`) replaces both local Postgres databases with current prod data via `pg_dump | psql`.

**Workflow**: `.agents/workflows/prod-data-sync.md`
**Design Spec**: `references/prod-data-sync-design.md`

## When to Use / Not Use

**Use**: Real JSON envelope variants, real cardinalities, referential edge-case bugs, migration verification.
**Don't**: CI (never), non-local targets (enforced), when seed data suffices, when local DB state must be preserved.

## Read-Only Invariant (Hard Rule)

Script never writes to `PROD_*` URL. Only `pg_dump` uses prod. Pre-flight aborts unless local URL host is `localhost`/`127.0.0.1`/`::1`.

## Prerequisites

- bash ≥ 4.3 (`brew install bash` on macOS)
- `pg_dump`/`psql` on PATH (`brew install libpq`, add `/opt/homebrew/opt/libpq/bin` to PATH)
- `PROD_DATABASE_URL` and `PROD_ERIDU_AUTH_DATABASE_URL` in gitignored `.env`
- Local Postgres running (`docker compose up -d database`)

## How to Invoke

```bash
bash scripts/sync-prod-to-local.sh
```

Observe warning banner + 5-second abort window. After sync, run `prisma migrate deploy` / `db:migrate` if needed.

## Agent Loop

```bash
git status --short --branch
set -a && source apps/erify_api/.env
PATH="/opt/homebrew/opt/libpq/bin:$PATH" psql "$DATABASE_URL" -c "select 1 as ok;"
PATH="/opt/homebrew/opt/libpq/bin:$PATH" bash scripts/sync-prod-to-local.sh
```

## Failure Triage

1. Verify each prod URL with `psql ... -c "select 1 as ok;"`
2. If fails → report prod connectivity as blocker
3. If succeeds → try `pg_dump --schema-only` to isolate
4. If schema dump succeeds → transient issue, retry once
5. If retry fails → report and ask before partial restore

## Extending Exclude List

Edit `EXCLUDED_TABLES_ERIFY_API` / `EXCLUDED_TABLES_ERIDU_AUTH` arrays in script. Uses `--exclude-table-data` (schema preserved, data skipped).

## Governance Upgrade Triggers

| Trigger | Upgrade |
|---|---|
| Second developer | Move credentials to secret manager |
| Admin role on prod | Switch to SELECT-only Postgres role |
| External contributors | Add PII sanitization |
| Sync becomes slow | Grow exclude lists |
