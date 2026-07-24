# Odoo — eridu_auth SSO

Build context for the `Odoo` Railway service. Layers OCA's [`auth_oidc`](https://github.com/OCA/server-auth/tree/19.0/auth_oidc) module onto the stock `odoo:19.0` image so Odoo can authenticate against `eridu_auth`'s OIDC provider.

## Why a custom image

Stock Odoo's built-in `auth_oauth` module only speaks the OAuth2 **implicit** grant (`response_type=token`). `eridu_auth`'s OAuth provider (`@better-auth/oauth-provider`, the same one `Open WebUI` uses — see [`eridu-auth-oauth-provider`](../../.agents/skills/eridu-auth-oauth-provider/SKILL.md)) is OAuth 2.1: authorization-code + PKCE only, no implicit grant. `auth_oidc` adds a proper authorization-code + PKCE flow on top of `auth_oauth`, matching what `eridu_auth` requires.

## Railway wiring

The `Odoo` service is connected to `allenlin90/eridu-services` with:

- Root directory: `infra/odoo`
- Dockerfile path: `Dockerfile`

All other service config (variables, volume at `/var/lib/odoo`, start command `/entrypoint.sh odoo --proxy-mode --database=odoo --no-database-list`) is unchanged from the prior raw-image deployment.

`auth_oidc` is pinned to a specific commit on OCA/server-auth's `19.0` branch (`OCA_SERVER_AUTH_COMMIT` build arg in the Dockerfile), not the branch tip — so a rebuild triggered by something unrelated (e.g. bumping the base Odoo image) doesn't silently pick up a newer, unreviewed version of the module. To intentionally update it, find the new commit at [OCA/server-auth/commits/19.0](https://github.com/OCA/server-auth/commits/19.0), bump the SHA in the Dockerfile, then re-diff `patches/auth_oidc/` against the new upstream source and re-apply the patch below on top of any upstream changes.

## The EdDSA patch

Upstream `auth_oidc` declares `python-jose` as its dependency and hardcodes `jwt.decode(..., algorithms=["RS256"])` to verify the id_token. `eridu_auth` signs id_tokens with **EdDSA/Ed25519** (confirmed live via its JWKS), and `python-jose` has no EdDSA support at all — not a config gap, the library can't do it. `patches/auth_oidc/` replaces `__manifest__.py` (dependency: `jwt` instead of `python-jose`) and `models/auth_oauth_provider.py` (verification rewritten against `PyJWT[crypto]`, which does support EdDSA) with everything else left identical to upstream. The Dockerfile `COPY`s these over the pinned checkout after cloning.

Verified locally before this shipped: built the image, booted it against a throwaway Postgres, and ran `odoo -i auth_oidc -d test --stop-after-init` — all 29 modules including `auth_oidc` loaded with zero errors and the patched model's DB tables/fields created cleanly. Separately confirmed `PyJWK.from_dict()` + `jwt.decode(..., algorithms=["RS256", "EdDSA"])` correctly verifies a real Ed25519-signed token end-to-end. Not yet verified: an actual full authorization-code round trip against the live `eridu_auth` (needs the OAuth client + provider record from the steps below, which need to exist first).

One known gap versus upstream: `python-jose`'s `decode()` took an `access_token` kwarg to validate the `at_hash` claim (binds the access_token to the id_token). `PyJWT` has no equivalent, so `at_hash` isn't checked here. Low risk for this specific flow (server-to-server token exchange authenticated with a client secret, not a public/implicit client), but worth knowing if this provider record is ever reused for a different flow.

## One-time setup after this deploys

These are manual admin-UI steps — not scripted, per the OAuth-provider skill's "create clients via UI, not curl" rule, and because they touch two separate admin panels with credentials this repo doesn't hold.

### 1. Install the module in Odoo

1. Log into Odoo as admin → enable developer mode (Settings → General Settings → scroll to bottom → Activate the developer mode, or append `?debug=1` to the URL).
2. Apps → remove the default "Apps" filter → search "OpenID Connect" → if not listed, click **Update Apps List** first.
3. Install **Authentication OpenID Connect** (`auth_oidc`).

### 2. Create the OAuth client in eridu_auth

Portal → OAuth Clients → Create Client (see the checklist in [`eridu-auth-oauth-provider`](../../.agents/skills/eridu-auth-oauth-provider/SKILL.md#checklist-adding-a-new-oauth-consumer)):

- Redirect URI: `https://odoo.eridu.co.th/auth_oauth/signin` (confirmed from `auth_oauth`'s controller source — `request.httprequest.url_root + "auth_oauth/signin"` — fixed for every provider, OIDC or not)
- Scope: `openid email profile` (no `offline_access` — Odoo's OIDC flow doesn't need a refresh token for login)
- Leave **Require PKCE** checked — unlike Open WebUI's client, `auth_oidc` implements PKCE (`code_verifier` field in its provider model), so this is the one consumer so far that doesn't need the PKCE exception.
- Add `https://odoo.eridu.co.th` to `eridu_auth`'s `ALLOWED_ORIGINS`.

Copy the generated `client_id`/`client_secret` — better-auth never re-exposes the secret after creation.

### 3. Configure the provider in Odoo

Settings → General Settings → Integrations → OAuth Providers → new record:

| Field | Value |
|---|---|
| Provider name | Eridu |
| Flow | OpenID Connect (authorization code flow) |
| Client ID | *(from step 2)* |
| Client Secret | *(from step 2)* |
| Authorization URL | `https://auth.eridu.co.th/api/auth/oauth2/authorize` |
| Token URL | `https://auth.eridu.co.th/api/auth/oauth2/token` |
| JWKS URL | `https://auth.eridu.co.th/api/auth/jwks` |
| Scope | `openid email profile` |
| Enabled | checked |

Leave **Validation Endpoint** blank — the OIDC authorization-code flow verifies the id_token locally via JWKS (see the EdDSA patch above) and never calls it; it's only used by the base module's plain OAuth2 flow. The OCA patch already makes this field optional (`required=False`).

Endpoint values are read directly from `https://auth.eridu.co.th/api/auth/.well-known/openid-configuration`, which is the source of truth if anything above drifts.

### 4. Test

Log out of Odoo, go to `/web/login`, click the new provider button, complete the eridu_auth login, confirm redirect back into Odoo as an authenticated user. Check Odoo's deploy logs for the actual `error`/`error_description` on the callback if it fails — a scope or redirect-URI mismatch surfaces as a generic login failure, not the real OAuth error (same gotcha as the Open WebUI integration).
