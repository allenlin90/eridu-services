# Prod → Local Data Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a one-command bash script that overwrites both local Postgres databases with prod data via `pg_dump | psql`, plus a skill and workflow that teach safe usage.

**Architecture:** Single bash script `scripts/sync-prod-to-local.sh` performs pre-flight safety checks, runs `pg_dump --clean --if-exists` from `PROD_*` URLs into corresponding `localhost` URLs (read-only on prod by construction — `psql` is never pointed at a prod URL), then prints migration status hints. A skill (`.agent/skills/prod-data-sync/SKILL.md`) and workflow (`.agent/workflows/prod-data-sync.md`) document when/how to use it and the governance-upgrade roadmap.

**Tech Stack:** Bash, `pg_dump` / `psql` (Postgres client tools), Prisma (erify_api), Drizzle (eridu_auth).

**Spec:** `docs/superpowers/specs/2026-05-02-prod-data-sync-design.md`.

**Testing note:** No automated tests per spec (Verification section). Acceptance is manual smoke test: existing apps boot and load against synced data. Pre-flight error paths are verified by running the script with intentionally-bad env vars and observing the abort message.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `scripts/sync-prod-to-local.sh` | Create | The sync script. Pre-flight checks, per-DB `pg_dump | psql`, post-sync status hints. |
| `apps/erify_api/.env.example` | Modify | Add `PROD_DATABASE_URL=` and `PROD_ERIDU_AUTH_DATABASE_URL=` placeholders with comments. |
| `.agent/skills/prod-data-sync/SKILL.md` | Create | Agent-facing: when/when-not, how to invoke, how to extend, read-only invariant, governance roadmap. |
| `.agent/workflows/prod-data-sync.md` | Create | Operator-facing step-by-step recipe: pre-flight → sync → migrate → run feature jobs → verify → revert. |

---

## Task 1: Create the sync script

**Files:**
- Create: `scripts/sync-prod-to-local.sh`

- [ ] **Step 1: Verify the `scripts/` directory exists at the repo root**

Run: `ls scripts/ 2>/dev/null || echo "MISSING"`
Expected: either a listing of existing scripts, or `MISSING`. If `MISSING`, run `mkdir -p scripts/`.

- [ ] **Step 2: Write the script**

Create `scripts/sync-prod-to-local.sh` with exactly this content:

```bash
#!/usr/bin/env bash
# scripts/sync-prod-to-local.sh
#
# Sync prod Postgres databases into the local ones via `pg_dump | psql`.
#
# Hard invariants (see docs/superpowers/specs/2026-05-02-prod-data-sync-design.md):
#   1. Read-only on prod: `psql` is NEVER pointed at a PROD_* URL.
#   2. Local-only writes: aborts unless local URLs target localhost / 127.0.0.1 / ::1.
#   3. Distinct hosts: aborts if any PROD_* URL host equals a local URL host.
#
# Usage:
#   bash scripts/sync-prod-to-local.sh
#
# Required env (in repo .env, gitignored; placeholders in apps/erify_api/.env.example):
#   PROD_DATABASE_URL              -- prod erify_api postgres URL (SELECT-only role recommended)
#   PROD_ERIDU_AUTH_DATABASE_URL   -- prod eridu_auth postgres URL (SELECT-only role recommended)
#   DATABASE_URL                   -- local erify_api URL (must be localhost)
#   ERIDU_AUTH_DATABASE_URL        -- local eridu_auth URL (must be localhost)
#
# To exclude a table's row data (schema is preserved), add it to EXCLUDED_TABLES_ERIFY_API
# or EXCLUDED_TABLES_ERIDU_AUTH below.

set -euo pipefail

# ---------- Config ----------

# Tables whose row data should be skipped during sync (schema is preserved).
# Add to these arrays as needed; document why each table is excluded.
EXCLUDED_TABLES_ERIFY_API=()
EXCLUDED_TABLES_ERIDU_AUTH=()

# ---------- Helpers ----------

err() { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }
info() { printf '\033[36m[INFO]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[WARN]\033[0m %s\n' "$*"; }

# Extract host from a postgres URL (postgresql://user:pass@HOST:port/db).
url_host() {
  local url="$1"
  # Strip scheme, userinfo, then take everything before : or /
  local hostport="${url#*://}"
  hostport="${hostport#*@}"
  printf '%s' "${hostport%%[:/]*}"
}

is_local_host() {
  case "$1" in
    localhost|127.0.0.1|::1) return 0 ;;
    *) return 1 ;;
  esac
}

# Load .env from repo root if present (does not override already-set env).
load_env() {
  local env_file="${1:-.env}"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$env_file"
    set +a
  fi
}

# ---------- Pre-flight ----------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Try repo-root .env first, then apps/erify_api/.env as a fallback (where this repo's main .env lives).
load_env ".env"
load_env "apps/erify_api/.env"

: "${PROD_DATABASE_URL:?PROD_DATABASE_URL is not set. Add it to .env (see apps/erify_api/.env.example).}"
: "${PROD_ERIDU_AUTH_DATABASE_URL:?PROD_ERIDU_AUTH_DATABASE_URL is not set. Add it to .env (see apps/erify_api/.env.example).}"
: "${DATABASE_URL:?DATABASE_URL is not set.}"
: "${ERIDU_AUTH_DATABASE_URL:?ERIDU_AUTH_DATABASE_URL is not set.}"

LOCAL_API_HOST="$(url_host "$DATABASE_URL")"
LOCAL_AUTH_HOST="$(url_host "$ERIDU_AUTH_DATABASE_URL")"
PROD_API_HOST="$(url_host "$PROD_DATABASE_URL")"
PROD_AUTH_HOST="$(url_host "$PROD_ERIDU_AUTH_DATABASE_URL")"

if ! is_local_host "$LOCAL_API_HOST"; then
  err "Refusing to write to non-local target: DATABASE_URL host = $LOCAL_API_HOST"
  exit 1
fi
if ! is_local_host "$LOCAL_AUTH_HOST"; then
  err "Refusing to write to non-local target: ERIDU_AUTH_DATABASE_URL host = $LOCAL_AUTH_HOST"
  exit 1
fi

if [[ "$PROD_API_HOST" == "$LOCAL_API_HOST" ]]; then
  err "PROD_DATABASE_URL and DATABASE_URL share host ($PROD_API_HOST). Refusing — risk of writing to prod."
  exit 1
fi
if [[ "$PROD_AUTH_HOST" == "$LOCAL_AUTH_HOST" ]]; then
  err "PROD_ERIDU_AUTH_DATABASE_URL and ERIDU_AUTH_DATABASE_URL share host ($PROD_AUTH_HOST). Refusing — risk of writing to prod."
  exit 1
fi

# ---------- Banner ----------

cat <<EOF
================================================================================
WARNING: Syncing PROD -> LOCAL.
  prod erify_api    : $PROD_API_HOST  -->  local: $LOCAL_API_HOST
  prod eridu_auth   : $PROD_AUTH_HOST -->  local: $LOCAL_AUTH_HOST

This will DESTROY current local data in the local databases.
Prod connection is read-only via pg_dump (psql is never pointed at PROD_*).

Press Ctrl-C within 5s to abort.
================================================================================
EOF
sleep 5

# ---------- Sync ----------

build_exclude_args() {
  local -n arr="$1"
  local t
  for t in "${arr[@]:-}"; do
    [[ -z "$t" ]] && continue
    printf '%s\n' "--exclude-table-data=$t"
  done
}

sync_db() {
  local label="$1"
  local prod_url="$2"
  local local_url="$3"
  shift 3
  local exclude_args=("$@")

  info "[$label] pg_dump from prod -> psql into local"
  if ! pg_dump "$prod_url" \
      --clean --if-exists --no-owner --no-privileges \
      "${exclude_args[@]}" \
    | psql "$local_url" >/dev/null; then
    err "[$label] sync failed. Local DB may be partial — re-running this script is idempotent."
    exit 1
  fi
  info "[$label] done."
}

mapfile -t ERIFY_EXCLUDES < <(build_exclude_args EXCLUDED_TABLES_ERIFY_API)
mapfile -t AUTH_EXCLUDES  < <(build_exclude_args EXCLUDED_TABLES_ERIDU_AUTH)

sync_db "erify_api"  "$PROD_DATABASE_URL"            "$DATABASE_URL"            "${ERIFY_EXCLUDES[@]}"
sync_db "eridu_auth" "$PROD_ERIDU_AUTH_DATABASE_URL" "$ERIDU_AUTH_DATABASE_URL" "${AUTH_EXCLUDES[@]}"

# ---------- Post-sync ----------

info "Running prisma migrate status for erify_api..."
( cd apps/erify_api && pnpm prisma migrate status ) || warn "prisma migrate status reported drift — see message above."

info "Done."
cat <<EOF

Next steps:
  - If prisma migrate status above shows pending migrations, run:
      cd apps/erify_api && pnpm prisma migrate deploy
  - For eridu_auth (Drizzle), run pending migrations with:
      cd apps/eridu_auth && pnpm db:migrate
  - Boot apps and verify (smoke test).
EOF
```

- [ ] **Step 3: Make it executable**

Run: `chmod +x scripts/sync-prod-to-local.sh`
Expected: no output, exit 0.

- [ ] **Step 4: Verify pre-flight aborts on missing env**

Run: `unset PROD_DATABASE_URL PROD_ERIDU_AUTH_DATABASE_URL DATABASE_URL ERIDU_AUTH_DATABASE_URL; bash scripts/sync-prod-to-local.sh; echo "exit=$?"`

Expected: stderr contains `PROD_DATABASE_URL is not set` (or one of the required vars), and `exit=1`.

Note: this assumes `.env` does not provide all four. If it does, temporarily rename `.env` to `.env.bak` for this check, then restore.

- [ ] **Step 5: Verify pre-flight aborts on non-local target**

Run:
```bash
PROD_DATABASE_URL="postgresql://u:p@prod-host.example.com:5432/db" \
PROD_ERIDU_AUTH_DATABASE_URL="postgresql://u:p@prod-auth.example.com:5432/db" \
DATABASE_URL="postgresql://u:p@some-remote.example.com:5432/db" \
ERIDU_AUTH_DATABASE_URL="postgresql://u:p@localhost:5432/db" \
bash scripts/sync-prod-to-local.sh; echo "exit=$?"
```

Expected: stderr contains `Refusing to write to non-local target: DATABASE_URL host = some-remote.example.com`, and `exit=1`.

- [ ] **Step 6: Verify pre-flight aborts on shared prod/local host**

Run:
```bash
PROD_DATABASE_URL="postgresql://u:p@localhost:5432/proddb" \
PROD_ERIDU_AUTH_DATABASE_URL="postgresql://u:p@prod-auth.example.com:5432/db" \
DATABASE_URL="postgresql://u:p@localhost:5432/erify_api" \
ERIDU_AUTH_DATABASE_URL="postgresql://u:p@localhost:5432/eridu_auth" \
bash scripts/sync-prod-to-local.sh; echo "exit=$?"
```

Expected: stderr contains `PROD_DATABASE_URL and DATABASE_URL share host (localhost)`, and `exit=1`.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-prod-to-local.sh
git commit -m "feat(scripts): add prod-to-local Postgres sync script

Adds scripts/sync-prod-to-local.sh which performs pg_dump from PROD_* URLs
into local DATABASE_URL / ERIDU_AUTH_DATABASE_URL via psql. Pre-flight
checks enforce three invariants: read-only on prod (psql never targets
PROD_* URLs), local-only writes (host must be localhost/127.0.0.1/::1),
and distinct prod/local hosts.

See docs/superpowers/specs/2026-05-02-prod-data-sync-design.md."
```

---

## Task 2: Document the prod env vars

**Files:**
- Modify: `apps/erify_api/.env.example`

- [ ] **Step 1: Read the current `.env.example` to find the right insertion point**

Run: `grep -n "DATABASE_URL\|ERIDU_AUTH_DATABASE_URL" apps/erify_api/.env.example`
Expected: lines that include `DATABASE_URL=postgresql://...` and `ERIDU_AUTH_DATABASE_URL=postgresql://...`.

- [ ] **Step 2: Append the prod-sync block at the end of the file**

Use Edit to add the following lines at the end of `apps/erify_api/.env.example` (do not duplicate existing entries):

```
# ---------------------------------------------------------------------------
# Prod -> Local data sync (used by scripts/sync-prod-to-local.sh)
# ---------------------------------------------------------------------------
# These variables are read by the prod data sync script ONLY. Never commit real
# values. Place real URLs in your gitignored .env. The recommended Postgres
# role is one with CONNECT + SELECT only (no INSERT/UPDATE/DELETE/DDL).
# See: docs/superpowers/specs/2026-05-02-prod-data-sync-design.md
PROD_DATABASE_URL=
PROD_ERIDU_AUTH_DATABASE_URL=
```

- [ ] **Step 3: Verify the file parses (basic shell-syntax sanity check)**

Run: `bash -n <(grep -v '^#' apps/erify_api/.env.example | sed 's/=/="/' | sed 's/$/"/')`
Expected: exit 0, no output (means the env declarations parse as valid shell assignments).

- [ ] **Step 4: Commit**

```bash
git add apps/erify_api/.env.example
git commit -m "docs(env): document PROD_* sync env vars in .env.example

Adds PROD_DATABASE_URL and PROD_ERIDU_AUTH_DATABASE_URL placeholders for
scripts/sync-prod-to-local.sh. Comments instruct: never commit real values,
prefer SELECT-only Postgres role."
```

---

## Task 3: Create the prod-data-sync skill

**Files:**
- Create: `.agent/skills/prod-data-sync/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p .agent/skills/prod-data-sync`
Expected: directory created (or already exists), exit 0.

- [ ] **Step 2: Write `SKILL.md`**

Create `.agent/skills/prod-data-sync/SKILL.md` with exactly this content:

```markdown
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

## How to Invoke

1. Ensure `PROD_DATABASE_URL` and `PROD_ERIDU_AUTH_DATABASE_URL` are set in your gitignored `.env` (placeholders in `apps/erify_api/.env.example`).
2. Ensure local Postgres is running (`docker compose up -d database`).
3. Run:
   ```bash
   bash scripts/sync-prod-to-local.sh
   ```
4. Observe the warning banner and the 5-second abort window.
5. After sync, follow the post-sync hints (run `prisma migrate deploy` and/or `db:migrate` if needed).

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
```

- [ ] **Step 3: Verify the skill is well-formed**

Run: `head -5 .agent/skills/prod-data-sync/SKILL.md`
Expected: starts with `---`, contains `name: prod-data-sync`, then `description:` line, then closing `---`.

- [ ] **Step 4: Commit**

```bash
git add .agent/skills/prod-data-sync/SKILL.md
git commit -m "docs(skill): add prod-data-sync skill

Documents when/when-not to use scripts/sync-prod-to-local.sh, the
read-only invariant on prod, the exclude-list extension pattern, and the
governance upgrade roadmap (secret manager, SELECT-only role, PII
sanitization)."
```

---

## Task 4: Create the prod-data-sync workflow

**Files:**
- Create: `.agent/workflows/prod-data-sync.md`

- [ ] **Step 1: Write the workflow**

Create `.agent/workflows/prod-data-sync.md` with exactly this content:

```markdown
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

- Task-template redesign:
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
```

- [ ] **Step 2: Verify the workflow file**

Run: `head -10 .agent/workflows/prod-data-sync.md`
Expected: starts with frontmatter `---`, contains `description:`, then `# Prod Data Sync Workflow`.

- [ ] **Step 3: Commit**

```bash
git add .agent/workflows/prod-data-sync.md
git commit -m "docs(workflow): add prod-data-sync operational recipe

Step-by-step procedure for invoking scripts/sync-prod-to-local.sh:
pre-flight checks, sync, optional migrate, feature-specific data jobs,
smoke-test verification, and revert. Documents the three drift cases
after prisma migrate status."
```

---

## Task 5: Manual smoke test (acceptance gate)

This task is not commit-bearing. It is the acceptance criterion from the spec.

**Files:** none.

- [ ] **Step 1: Confirm prod URLs are present**

Ensure your gitignored `.env` (or `apps/erify_api/.env`) contains real values for both `PROD_DATABASE_URL` and `PROD_ERIDU_AUTH_DATABASE_URL`.

Run: `grep -E '^PROD_(DATABASE|ERIDU_AUTH_DATABASE)_URL=' apps/erify_api/.env 2>/dev/null | sed 's/=.*$/=<set>/'`
Expected: both keys printed with `=<set>` (values redacted from this output for safety).

- [ ] **Step 2: Confirm local Postgres is up**

Run: `docker compose ps database`
Expected: a running `database` service. If not, `docker compose up -d database`.

- [ ] **Step 3: Run the sync end-to-end**

Run: `bash scripts/sync-prod-to-local.sh`

Expected sequence:
1. Warning banner with prod and local hosts.
2. 5-second pause.
3. `[INFO] [erify_api] pg_dump from prod -> psql into local` then `[INFO] [erify_api] done.`
4. `[INFO] [eridu_auth] pg_dump from prod -> psql into local` then `[INFO] [eridu_auth] done.`
5. `prisma migrate status` output for erify_api.
6. `[INFO] Done.` and the next-steps text.

If any step fails, do not proceed. Read the error, fix, re-run.

- [ ] **Step 4: Boot the API**

Run (in a separate terminal): `cd apps/erify_api && pnpm dev`
Expected: server starts without database errors. Wait until "ready" / "listening" appears.

- [ ] **Step 5: Boot a frontend**

Run (in a separate terminal): `cd apps/erify_studios && pnpm dev`
Expected: dev server starts. Open the URL shown.

- [ ] **Step 6: Verify a known flow loads**

In the browser, sign in (or use the appropriate auth path) and navigate to a known studio. Confirm task templates and tasks load with shapes consistent with prod.

If all flows load: **acceptance achieved**. Close the dev servers.

- [ ] **Step 7: Final summary commit (optional, only if any docs were updated during smoke test)**

If smoke test surfaced a doc bug (e.g., wrong command, missing pre-flight step), fix it and commit. Otherwise no commit.

---

## Self-Review Notes

Spec coverage check:
- Hard Invariants 1-3 → Task 1 Step 2 (script body), verified Steps 4-6.
- Sync Flow → Task 1 Step 2.
- Failure Modes → Task 1 Step 2 (`set -euo pipefail`, error helpers, exit codes), Task 4 (workflow recovery section).
- Verification (Smoke Test) → Task 5.
- Skill Contents → Task 3.
- Workflow Contents → Task 4.
- `.env.example` updates → Task 2.
- `.gitignore` verification → already verified during planning (`.env` is ignored); no task needed.
- Governance & Future Upgrades → Task 3 (skill body).
- Non-Goals (no Prisma client regen, no auto migrate, no seed re-run, no sanitization, no CI) → respected: script does none of these; skill says so explicitly.
```
