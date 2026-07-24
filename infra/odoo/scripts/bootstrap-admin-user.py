# Run via `odoo shell` (see .railway/odoo.json's preDeployCommand). Odoo's
# non-interactive `-i base` bootstrap creates the admin user with the literal
# default password "admin" - this rotates it to a random strong value exactly
# once, printed to the deploy log for the first login. `res.users.password` is
# never readable via ORM read (Odoo masks it), so the default-password check
# reads the hash with raw SQL and verifies it the same way Odoo's own
# _check_credentials does. Idempotent: once rotated, verify() against "admin"
# fails and every later deploy just prints ODOO_BOOTSTRAP_SKIPPED - safe to run
# on every deploy, never clobbers a password someone set through the UI.
import secrets

users = env['res.users']
admin = users.search([('login', '=', 'admin')], limit=1)
ctx = users._crypt_context()

is_default = False
if admin:
    env.cr.execute("SELECT COALESCE(password, '') FROM res_users WHERE id=%s", [admin.id])
    [hashed] = env.cr.fetchone()
    if hashed:
        try:
            is_default = ctx.verify('admin', hashed)
        except Exception:
            is_default = False

if admin and is_default:
    new_password = secrets.token_urlsafe(18)
    admin.write({'password': new_password})
    env.cr.commit()
    print("ODOO_BOOTSTRAP_ROTATED login=%s password=%s" % (admin.login, new_password))
else:
    print("ODOO_BOOTSTRAP_SKIPPED already customized or no admin user found")
