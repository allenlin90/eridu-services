---
name: eridu-auth-oauth-provider
description: Extend eridu_auth as an OAuth2 or OIDC provider for consent, client management, consumer integration, and JWT coexistence.
---

# eridu_auth OAuth/OIDC Provider

## Key Files

| Piece | Path |
|---|---|
| Plugin config | `apps/eridu_auth/src/lib/auth.ts` (`oauthProvider(...)`) |
| Shared frontend auth client | `apps/eridu_auth/src/frontend/features/auth/api/auth-client.ts` (`oauthProviderClient()`) |
| Consent route/page/form | `apps/eridu_auth/src/frontend/routes/consent.tsx`, `pages/consent-page.tsx`, `features/auth/components/consent-form.tsx` |
| Admin client-management UI | `apps/eridu_auth/src/frontend/features/portal/components/admin-oauth-client-*.tsx`, `oauth-client-*-dialog.tsx`, `oauth-client-update-form.tsx`, `hooks/use-oauth-clients.ts` |
| Custom admin server route (PKCE toggle) | `apps/eridu_auth/src/routes/oauth-clients.ts`, mounted at `/api/admin/oauth-clients` in `src/index.ts` |
| Setup docs | `apps/eridu_auth/docs/SETUP_GUIDE.md` — "OAuth/OIDC Provider" section |

## Two Independent Auth Mechanisms Coexist — Don't Conflate Them

- **`jwt()` plugin + `/api/auth/token` + `set-auth-jwt` header**: the existing session-to-JWT bridge. `erify_studios`/`erify_creators` (SPA) cache the JWT from the `set-auth-jwt` response header; `@eridu/auth-sdk`'s SSR flow (`eridu_docs`) fetches it from `GET /api/auth/token`. erify_api verifies these JWTs via JWKS.
- **`oauthProvider()` + `/oauth2/*`**: a separate OAuth2/OIDC authorization-code flow for third-party OIDC clients (Open WebUI, etc.) that never touch the JWT bridge above.

**Critical**: better-auth's own docs recommend `disabledPaths: ['/token']` (root config) and `jwt({ disableSettingJwtHeader: true })` once an oauth-provider is present, for OAuth spec compliance. **Do not do this in eridu_auth** — it would 404 `/api/auth/token` and stop the `set-auth-jwt` header, breaking every existing frontend's auth. There is no real route collision to fix: `oauth-provider` mounts under `/oauth2/*`, not `/token`. Only revisit once `erify_studios`/`erify_creators`/`eridu_docs` migrate off the JWT bridge onto the OAuth2 flow themselves.

## Client-Management Authorization — Must Configure Both

better-auth's oauth-provider client-management endpoints (create/list/update/delete/rotate-secret) are **not admin-gated by default**:
- `assertClientPrivileges` only requires *a* valid session unless you pass `clientPrivileges`.
- `getClientsEndpoint` scopes results by `userId` (whoever created it) unless you pass `clientReference`.

Without both, any authenticated non-admin user can create/list/delete OAuth clients via a direct API call, and each admin only sees clients they personally created. Always configure:

```ts
oauthProvider({
  ...
  clientReference: () => 'platform', // shared pool: any admin can see/manage any client
  clientPrivileges: ({ user }) => (user as ExtendedUser | undefined)?.role === 'admin',
}),
```

Verify by calling `GET /api/auth/oauth2/get-clients` from a non-admin session — must return 401.

Client management here is intentionally internal-admin-only. Do not add dynamic/self-service client registration (`allowDynamicClientRegistration`) as a "convenience" improvement — that's a separate scope decision requiring its own design (rate limiting, approval flow), only worth doing if an external party actually requests self-registration.

## Admin-Only Endpoints Are `SERVER_ONLY` — Don't Wire Them To The Browser Client

`/admin/oauth2/create-client` and `/admin/oauth2/update-client` have `metadata.SERVER_ONLY: true` — better-auth rejects them over HTTP from any client, browser or otherwise. Use the plain endpoints instead (gated by `clientPrivileges` above): `authClient.oauth2.createClient/getClients/updateClient/deleteClient/client.rotateSecret(...)`.

## Consent Page

- `oauthProvider({ consentPage: '/consent' })` redirects here with `client_id`/`scope` query params (plus a signed query blob needed to resume the flow).
- Register `oauthProviderClient()` (from `@better-auth/oauth-provider/client`) on the shared `authClient`. Its fetch plugin auto-attaches the signed query to any non-GET request whenever `window.location.search` contains a `sig` param — so `authClient.oauth2.consent({ accept })` and `authClient.oauth2.publicClient({ query: { client_id } })` just work without manually threading the query string through.
- Look up the client's display name via `oauth2.publicClient` before rendering scopes; fall back to the raw `client_id` if that call errors (it requires an established session — can fail transiently) so the user can still see requested scopes and decide.
- `oauth2.consent({ accept, scope? })` resolves to `{ data: { redirect: boolean; url: string } }` — navigate via `window.location.href = data.url`.
- Reference implementation: `consent-form.tsx` (derive `clientId`/`scopes` synchronously from `window.location.search` at render time — this app is pure client-rendered, so there's no need for a `useEffect` + state round-trip just to read the URL; only the async client-name fetch needs an effect).

## Admin Client-Management UI Pattern

Mirrors `admin-user-management.tsx` (tab shell: list / create) — reuse that structure for any future admin CRUD surface in this app:
- Hook: plain fetch-on-mount + `refresh()`, no pagination (client counts are small; don't add `TablePagination` here).
- List: `@eridu/ui` `Table` + `DataTableActions` (kebab menu) with `renderExtraActions` for the non-standard "Rotate Secret" action, `onEdit`/`onDelete` for the standard ones — per `table-view-pattern`'s row-actions convention, even for a 3-action row.
- Create / Rotate Secret: both must show the returned secret **once**, in a dismissable panel with `CopyableText`. Never persist it client-side beyond that render — better-auth never re-exposes a stored secret.
- Delete: `AlertDialog` confirmation naming the client, warning that its signed-in users will be signed out.

## Before Registering A New Consumer, Confirm It Can Actually Do Authorization-Code + PKCE

`eridu_auth`'s `oauthProvider()` is spec-compliant OAuth 2.1: authorization-code + PKCE only, **no implicit grant** (confirmed live via `/api/auth/.well-known/openid-configuration`'s `grant_types_supported`/`response_types_supported`/`code_challenge_methods_supported`). Some OAuth-capable software only ever implemented the older implicit flow (`response_type=token`) and is flatly incompatible — not a config problem, a protocol mismatch no client-side setting fixes. Confirmed case: stock Odoo's built-in `auth_oauth` module (see the Odoo entry below) — required swapping in OCA's `auth_oidc` module, which adds real authorization-code + PKCE support, before a client registration here could ever work. Check this before spending time on the consumer-side config.

## Consumer Integration

### Open WebUI

Give the consumer the literal discovery URL: `OPENID_PROVIDER_URL=https://<host>/api/auth/.well-known/openid-configuration`. Open WebUI (and most generic-OIDC client configs) take this as a literal URL, not an issuer root to derive `.well-known` from. **Do not** add extra root-level `/.well-known/*` routing just to satisfy better-auth's own startup warning about `basePath !== '/'` — that warning targets spec-purist auto-discovering clients (RFC 8414 well-known insertion), not this consumer. Silence it with `oauthProvider({ silenceWarnings: { oauthAuthServerConfig: true, openidConfig: true } })` only if the log noise matters, or ignore it.

A client's registered `scope` (set at creation, default `openid profile email offline_access` in the Create form) is the actual allow-list checked against what the consumer requests — **not** the provider's global `scopes` array in `auth.ts`. The consumer's requested scope string must match the client's registered scope exactly, including spelling: `offline_access`, not `offline`. A mismatch is rejected with `invalid_scope`, which some consumers (Open WebUI included) surface to the end user as a generic, misleading "email or password incorrect" error instead of the real OAuth error — check the consumer's server logs for the actual `error`/`error_description` query params on its callback redirect before assuming a credentials problem.

For Open WebUI specifically, working values are `OAUTH_SCOPES="openid email profile"` (no `offline_access` — see PKCE note below) and, if the same email may already exist as a local Open WebUI account, `OAUTH_MERGE_ACCOUNTS_BY_EMAIL=true`. Open WebUI's docs call merge-by-email unsafe in general (an IdP that doesn't verify emails could allow account takeover), but it's safe here because eridu_auth's `emailAndPassword.requireEmailVerification: true` guarantees a verified email before any session — including the OAuth flow — is issued.

### Odoo

Full walkthrough in `infra/odoo/README.md`. Stock Odoo can't be a consumer at all (see the compatibility note above) — required a custom Dockerfile (`infra/odoo/Dockerfile`) adding OCA's `auth_oidc` module, itself patched to swap `python-jose` for `PyJWT[crypto]` since `python-jose` has no EdDSA support and eridu_auth signs with EdDSA/Ed25519. Redirect URI is fixed by Odoo's own `auth_oauth` controller: `https://<odoo-host>/auth_oauth/signin`. Scope `openid email profile`, no `offline_access`, same reasoning as Open WebUI. Unlike Open WebUI, `auth_oidc` genuinely implements PKCE (`code_verifier` on its provider model) — this is the one consumer so far that does **not** need the "uncheck Require PKCE" exception below.

## PKCE Is Required By Default — No Endpoint To Change It Post-Creation

better-auth's oauth-provider defaults every client to `require_pkce: true`, and separately **always** requires PKCE when a request includes the `offline_access` scope, regardless of that setting. Neither the plain client SDK (`authClient.oauth2.createClient` / `updateClient`) nor even the `SERVER_ONLY` admin endpoints (`/admin/oauth2/create-client`, `/admin/oauth2/update-client`) expose `require_pkce` for anything except client *creation* — there is no supported way to change it on an existing client through better-auth itself.

Consumers whose OAuth library doesn't implement PKCE (confirmed for Open WebUI's built-in authlib-based OIDC client, as of the version tested) will fail every login with `invalid_request: pkce is required for this client` until this is turned off for that specific client.

`apps/eridu_auth/src/routes/oauth-clients.ts` fills this gap: a small admin-only Hono route (`PATCH /api/admin/oauth-clients/:clientId/require-pkce`, mounted in `src/index.ts`) that updates the `oauthClient.requirePKCE` column directly through the app's own Drizzle connection, gated by `hasRole(user, 'admin')`. It's wired to a "Require PKCE" checkbox in `oauth-client-update-form.tsx`. This is the only way to flip this flag after a client already exists — if better-auth ever adds a real update endpoint for it, prefer that over the custom route.

Don't request `offline_access` for a consumer that can't do PKCE — there's no way to satisfy the offline_access-forces-PKCE rule short of implementing PKCE in the consumer, so just omit the scope (see Open WebUI scopes above).

## Verifying Non-Obvious better-auth Client Typings

better-auth's docs for a given version are frequently incomplete or stale for exact client method names and payload shapes. Don't guess — probe the compiled types instead of trusting docs:

```ts
// scratch file, delete before committing
type X = Parameters<typeof authClient.oauth2.createClient>[0];
const _x: never = null as unknown as X; // forces tsc to print the full type in the error
```

Run `tsc --noEmit --noErrorTruncation -p tsconfig.app.json` and read the resulting error message for the full type shape.

## Checklist: Adding A New OAuth Consumer

- [ ] Confirm the consumer's OAuth implementation actually supports authorization-code + PKCE — some only ever implemented the older implicit grant and are flatly incompatible, no config fixes it (see above)
- [ ] Create the client via the admin UI (Portal → OAuth Clients → Create Client), not a raw `curl` against the endpoint
- [ ] Give the consumer its `client_id`/`client_secret` via its own environment (e.g. Railway variables) — never commit them to this repo
- [ ] Add the consumer's public origin to `ALLOWED_ORIGINS`; confirm `COOKIE_DOMAIN` covers the shared parent domain
- [ ] Point the consumer's OIDC config at `/api/auth/.well-known/openid-configuration`, not a bare issuer root
- [ ] Set the consumer's requested scopes to exactly match the client's registered scope string (`offline_access`, not `offline`)
- [ ] Confirm whether the consumer's OAuth library implements PKCE; if not, uncheck "Require PKCE" for that client (Portal → OAuth Clients → Edit) and don't request `offline_access`
- [ ] Do not touch `disabledPaths`/`disableSettingJwtHeader` on the `jwt()` plugin for this

## Related Skills

- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md) — governs Open WebUI/LiteLLM/MCP as one platform; this skill covers the eridu_auth-side implementation it depends on
- [`.agents/memory/odoo-railway-sso-integration.md`](../../memory/odoo-railway-sso-integration.md) — Railway platform gotchas (preDeployCommand reliability, config-as-code, redeploy-vs-fresh-trigger) and Odoo-specific findings from building the Odoo consumer integration above
- [ssr-auth-integration](../ssr-auth-integration/SKILL.md) — the JWKS/JWT-cookie pattern this provider's `jwt()` bridge must keep working
- [table-view-pattern](../table-view-pattern/SKILL.md) — row-actions convention used by the admin client list
- [frontend-ui-components](../frontend-ui-components/SKILL.md) — `@eridu/ui` `Form`/`Dialog`/`AlertDialog` conventions used throughout the admin UI
