# Odoo — eridu_auth SSO

Build context for the `Odoo` Railway service. Layers OCA's [`auth_oidc`](https://github.com/OCA/server-auth/tree/19.0/auth_oidc) module onto the stock `odoo:19.0` image so Odoo can authenticate against `eridu_auth`'s OIDC provider.

## Why a custom image

Stock Odoo's built-in `auth_oauth` module only speaks the OAuth2 **implicit** grant (`response_type=token`). `eridu_auth`'s OAuth provider (`@better-auth/oauth-provider`, the same one `Open WebUI` uses — see [`eridu-auth-oauth-provider`](../../.agents/skills/eridu-auth-oauth-provider/SKILL.md)) is OAuth 2.1: authorization-code + PKCE only, no implicit grant. `auth_oidc` adds a proper authorization-code + PKCE flow on top of `auth_oauth`, matching what `eridu_auth` requires.

## Railway wiring

The `Odoo` service is connected to `allenlin90/eridu-services` (branch `master`) with root directory `infra/odoo`. Its declarative settings live in [`.railway/odoo.json`](../../.railway/odoo.json), matching the `.railway/<service>.json` pattern the other services in this repo already use (`eridu_auth.json`, `erify_api.json`, etc.), via the service's `railwayConfigFile` setting.

Two notes from getting this wired up, in case it trips up a future rebuild:

- The dashboard/API `build.builder` field only accepts Railpack-family values (`RAILPACK`/`NIXPACKS`/`HEROKU`/`PAKETO`) — there's no `DOCKERFILE` enum value there. [Config-as-code](https://docs.railway.com/config-as-code/reference)'s `build.builder: "DOCKERFILE"` is the only way to set it explicitly, and it always overrides the dashboard/API setting when `railwayConfigFile` is wired up. That said, a plain `dockerfilePath` set via the API (with no `railway.json` at all) was also observed to correctly trigger a Dockerfile build on a fresh git-push-triggered deployment — the failures hit while setting this up turned out to be caused by the next point, not a hard requirement for config-as-code.
- `railway service redeploy` / the `serviceInstanceRedeploy` mutation reuses the **settings snapshot captured on the deployment being redeployed**, not the service's current live settings. If you change `rootDirectory`/`dockerfilePath`/etc. and then `redeploy` the deployment that predates that change, it silently rebuilds with the old settings and fails the same way. Push a new commit (or otherwise trigger a fresh deployment) instead of redeploying after a settings change.

The volume at `/var/lib/odoo` is unchanged from the prior raw-image deployment.

`auth_oidc` is pinned to a specific commit on OCA/server-auth's `19.0` branch (`OCA_SERVER_AUTH_COMMIT` build arg in the Dockerfile), not the branch tip — so a rebuild triggered by something unrelated (e.g. bumping the base Odoo image) doesn't silently pick up a newer, unreviewed version of the module. To intentionally update it, find the new commit at [OCA/server-auth/commits/19.0](https://github.com/OCA/server-auth/commits/19.0), bump the SHA in the Dockerfile, then re-diff `patches/auth_oidc/` against the new upstream source and re-apply the patch below on top of any upstream changes.

## The EdDSA patch

Upstream `auth_oidc` declares `python-jose` as its dependency and hardcodes `jwt.decode(..., algorithms=["RS256"])` to verify the id_token. `eridu_auth` signs id_tokens with **EdDSA/Ed25519** (confirmed live via its JWKS), and `python-jose` has no EdDSA support at all — not a config gap, the library can't do it. `patches/auth_oidc/` replaces `__manifest__.py` (dependency: `jwt` instead of `python-jose`) and `models/auth_oauth_provider.py` (verification rewritten against `PyJWT[crypto]`, which does support EdDSA) with everything else left identical to upstream. The Dockerfile `COPY`s these over the pinned checkout after cloning.

Verified locally before this shipped: built the image, booted it against a throwaway Postgres, and ran `odoo -i auth_oidc -d test --stop-after-init` — all 29 modules including `auth_oidc` loaded with zero errors and the patched model's DB tables/fields created cleanly. Separately confirmed `PyJWK.from_dict()` + `jwt.decode(..., algorithms=["RS256", "EdDSA"])` correctly verifies a real Ed25519-signed token end-to-end. Not yet verified: an actual full authorization-code round trip against the live `eridu_auth` (needs the OAuth client + provider record from the steps below, which need to exist first).

One known gap versus upstream: `python-jose`'s `decode()` took an `access_token` kwarg to validate the `at_hash` claim (binds the access_token to the id_token). `PyJWT` has no equivalent, so `at_hash` isn't checked here. Low risk for this specific flow (server-to-server token exchange authenticated with a client secret, not a public/implicit client), but worth knowing if this provider record is ever reused for a different flow.

## Master password and admin login bootstrap

The stock `odoo:19.0` entrypoint only reads `HOST`/`PORT`/`USER`/`PASSWORD`/`PASSWORD_FILE` — all Postgres connection args. It never touches an `ADMIN_PASSWD`-style variable, and Odoo's master password (`admin_passwd`, gates `/web/database/manager`'s create/backup/restore/drop actions) has no CLI flag at all — it's a `FileOnlyOption`, config-file only, defaulting to the literal string `"admin"` if never set. Discovered the hard way: a Railway `ADMIN_PASSWD` variable had existed on this service from the original setup but was never actually wired to anything, leaving the real master password at Odoo's insecure default while the manager page was reachable on the public internet.

Two scripts close this gap, both baked into the image:

- **`scripts/set-admin-passwd.sh`** — wraps the real entrypoint (used in `deploy.startCommand`). Writes `admin_passwd = $ADMIN_PASSWD` into `$ODOO_RC` on every boot, so the Railway variable actually does what its name says. Safe to run every boot — this isn't something changed through the UI day-to-day, it's meant to track the variable. Note: `/etc/odoo/` is root-owned (`drwxr-xr-x`), so the `odoo` user can overwrite the existing `odoo.conf` file directly but can't `sed -i` it (needs a temp file in a directory it can't write to) — the script filters into a shell variable first, then truncates the existing file.
- **`scripts/bootstrap-admin-user.py`** — run via `odoo shell` (used in `deploy.preDeployCommand`). Odoo's non-interactive `-i` bootstrap creates the `admin` login with the literal default password `"admin"`; this rotates it to a random strong value **exactly once**, printed to the deploy log (`ODOO_BOOTSTRAP_ROTATED login=... password=...`) for the first login. Idempotent by design: `res.users.password` is never readable via ORM read (Odoo masks it), so the script reads the hash with raw SQL and verifies it against `"admin"` the same way Odoo's own `_check_credentials` does — once rotated, that verify fails and every later deploy just logs `ODOO_BOOTSTRAP_SKIPPED`, so it never clobbers a password someone set through the UI.

`deploy.preDeployCommand` in `.railway/odoo.json` also runs `-i auth_oidc` on every deploy (idempotent — Odoo's `-i` no-ops once a module is installed), which transitively installs `base`/`auth_oauth` too. This means the entire database — schema, `auth_oidc`, a real admin login — is created automatically on first deploy; there's no manual Apps-screen step and no need to ever re-enable the (deliberately hardened) `/web/database/manager` UI.

All three of these were verified locally end-to-end (build → throwaway Postgres → both preDeploy steps → start command) before shipping: `auth_oidc` installs cleanly, the manager correctly shows "disabled by the administrator", the master password from the env var is what's actually in `odoo.conf`, and the rotated admin password is what actually logs in over HTTP.

## One-time setup after this deploys

Everything above is automatic. What's left is the OAuth client + provider wiring — manual admin-UI steps, not scripted, per the OAuth-provider skill's "create clients via UI, not curl" rule, and because they touch two separate admin panels with credentials this repo doesn't hold.

### 1. Create the OAuth client in eridu_auth

Portal → OAuth Clients → Create Client (see the checklist in [`eridu-auth-oauth-provider`](../../.agents/skills/eridu-auth-oauth-provider/SKILL.md#checklist-adding-a-new-oauth-consumer)):

- Redirect URI: `https://odoo.eridu.co.th/auth_oauth/signin` (confirmed from `auth_oauth`'s controller source — `request.httprequest.url_root + "auth_oauth/signin"` — fixed for every provider, OIDC or not)
- Scope: `openid email profile` (no `offline_access` — Odoo's OIDC flow doesn't need a refresh token for login)
- Leave **Require PKCE** checked — unlike Open WebUI's client, `auth_oidc` implements PKCE (`code_verifier` field in its provider model), so this is the one consumer so far that doesn't need the PKCE exception.
- Add `https://odoo.eridu.co.th` to `eridu_auth`'s `ALLOWED_ORIGINS`.

Copy the generated `client_id`/`client_secret` — better-auth never re-exposes the secret after creation.

### 2. Configure the provider in Odoo

Log into Odoo with the admin credentials from the deploy log (see "Master password and admin login bootstrap" above), then Settings → General Settings → Integrations → OAuth Providers → new record:

| Field | Value |
|---|---|
| Provider name | Eridu |
| Flow | OpenID Connect (authorization code flow) |
| Client ID | *(from step 1)* |
| Client Secret | *(from step 1)* |
| Authorization URL | `https://auth.eridu.co.th/api/auth/oauth2/authorize` |
| Token URL | `https://auth.eridu.co.th/api/auth/oauth2/token` |
| JWKS URL | `https://auth.eridu.co.th/api/auth/jwks` |
| Scope | `openid email profile` |
| Enabled | checked |

Leave **Validation Endpoint** blank — the OIDC authorization-code flow verifies the id_token locally via JWKS (see the EdDSA patch above) and never calls it; it's only used by the base module's plain OAuth2 flow. The OCA patch already makes this field optional (`required=False`).

Endpoint values are read directly from `https://auth.eridu.co.th/api/auth/.well-known/openid-configuration`, which is the source of truth if anything above drifts.

### 3. Test

Log out of Odoo, go to `/web/login`, click the new provider button, complete the eridu_auth login, confirm redirect back into Odoo as an authenticated user. Check Odoo's deploy logs for the actual `error`/`error_description` on the callback if it fails — a scope or redirect-URI mismatch surfaces as a generic login failure, not the real OAuth error (same gotcha as the Open WebUI integration).
