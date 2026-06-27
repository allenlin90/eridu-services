#!/usr/bin/env bash
# bind-template-system-facts.sh
#
# Runner for the generic task-template fact-binding migration. The bindings
# themselves live in bind-template-system-facts.sql (same directory) as a list
# of bind_template_fact(...) calls — edit that file to add or change bindings.
#
# Safety:
#   - Idempotent: the SQL skips fields that are already bound.
#   - Dry-run: pass --dry-run to print SQL without executing.
#   - Never writes to a non-local DB unless ALLOW_PROD=1 is set.
#
# Usage (local DB):
#   bash .agents/skills/template-system-fact-migration/scripts/bind-template-system-facts.sh
#
# Usage (remote prod DB — run AFTER verifying locally):
#   ALLOW_PROD=1 TARGET_DATABASE_URL="$PROD_DATABASE_URL" \
#     bash .agents/skills/template-system-fact-migration/scripts/bind-template-system-facts.sh
#
# Dry run:
#   bash .agents/skills/template-system-fact-migration/scripts/bind-template-system-facts.sh --dry-run

set -euo pipefail

# ---------- Helpers ----------

err()  { printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; }
info() { printf '\033[36m[INFO]\033[0m  %s\n' "$*"; }
warn() { printf '\033[33m[WARN]\033[0m  %s\n' "$*"; }
ok()   { printf '\033[32m[OK]\033[0m    %s\n' "$*"; }

url_host() {
  local url="$1"
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

# ---------- Args ----------

DRY_RUN=0
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=1
done

# ---------- Env ----------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/bind-template-system-facts.sql"
SYNC_CHECK="$SCRIPT_DIR/check-fact-key-sync.mjs"
# Resolve repo root regardless of where this script lives in the tree.
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null \
  || (cd "$SCRIPT_DIR/../../../.." && pwd))"
cd "$REPO_ROOT"

# Hard gate: the SQL type-guard map must match the fact-key catalog.
SCHEMA_FILE="$REPO_ROOT/packages/api-types/src/task-management/template-definition.schema.ts"
node "$SYNC_CHECK" "$SCHEMA_FILE" "$SQL_FILE"

if [[ -f ".env" ]];               then set -a; source ".env";               set +a; fi
if [[ -f "apps/erify_api/.env" ]]; then set -a; source "apps/erify_api/.env"; set +a; fi

DB_URL="${TARGET_DATABASE_URL:-${DATABASE_URL:?DATABASE_URL is not set}}"
DB_HOST="$(url_host "$DB_URL")"

if ! is_local_host "$DB_HOST" && [[ -z "${ALLOW_PROD:-}" ]]; then
  err "Target host '$DB_HOST' is not localhost."
  err "Set ALLOW_PROD=1 to confirm you intend to run against a remote database."
  exit 1
fi

PSQL="psql"
if command -v /opt/homebrew/opt/libpq/bin/psql >/dev/null 2>&1; then
  PSQL="/opt/homebrew/opt/libpq/bin/psql"
fi

# ---------- Dry-run ----------

if [[ "$DRY_RUN" -eq 1 ]]; then
  warn "Dry-run mode — SQL from $SQL_FILE (not executed):"
  echo ""
  cat "$SQL_FILE"
  echo ""
  info "Run without --dry-run to apply."
  exit 0
fi

# ---------- Execute ----------

info "Target DB host : $DB_HOST"
info "SQL file       : $SQL_FILE"
info "Applying system_fact_key bindings…"
echo ""

"$PSQL" "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo ""
ok "Migration complete."

# ---------- Auto-verify ----------

info "Bound fields across all templates:"
"$PSQL" "$DB_URL" -v ON_ERROR_STOP=1 -c "
SELECT
  tt.uid,
  tt.name,
  tt.version,
  item->>'id'              AS field_id,
  item->>'type'            AS field_type,
  item->>'label'           AS field_label,
  item->>'system_fact_key' AS system_fact_key
FROM task_templates tt,
  LATERAL jsonb_array_elements(tt.\"current_schema\"->'items') item
WHERE tt.deleted_at IS NULL
  AND item->>'system_fact_key' IS NOT NULL
ORDER BY tt.uid, item->>'id';
"
