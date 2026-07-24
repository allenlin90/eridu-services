# Runs via post_init_hook (see __manifest__.py) - fires exactly once, only on
# auth_oidc's genuine first install (Odoo skips post_init_hook on later `-i`
# calls once a module is already installed), so this never clobbers a password
# set through the UI. See infra/odoo/README.md "Master password and admin
# login bootstrap" for the full rationale, including why this had to move off
# `odoo shell` + stdin redirection (Railway's preDeployCommand array entries
# aren't guaranteed to go through a real shell, so `<` redirection inside a
# quoted string silently failed with no usable log output).
#
# The rotated password is deliberately NOT logged: preDeployCommand runs in a
# separate container from the app with no volume mounted (Railway's own docs),
# so there's nowhere durable+permissioned to write it, and Odoo's logger is
# the only output channel proven to reach Railway's log pipeline reliably -
# which means logging it would put a plaintext credential in log
# aggregation, with broader retention/access than this one-time bootstrap
# secret needs. Instead it's stored in ir.config_parameter (same place Odoo
# keeps its own runtime secrets) under BOOTSTRAP_PASSWORD_PARAM, readable only
# via `odoo shell` by someone who already has production DB access - retrieve
# and then delete it (see infra/odoo/README.md).
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

    new_password = secrets.token_urlsafe(18)
    admin.write({'password': new_password})
    env['ir.config_parameter'].sudo().set_param(BOOTSTRAP_PASSWORD_PARAM, new_password)
    env.cr.commit()
