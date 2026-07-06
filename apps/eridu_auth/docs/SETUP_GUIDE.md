# Setup Guide

> **TLDR**: Email/password auth is live (Phase 1). Set the required env vars, run `pnpm db:migrate`, seed test users with `pnpm seed`, and use the API endpoints below. An OAuth/OIDC provider is available for downstream clients such as Open WebUI. SSO providers (Google, LINE) are configured but not yet enabled.

## Quick Start

```bash
cd apps/eridu_auth
cp .env.example .env          # Populate required values (see below)
pnpm install
pnpm auth:schema              # Generate Better Auth DB schema
pnpm db:generate              # Generate Drizzle migration
pnpm db:migrate               # Apply migration
pnpm seed                     # Seed test users
pnpm dev                      # Start on http://localhost:3000
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/eridu_auth` |
| `BETTER_AUTH_SECRET` | Secret key for JWT signing (min 32 chars) | `your-secret-key-here...` |
| `BETTER_AUTH_URL` | Public URL of the auth service | `http://localhost:3000` |

### Application Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `ALLOWED_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173,http://localhost:5174` |
| `COOKIE_DOMAIN` | Shared parent domain for cross-subdomain session cookies | `.example.com` |

### Optional (SSO — disabled in Phase 1)

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google SSO |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google SSO |
| `LINE_CLIENT_ID` | LINE Login channel ID | LINE SSO |
| `LINE_CLIENT_SECRET` | LINE Login channel secret | LINE SSO |

### Environment Examples

**Development:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eridu_auth
BETTER_AUTH_SECRET=dev-secret-key-minimum-32-characters-long
BETTER_AUTH_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

**Production:**
```env
DATABASE_URL=postgresql://user:password@prod-host:5432/eridu_auth
BETTER_AUTH_SECRET=<generated-secret-64-chars>
BETTER_AUTH_URL=https://auth.example.com
ALLOWED_ORIGINS=https://creators.example.com,https://studios.example.com,https://openwebui.example.com
COOKIE_DOMAIN=.example.com
```

> [!CAUTION]
> Never commit `BETTER_AUTH_SECRET` to version control. Use environment-specific secrets management.

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Auth as eridu_auth
    participant API as erify_api
    participant DB as PostgreSQL

    Browser->>Auth: POST /api/auth/sign-in/email
    Auth->>DB: Validate credentials
    DB-->>Auth: User record
    Auth-->>Browser: JWT token + session

    Browser->>API: GET /me (Authorization: Bearer <JWT>)
    API->>API: Verify JWT locally (cached JWKS)
    API-->>Browser: User profile
```

### Phase 1 Features (Current)

| Feature | Status |
|---------|--------|
| Email/password sign-up & sign-in | ✅ |
| JWT token issuance (EdDSA/Ed25519) | ✅ |
| JWKS endpoint for token verification | ✅ |
| Session management | ✅ |
| Password reset | ✅ (disabled by default) |
| Email verification | ✅ (disabled by default) |
| OAuth/OIDC provider (Open WebUI and other downstream clients) | ✅ |
| Google SSO | ⏳ Configured, not enabled |
| LINE SSO | ⏳ Configured, not enabled |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/sign-up/email` | Register new user |
| `POST` | `/api/auth/sign-in/email` | Sign in with email/password |
| `GET` | `/api/auth/session` | Get current session |
| `POST` | `/api/auth/sign-out` | Sign out |
| `GET` | `/api/auth/jwks` | Get JWKS (for token verification) |
| `GET` | `/api/auth/user/profile` | Get user profile |
| `GET` | `/api/auth/.well-known/openid-configuration` | OIDC discovery metadata |
| `GET` | `/api/auth/.well-known/oauth-authorization-server` | OAuth 2.0 authorization server metadata (RFC 8414) |
| `GET/POST` | `/api/auth/oauth2/*` | OAuth/OIDC provider endpoints (`authorize`, `token`, `userinfo`, `consent`, client management) |

---

## OAuth/OIDC Provider (Open WebUI and other downstream clients)

`eridu_auth` can act as the OIDC identity provider for other services in the same deployment (e.g. Open WebUI), instead of those services maintaining their own user/password system.

### Configuring a client (e.g. Open WebUI)

Open WebUI's generic OIDC integration takes a literal discovery document URL — it does not need the document hosted at the domain root — so no extra reverse-proxy routing is required:

```env
OAUTH_CLIENT_ID=<created-below>
OAUTH_CLIENT_SECRET=<created-below>
OPENID_PROVIDER_URL=https://auth.example.com/api/auth/.well-known/openid-configuration
OPENID_REDIRECT_URI=https://openwebui.example.com/oauth/oidc/callback
OAUTH_SCOPES=openid email profile
ENABLE_OAUTH_SIGNUP=true
```

Add the consumer's public origin (e.g. `https://openwebui.example.com`) to `ALLOWED_ORIGINS`, and keep `COOKIE_DOMAIN` set to the shared parent domain.

If the consumer already has local accounts (e.g. an existing Open WebUI admin created before SSO was set up) with the same email as their eridu_auth account, also set `OAUTH_MERGE_ACCOUNTS_BY_EMAIL=true` on the consumer so SSO login merges into the existing account instead of erroring or creating a duplicate. This is safe here because `emailAndPassword.requireEmailVerification: true` guarantees eridu_auth only issues sessions for verified emails — the exact condition Open WebUI's docs require before enabling merge-by-email.

Requested scopes must match the client's registered scope string exactly (`offline_access`, not `offline`) — a mismatch fails with `invalid_scope`, which some consumers (Open WebUI included) surface to end users as a generic "email or password incorrect" error. Check the consumer's own logs for the real `error`/`error_description` on its OAuth callback before assuming a credentials problem.

### Creating an OAuth client record

Sign in as an admin and use the "OAuth Clients" section on the portal dashboard (`/`) to create, list, edit, rotate the secret for, or delete clients. Store the returned `client_id`/`client_secret` in the consumer's environment (e.g. Railway variables), not in this repo.

Client management is intentionally internal-admin-only — there is no self-service/dynamic client registration (`allowDynamicClientRegistration` is left disabled). Revisit only if an external party actually needs to self-register a client.

Every client requires PKCE by default, and better-auth also forces PKCE whenever `offline_access` is requested, with no exceptions. If the consumer's OAuth library doesn't implement PKCE (Open WebUI's built-in OIDC client does not, as of the version tested), uncheck "Require PKCE" on the client via Edit, and don't request `offline_access` for that consumer. better-auth exposes no endpoint to change `require_pkce` after a client is created — the Edit form's toggle calls a custom admin route (`apps/eridu_auth/src/routes/oauth-clients.ts`) that updates it directly.

### Consent

Users approve or deny the requested scopes at the `/consent` page (`apps/eridu_auth/src/frontend/routes/consent.tsx`) before an authorization code is issued.

## Seeding Test Users

Run the seed command to create test users for development:

```bash
pnpm seed
```

### Seeded Users

| Email | Password | Role |
|-------|----------|------|
| `admin@eridu.com` | `password123` | System Admin |
| `manager@eridu.com` | `password123` | Studio Manager |
| `member@eridu.com` | `password123` | Studio Member |
| `creator@eridu.com` | `password123` | Creator |

### Using Seeded Users in Tests

**With `erify_api` integration tests:**

```typescript
// Get JWT token for a test user
const response = await fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@eridu.com',
    password: 'password123',
  }),
});
const { token } = await response.json();

// Use token in API requests
const shows = await fetch('http://localhost:3001/admin/shows', {
  headers: { Authorization: `Bearer ${token}` },
});
```

**With `@eridu/auth-sdk` in frontend:**

```typescript
import { createAuthClient } from '@eridu/auth-sdk/client/react';

const { client } = createAuthClient({
  baseURL: 'http://localhost:3000',
});

await client.signIn.email({
  email: 'admin@eridu.com',
  password: 'password123',
});
```

---

## Security Best Practices

1. **Secret management**: Use env-specific secrets, never reuse across environments
2. **CORS**: Restrict origins to known frontend apps
3. **HTTPS**: Always use HTTPS in production
4. **Token rotation**: JWKS key rotation is supported via `@eridu/auth-sdk`
5. **Rate limiting**: Consider rate limiting auth endpoints in production
