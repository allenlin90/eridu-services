# Run via `odoo shell -d odoo --no-http` on every deploy (see
# scripts/sync-admin-password.sh, wired into deploy.preDeployCommand).
#
# Applies ODOO_ADMIN_PASSWORD to the admin login whenever it's safe to: on the
# very first run (nothing recorded yet) or whenever the current password still
# matches what this script last set it to. Backs off the moment a human
# changes the password through the UI - tracked by storing the *hash* of what
# was last applied (not the password itself) and comparing against the
# current hash before ever touching it, so a stale env var can never silently
# overwrite a real password change.
#
# This is the mechanism that also fixes an already-installed database (the
# post_init_hook in auth_oidc's eridu_bootstrap.py only fires on a genuine
# first install, so it can't retroactively apply ODOO_ADMIN_PASSWORD to a
# database whose auth_oidc install predates that variable being set - this
# script runs every deploy and catches that case too).
import os

SYNC_MARKER_PARAM = "eridu.admin_password_synced_hash"


def main():
    desired = os.environ.get('ODOO_ADMIN_PASSWORD')
    if not desired:
        return

    users = env['res.users']
    admin = users.search([('login', '=', 'admin')], limit=1)
    if not admin:
        return

    icp = env['ir.config_parameter'].sudo()
    ctx = users._crypt_context()

    env.cr.execute("SELECT COALESCE(password, '') FROM res_users WHERE id=%s", [admin.id])
    [current_hash] = env.cr.fetchone()

    if current_hash:
        try:
            if ctx.verify(desired, current_hash):
                return  # already exactly what we want
        except Exception:
            pass

    last_synced_hash = icp.get_param(SYNC_MARKER_PARAM)
    if last_synced_hash and current_hash != last_synced_hash:
        print("SYNC_SKIPPED: admin password changed outside this sync, leaving it alone")
        return

    admin.write({'password': desired})
    env.cr.execute("SELECT COALESCE(password, '') FROM res_users WHERE id=%s", [admin.id])
    [new_hash] = env.cr.fetchone()
    icp.set_param(SYNC_MARKER_PARAM, new_hash)
    env.cr.commit()
    print("SYNC_APPLIED: admin password set from ODOO_ADMIN_PASSWORD")


main()
