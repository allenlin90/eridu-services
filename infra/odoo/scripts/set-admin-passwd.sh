#!/bin/bash
set -e

# Odoo's own entrypoint.sh never reads ADMIN_PASSWD - it only wires HOST/PORT/USER/
# PASSWORD (all Postgres connection args). admin_passwd (the /web/database/manager
# master password) is a FileOnlyOption in Odoo - it can only come from the config
# file, never a CLI flag or env var directly - so this writes it into $ODOO_RC from
# ADMIN_PASSWD on every boot before the real entrypoint runs. Safe to run every
# boot: this value isn't something an admin changes day-to-day through the UI, it's
# meant to track the Railway variable.
if [ -n "$ADMIN_PASSWD" ]; then
  # /etc/odoo/ is root-owned (dr-xr-xr-x) - the odoo user can write odoo.conf
  # itself but not create a temp file in its directory, so `sed -i` fails with
  # a permission error. Filter into a variable first, then overwrite the
  # existing file directly (truncate, no new inode needed).
  FILTERED="$(grep -v -E '^\s*;?\s*admin_passwd\s*=' "$ODOO_RC")"
  { printf '%s\n' "$FILTERED"; echo "admin_passwd = $ADMIN_PASSWD"; } > "$ODOO_RC"
fi

exec /entrypoint.sh "$@"
