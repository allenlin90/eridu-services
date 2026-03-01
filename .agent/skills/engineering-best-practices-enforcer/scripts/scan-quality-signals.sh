#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${1:-.}"

echo "== quality signals =="
echo "root: ${ROOT_DIR}"
echo

print_limited_matches() {
  local title="$1"
  local pattern="$2"

  local -a base_globs=(
    "--glob" "!**/node_modules/**"
    "--glob" "!**/dist/**"
    "--glob" "!**/.turbo/**"
    "--glob" "!**/coverage/**"
    "--glob" "!**/*.md"
  )

  local count
  count="$(rg -n "${pattern}" "${ROOT_DIR}" "${base_globs[@]}" | wc -l | tr -d ' ' || true)"
  echo "-- ${title} (${count}) --"
  rg -n "${pattern}" "${ROOT_DIR}" "${base_globs[@]}" | sed -n '1,200p' || true
  if [ "${count}" -gt 200 ]; then
    echo "...truncated to first 200 matches"
  fi
  echo
}

print_limited_matches "ts-ignore / ts-expect-error" "@ts-ignore|@ts-expect-error"
print_limited_matches "explicit any" "\\bany\\b"
print_limited_matches "eslint-disable markers" "eslint-disable|eslint-disable-next-line"
print_limited_matches "TODO/FIXME/HACK" "TODO|FIXME|HACK"
# Heuristic: optional-chain equality checks can accidentally pass when both sides are undefined.
# These need manual review to ensure no immediate non-null dereference follows.
print_limited_matches "risky optional-chain equality guards" "if\\s*\\([^)]*\\?\\.[^)]*(===|!==)[^)]*\\?\\."
# Heuristic: memoizing simple table pagination/filter objects often adds stale-state risk.
# Flag for manual review when useMemo appears tied to table pagination/filter shaping.
print_limited_matches "possible over-memoized table state" "useMemo\\s*\\([^)]*(tablePagination|pageCount|pageIndex|pageSize|columnFilters|sorting)"

echo "-- large ts/tsx files (>300 lines) --"
rg --files "${ROOT_DIR}" -g '*.ts' -g '*.tsx' -g '!**/node_modules/**' \
  | while IFS= read -r f; do
      lines="$(wc -l < "$f" | tr -d ' ')"
      if [ "${lines}" -gt 300 ]; then
        printf "%s:%s\n" "$f" "$lines"
      fi
    done \
  | sort -t: -k2,2nr || true
echo

echo "done."
