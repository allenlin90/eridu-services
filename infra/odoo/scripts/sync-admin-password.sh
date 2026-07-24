#!/bin/bash
set -e

# Used in deploy.preDeployCommand as a single plain path with no arguments or
# shell metacharacters - Railway's preDeployCommand array entries aren't
# guaranteed to go through a real shell (see infra/odoo/README.md), so the
# `< /sync-admin-password.py` redirection has to live inside a real script
# file with a real shebang, not in the command string Railway sees directly.
if [ -z "$ODOO_ADMIN_PASSWORD" ]; then
  exit 0
fi

/entrypoint.sh odoo shell -d odoo --no-http < /sync-admin-password.py
