# Runs via post_init_hook (see __manifest__.py) - fires exactly once, only on
# auth_oidc's genuine first install (Odoo skips post_init_hook on later `-i`
# calls once a module is already installed), so this never clobbers a password
# set through the UI. See infra/odoo/README.md "Master password and admin
# login bootstrap" for the full rationale, including why this had to move off
# `odoo shell` + stdin redirection (Railway's preDeployCommand array entries
# aren't guaranteed to go through a real shell, so `<` redirection inside a
# quoted string silently failed with no usable log output).
import secrets


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
    env.cr.commit()
    print("ODOO_BOOTSTRAP_ROTATED login=%s password=%s" % (admin.login, new_password))
