# Eridu Auth Service

Better Auth service for SSO across all services in the monorepo.

## Quick Start

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to access the application.

## Local Development Setup

1. Install `nodejs>=22`
2. Install `pnpm` for global use `npm install pnpm -g`
3. Create new local database for developing `docker compose up`
4. Copy environment configuration: `cp .env.example .env`
5. Update `.env` with your database and SSO provider credentials
6. Generate auth db schema for drizzle `pnpm auth:schema`
7. Generate sql migration for database `pnpm db:generate`
8. Migrate auth schema to db `pnpm db:migrate`

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

## Phase 1 Features (Current)

- **Email/Password Authentication**: Traditional user registration and login
- **Email Verification**: Required for new user accounts
- **JWT Tokens**: 15-minute expiration for API authentication across monorepo
- **Password Reset**: Email-based password recovery
- **Multi-Session Support**: Users can be logged in on multiple devices
- **Organization Management**: Team and organization support
- **API Key Management**: Service-to-service authentication
- **User Portal**: Central hub displaying session information and logout functionality

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

- **Google OAuth 2.0**: Full Google authentication with profile and email access
- **LINE Login**: LINE authentication for Asian markets
- **SAML 2.0**: Enterprise SSO (ready for enterprise clients)
- **Multi-provider**: Support for multiple SSO providers per organization
- **Domain-based routing**: Automatic provider selection based on email domain
- **Account linking**: Same email from different providers links to same user

## Documentation

📚 **Complete documentation is available in the [`docs/`](./docs/) directory:**

- **[Phase 1 Setup Guide](./docs/PHASE_1_SETUP.md)** - Email/password authentication (current phase)
- **[Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md)** - Complete environment configuration reference
- **[Google & LINE SSO Setup Guide](./docs/GOOGLE_LINE_SETUP.md)** - Step-by-step setup for Google and LINE authentication
- **[Multi-Provider SSO Guide](./docs/MULTI_PROVIDER_SSO_GUIDE.md)** - Understanding multiple SSO providers
- **[Upgrade Summary](./docs/UPGRADE_SUMMARY.md)** - Better Auth upgrade details
- **[Documentation Index](./docs/README.md)** - Complete documentation overview
