# Setup Guide

> **TLDR**: Email/password auth is live (Phase 1). Set the required env vars, run `pnpm db:migrate`, seed test users with `pnpm seed`, and use the API endpoints below. SSO providers (Google, LINE) are configured but not yet enabled.

Migration governance: follow framework/tool-first flow (`better-auth` -> Drizzle tooling), then manual SQL only as documented exception. Canonical policy: `docs/product/DB_MIGRATION_POLICY.md`.

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
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173,http://localhost:5174` |

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
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

**Production:**
```env
DATABASE_URL=postgresql://user:password@prod-host:5432/eridu_auth
BETTER_AUTH_SECRET=<generated-secret-64-chars>
BETTER_AUTH_URL=https://auth.example.com
CORS_ORIGINS=https://creators.example.com,https://studios.example.com
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

---

## Seeding Test Users

Run the seed command to create test users for development:

```bash
pnpm seed
```

### Seeded Users

Cross-app role-testing users:

| Email | Password | Role |
|-------|----------|------|
| `test-user@example.com` | `testpassword123` | `user` |
| `test-admin@example.com` | `testpassword123` | `admin` |
| `test-user-2@example.com` | `testpassword123` | `user` |
| `test-user-3@example.com` | `testpassword123` | `user` |

### Using Seeded Users in Tests

**With `erify_api` integration tests:**

```typescript
// Get JWT token for a test user
const response = await fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test-admin@example.com',
    password: 'testpassword123',
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
