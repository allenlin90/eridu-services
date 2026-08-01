#!/bin/sh
# Railway entrypoint for the Open WebUI config sync runner.
#
# Defaults to a read-only drift check. Writing to the live instance requires
# deliberately setting PUSH_APPLY, and revoking access requires a second,
# separate opt-in — neither happens by accident on a scheduled run.
#
#   PUSH_TARGET             skills | models | access | all   (default: all)
#   PUSH_APPLY              set to 1 to write; unset = dry run
#   PUSH_CONFIRM_REVOKES    set to 1 to allow revoking access grants
#
# Exit codes come straight from push_config.py, so Railway's deployment status
# carries the result:
#   0  live matches the repo (or an apply succeeded)
#   1  failure
#   2  drift found — the scheduled check's "something changed" signal
#   3  OPEN_WEBUI_API_KEY / OPEN_WEBUI_HOST not set
set -eu

TARGET="${PUSH_TARGET:-all}"
set -- "$TARGET"

if [ "${PUSH_APPLY:-}" = "1" ]; then
  set -- "$@" --apply
  # The confirmation prompt cannot be answered in a container. Without this,
  # push_config.py aborts rather than revoking unattended.
  if [ "${PUSH_CONFIRM_REVOKES:-}" = "1" ]; then
    set -- "$@" --yes
    echo "MODE: apply, revokes permitted"
  else
    echo "MODE: apply, revokes will abort the run (set PUSH_CONFIRM_REVOKES=1 to allow)"
  fi
else
  echo "MODE: dry run (set PUSH_APPLY=1 to write)"
fi

echo "TARGET: $TARGET"
exec python3 push_config.py "$@"
