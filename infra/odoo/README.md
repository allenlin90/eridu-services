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

- **`scripts/set-admin-passwd.sh`** — wraps the real entrypoint (used in `deploy.startCommand`). Writes `admin_passwd = $ADMIN_PASSWD` into `$ODOO_RC` on every boot, so the Railway variable actually does what its name says. Safe to run every boot — this isn't something changed through the UI day-to-day, it's meant to track the variable. Note: `/etc/odoo/` is root-owned (`drwxr-xr-x`), so the `odoo` user can overwrite the existing `odoo.conf` file directly but can't `sed -i` it (needs a temp file in a directory it can't write to) — the script filters into a shell variable first, then truncates the existing file.
- **`patches/auth_oidc/eridu_bootstrap.py`**, wired as `auth_oidc`'s `post_init_hook` in `__manifest__.py`. Odoo's non-interactive `-i` bootstrap creates the `admin` login with the literal default password `"admin"`; this rotates it away on first install. Naturally one-shot and version-upgrade-safe: `post_init_hook` only fires when a module is genuinely installed for the first time in a given database, never on a later `-i` of an already-installed module — so it never re-fires on a routine redeploy or an Odoo image version bump that reuses the same Postgres database, and it never clobbers a password someone set through the UI. Belt-and-suspenders on top of that: it also verifies the current password hash against `"admin"` first (the same way Odoo's own `_check_credentials` does — `res.users.password` is never readable via a plain ORM read, so this reads the hash with raw SQL) and no-ops if it's already been changed.

  This didn't start as a module hook — the first attempt ran the rotation via `odoo shell` piped a script from `deploy.preDeployCommand`, using a `sh -c "... < script.py"` string embedded in the command array for the stdin redirection. It failed instantly with **zero** logs anywhere (build logs, deploy logs, `deploymentLogs`/`buildLogs` GraphQL queries, `--latest` — all empty), and the deployment's own settings snapshot didn't even reflect the new command, making it look like config-as-code wasn't being read at all. Root cause never fully confirmed, but the leading theory is Railway's `preDeployCommand` array entries aren't guaranteed to go through a real shell — a naively argv-split embedded string with `<` and quotes inside it is exactly the kind of thing that breaks silently. Moving the logic into `post_init_hook` sidesteps the question entirely: `deploy.preDeployCommand` is now a single command with no shell metacharacters at all.

  **Set `ODOO_ADMIN_PASSWORD` (a Railway variable) to fully automate this** — same pattern as `ADMIN_PASSWD` for the master password. If set, the hook applies it directly to the `admin` login on first install: no generation, no retrieval step, nothing to run by hand, ever. This is the intended steady-state configuration.

  **Fallback if `ODOO_ADMIN_PASSWORD` isn't set**: the hook generates a random password instead. It's deliberately never logged — `deploy.preDeployCommand` runs in a separate container from the app with no volume mounted (Railway's own docs), so there's nowhere durable+permissioned to write it, and Odoo's logger was the only output channel proven to reach Railway's log pipeline — logging it there would mean a plaintext credential sitting in log aggregation with far broader retention/access than a one-time bootstrap secret needs (flagged by automated security review; the first version of this file did exactly that). Instead it's stored in `ir.config_parameter` (same place Odoo keeps its own runtime secrets) under the key `eridu.bootstrap_admin_password`. Retrieve it — and then delete it — with:

  ```bash
  railway ssh --project 0dafd8e0-b2a6-4e1e-821b-f3bb6e2b6237 --environment production --service <odoo-service-id> -- bash -c "odoo shell -d odoo --no-http" <<'PYEOF'
  icp = env['ir.config_parameter'].sudo()
  print('PASSWORD=' + repr(icp.get_param('eridu.bootstrap_admin_password')))
  icp.set_param('eridu.bootstrap_admin_password', False)
  env.cr.commit()
  PYEOF
  ```

- **`patches/sync-admin-password.py`** (run via `scripts/sync-admin-password.sh`, wired into `deploy.preDeployCommand` — every deploy, not just first install). `post_init_hook` above only ever fires once, so it can't retroactively apply `ODOO_ADMIN_PASSWORD` to a database whose `auth_oidc` install predates that variable being set (exactly what happened here — the module got installed before this mechanism existed). This script closes that gap and covers future rotations too: if `ODOO_ADMIN_PASSWORD` is set and the current password already matches it, no-op. If it doesn't match, check whether the current password hash still equals what this script last applied (tracked in `ir.config_parameter` under `eridu.admin_password_synced_hash`, storing the *hash*, not the password) — if so, it's safe to apply the (possibly newly-changed) variable; if the hash has moved since our last write, a human changed the password through the UI in between, and this backs off rather than clobbering it.

  `scripts/sync-admin-password.sh` exists only so this can be invoked as a single plain file path with zero shell metacharacters — the redirection into `odoo shell` lives inside the script's own `#!/bin/bash` interpretation, not in a command string Railway sees directly, which is what the earlier `sh -c "... < script.py"` attempt got wrong.

  Verified locally end-to-end, including the failure mode that matters most: installed a database without the variable set (simulating an already-rotated, unknown password), then ran only this script with the variable set for the first time — it applied and logged in correctly. Re-ran with the same value — silent no-op. Simulated a human changing the password through the UI, then re-ran the sync with the old variable value — correctly skipped, and confirmed via HTTP that the human's password still worked and the stale synced one no longer did.

`deploy.preDeployCommand` in `.railway/odoo.json` is a single entry, `scripts/pre-deploy.sh`, which runs `-i auth_oidc` (idempotent — Odoo's `-i` no-ops once a module is installed, transitively installs `base`/`auth_oauth` too, fires the hook above on the first run) and then the sync script above. It's one script instead of two `preDeployCommand` array entries because two entries — `-i auth_oidc ...` and `/sync-admin-password.sh` separately — deployed clean locally every time but failed in production with the same zero-log signature as the very first `sh -c` attempt, for a reason never fully confirmed (build always succeeded; only the preDeploy phase failed, and no build log, deploy log, or `buildLogs`/`deploymentLogs` GraphQL query ever showed why). Collapsing to one script eliminates whatever about multiple array entries was involved, alongside just being fewer moving parts. This means the entire database — schema, `auth_oidc`, a real admin login kept in sync with `ODOO_ADMIN_PASSWORD` — is created and maintained automatically; there's no manual Apps-screen step, no manual password-retrieval step, and no need to ever re-enable the (deliberately hardened) `/web/database/manager` UI.

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
