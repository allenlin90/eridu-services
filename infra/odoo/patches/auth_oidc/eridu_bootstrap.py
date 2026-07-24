# Runs via post_init_hook (see __manifest__.py) - fires exactly once, only on
# auth_oidc's genuine first install (Odoo skips post_init_hook on later `-i`
# calls once a module is already installed), so this never clobbers a password
# set through the UI, and never re-runs on a future redeploy or Odoo version
# bump that reuses the same database - the check is "has this database's
# auth_oidc been installed", which Odoo tracks itself, not anything version-
# specific. See infra/odoo/README.md "Master password and admin login
# bootstrap" for the full rationale, including why this had to move off
# `odoo shell` + stdin redirection (Railway's preDeployCommand array entries
# aren't guaranteed to go through a real shell, so `<` redirection inside a
# quoted string silently failed with no usable log output).
#
# Prefers ODOO_ADMIN_PASSWORD (set as a Railway variable, same pattern as
# ADMIN_PASSWD for the master password) so the whole flow is one-shot
# automated with no manual retrieval step. Falls back to generating a random
# password if that variable isn't set - since that value can't be delivered
# anywhere safely (preDeployCommand has no volume mounted, and logging it
# would put a plaintext credential in log aggregation - flagged by automated
# security review), it's stored in ir.config_parameter under
# BOOTSTRAP_PASSWORD_PARAM instead, retrievable via `odoo shell` by someone
# who already has production DB access. Set ODOO_ADMIN_PASSWORD to avoid ever
# needing that fallback.
import os
import secrets

BOOTSTRAP_PASSWORD_PARAM = "eridu.bootstrap_admin_password"


def bootstrap_admin_password(env):
    users = env['res.users']
    admin = users.search([('login', '=', 'admin')], limit=1)
    if not admin:
        return

    ctx = users._crypt_context()
    env.cr.execute("SELECT COALESCE(password, '') FROM res_users WHERE id=%s", [admin.id])
    [hashed] = env.cr.fetchone()
    is_default = False
    if hashed:
        try:
            is_default = ctx.verify('admin', hashed)
        except Exception:
            is_default = False
    if not is_default:
        return

    chosen_password = os.environ.get('ODOO_ADMIN_PASSWORD')
    if chosen_password:
        admin.write({'password': chosen_password})
    else:
        new_password = secrets.token_urlsafe(18)
        admin.write({'password': new_password})
        env['ir.config_parameter'].sudo().set_param(BOOTSTRAP_PASSWORD_PARAM, new_password)
    env.cr.commit()
