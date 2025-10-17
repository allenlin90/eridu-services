# Eridu Auth Service

Better Auth service for SSO across all services in the monorepo.

## Quick Start

```bash
npm install
npm run dev
```

```bash
open http://localhost:3000
```

## Local Development Setup

1. Install `nodejs>20`
2. Install `pnpm` for global use `npm install pnpm -g`
3. Create new local database for developing `docker compose up`
4. Copy environment configuration: `cp .env.example .env`
5. Update `.env` with your database and SSO provider credentials
6. Generate auth db schema for drizzle `pnpm auth:schema`
7. Generate sql migration for database `pnpm db:generate`
8. Migrate auth schema to db `pnpm db:migrate`

## Documentation

📚 **Complete documentation is available in the [`docs/`](./docs/) directory:**

- **[Phase 1 Setup Guide](./docs/PHASE_1_SETUP.md)** - Email/password authentication (current phase)
- **[Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md)** - Complete environment configuration reference
- **[Quick Reference Guide](./docs/QUICK_REFERENCE.md)** - Common tasks, API endpoints, and troubleshooting
- **[Google & LINE SSO Setup Guide](./docs/GOOGLE_LINE_SETUP.md)** - Step-by-step setup for Google and LINE authentication
- **[Multi-Provider SSO Guide](./docs/MULTI_PROVIDER_SSO_GUIDE.md)** - Understanding multiple SSO providers
- **[Upgrade Summary](./docs/UPGRADE_SUMMARY.md)** - Better Auth upgrade details
- **[Documentation Index](./docs/README.md)** - Complete documentation overview

## Phase 1 Features (Current)

- **Email/Password Authentication**: Traditional user registration and login
- **Email Verification**: Required for new user accounts
- **JWT Tokens**: 15-minute expiration for API authentication across monorepo
- **Password Reset**: Email-based password recovery
- **Multi-Session Support**: Users can be logged in on multiple devices
- **Organization Management**: Team and organization support
- **API Key Management**: Service-to-service authentication

## Future SSO Features

- **Google OAuth 2.0**: Full Google authentication with profile and email access
- **LINE Login**: LINE authentication for Asian markets
- **SAML 2.0**: Enterprise SSO (ready for enterprise clients)
- **Multi-provider**: Support for multiple SSO providers per organization
- **Domain-based routing**: Automatic provider selection based on email domain
- **Account linking**: Same email from different providers links to same user

## API Documentation

When running in development, visit `http://localhost:3000/api/auth/openapi` for interactive API documentation.

## Environment Configuration

See `.env.example` for all required environment variables and detailed explanations of SSO configuration.
