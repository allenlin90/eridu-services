#!/bin/bash
set -e

# Single entry point for deploy.preDeployCommand - installs/updates auth_oidc
# (idempotent, creates the database on first deploy) then syncs the admin
# login password from ODOO_ADMIN_PASSWORD (also idempotent - see
# sync-admin-password.py). Combined into one script, and preDeployCommand
# stays a single plain path with no arguments, for the same reason
# sync-admin-password.sh is its own file: Railway's preDeployCommand array
# entries aren't guaranteed to go through a real shell, so any metacharacters
# (even a plain `&&` between two entries) are safer pushed into a real script
# with a real shebang than left in the command string Railway sees directly.
/entrypoint.sh odoo -i auth_oidc -d odoo --without-demo=all --stop-after-init
/sync-admin-password.sh
