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

# Requires bash >= 4.3 for `local -n` (nameref) and reliable `mapfile`.
# macOS ships bash 3.2 by default. Install a newer one with `brew install bash`.
if (( BASH_VERSINFO[0] < 4 || (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] < 3) )); then
  printf '\033[31m[ERROR]\033[0m requires bash >= 4.3 (you have %s). On macOS: brew install bash\n' "$BASH_VERSION" >&2
  exit 1
fi

# Postgres client tools must be on PATH. The Postgres docker container is not
# enough — this script runs on the host. On macOS: brew install libpq, then
# add /opt/homebrew/opt/libpq/bin to PATH (libpq is keg-only).
for cmd in pg_dump psql; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    printf '\033[31m[ERROR]\033[0m %s not found on PATH.\n' "$cmd" >&2
    printf '       On macOS: brew install libpq && export PATH="/opt/homebrew/opt/libpq/bin:$PATH"\n' >&2
    exit 1
  fi
done

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
  # Strip scheme, userinfo, then take everything before :, /, or ?
  # Note: bracketed IPv6 hosts (e.g. [::1]) are not supported — use 127.0.0.1 instead.
  local hostport="${url#*://}"
  hostport="${hostport#*@}"
  printf '%s' "${hostport%%[:/?]*}"
}

is_local_host() {
  case "$1" in
    localhost|127.0.0.1|::1) return 0 ;;
    *) return 1 ;;
  esac
}

# Source the given env file if it exists (uses `set -a` so values are exported).
# Note: a value already set in the shell WILL be overridden by a value in the file.
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
  for t in "${arr[@]}"; do
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
