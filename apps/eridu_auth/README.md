# Eridu Auth Service

Better Auth service for SSO across all services in the monorepo.

**Current Status**: Phase 1 ✅ - Email/password authentication with JWT tokens (15-minute expiration)

## Quick Start

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to access the user portal.

## Local Development Setup

1. Install `nodejs>=22`
2. Install `pnpm` for global use: `npm install pnpm -g`
3. Create local database: `docker compose up`
4. Copy environment: `cp .env.example .env`
5. Update `.env` with database and SSO provider credentials
6. Generate auth db schema: `pnpm auth:schema`
7. Generate migrations: `pnpm db:generate`
8. Run migrations: `pnpm db:migrate`

## Common Tasks

### Database Operations

```bash
# Generate schema
pnpm auth:schema

# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open database studio
pnpm studio
```

### Testing Authentication

```bash
# Test email/password registration
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test email/password login
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test session verification
curl -X GET http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Phase 1 Features (Current) ✅

**Implemented**:
- ✅ **Email/Password Authentication**: Traditional user registration and login
- ✅ **Email Verification**: Required for new user accounts
- ✅ **JWT Tokens**: 15-minute expiration for API authentication across monorepo
- ✅ **Password Reset**: Email-based password recovery
- ✅ **Multi-Session Support**: Users can be logged in on multiple devices
- ✅ **Organization Management**: Team and organization support
- ✅ **API Key Management**: Service-to-service authentication
- ✅ **User Portal**: Central hub for session management and logout

**Planned**:
- ⏳ **Google OAuth 2.0**: (Phase 2) Google authentication with profile and email access
- ⏳ **LINE Login**: (Phase 2) LINE authentication for Asian markets
- ⏳ **SAML 2.0**: (Phase 3) Enterprise SSO
- ⏳ **Multi-provider Support**: (Phase 2) Multiple SSO providers per organization

### User Portal

After signing in, users are redirected to the portal at `/` which displays:
- User name and email
- Email verification status
- Session information
- Logout functionality
- Placeholder for integrated applications (future feature)

The portal serves as a central hub for authenticated users and will be expanded to include:
- Admin dashboard access
- Personal account settings
- Navigation to integrated applications

## API Endpoints

| Endpoint                      | Method | Description                         |
| ----------------------------- | ------ | ----------------------------------- |
| `/`                           | GET    | User portal (authenticated users)   |
| `/api/auth/sign-up`           | POST   | Register new user (Phase 1)         |
| `/api/auth/sign-in`           | POST   | Login with email/password (Phase 1) |
| `/api/auth/sign-out`          | POST   | Sign out user                       |
| `/api/auth/session`           | GET    | Get current user session            |
| `/api/auth/forgot-password`   | POST   | Request password reset              |
| `/api/auth/reset-password`    | POST   | Reset password with token           |
| `/api/auth/send-verification` | POST   | Resend verification email           |
| `/api/auth/verify-email`      | POST   | Verify email with token             |
| `/api/auth/reference`         | GET    | Interactive API docs                |

## Environment Variables

### Required (Phase 1)

```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://admin:secret@localhost:5432/eridu_auth
```

### Optional (Future SSO)

```env
# Google OAuth (disabled for Phase 1)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LINE Login (disabled for Phase 1)
LINE_CLIENT_ID=your-line-channel-id
LINE_CLIENT_SECRET=your-line-channel-secret

# SAML (ready for enterprise clients)
SAML_ENTRY_POINT=https://your-saml-provider.com/sso
SAML_ISSUER=your-saml-issuer-id
SAML_CERT=your-saml-certificate
```

See `.env.example` for all required environment variables and detailed explanations.

## Troubleshooting

### Common Issues

| Issue                         | Solution                                 |
| ----------------------------- | ---------------------------------------- |
| "Invalid redirect URI"        | Check callback URLs in provider settings |
| "Client ID not found"         | Verify environment variables             |
| "Email verification required" | Check email verification settings        |
| "Database connection failed"  | Check DATABASE_URL or POSTGRES_* vars    |
| "Secret too short"            | Use 32+ character random string          |

### Debug Mode

```env
LOG_LEVEL=debug
```

## Future SSO Features

Planned for Phase 2 and beyond:

- **Google OAuth 2.0**: Full Google authentication with profile and email access (Phase 2)
- **LINE Login**: LINE authentication for Asian markets (Phase 2)
- **SAML 2.0**: Enterprise SSO - ready for enterprise clients (Phase 3)
- **Multi-provider**: Support for multiple SSO providers per organization (Phase 2)
- **Domain-based routing**: Automatic provider selection based on email domain (Phase 2)
- **Account linking**: Same email from different providers links to same user (Phase 2)

## Documentation

Reference documentation based on your task:

| Document                                                       | Use When                                  |
| -------------------------------------------------------------- | ----------------------------------------- |
| [Documentation Index](./docs/README.md)                        | Need overview of all documentation        |
| [Phase 1 Setup Guide](./docs/PHASE_1_SETUP.md)                 | Setting up email/password auth ✅          |
| [Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md) | Configuring environment settings          |
| [Google & LINE SSO Setup Guide](./docs/GOOGLE_LINE_SETUP.md)   | Planning SSO provider setup (future)      |
| [Multi-Provider SSO Guide](./docs/MULTI_PROVIDER_SSO_GUIDE.md) | Understanding multi-provider architecture |
| [Upgrade Summary](./docs/UPGRADE_SUMMARY.md)                   | Understanding Better Auth migration       |

**Key Reference**: See [Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md) for complete configuration reference.
