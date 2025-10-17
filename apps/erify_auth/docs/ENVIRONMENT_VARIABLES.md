# Environment Variables Documentation

This document explains all environment variables used by the Better Auth service.

## Required Environment Variables

### Core Authentication
```env
BETTER_AUTH_URL=http://localhost:3000
```
- **Purpose**: Base URL where your auth service is accessible
- **Usage**: Used for generating callback URLs and redirects
- **Example**: `http://localhost:3000` (development) or `https://auth.yourdomain.com` (production)

```env
BETTER_AUTH_SECRET=your-super-secret-key-change-this-in-production
```
- **Purpose**: Secret key for signing and encrypting tokens
- **Security**: Critical for security - never commit to version control
- **Requirements**: Strong random string (32+ characters recommended)
- **Generation**: Use `openssl rand -base64 32` or similar

### Database Configuration
```env
DATABASE_URL=postgresql://admin:secret@localhost:5432/eridu_auth
```
- **Purpose**: PostgreSQL database connection URL
- **Format**: `postgresql://username:password@host:port/database`
- **Alternative**: Use individual `POSTGRES_*` variables instead

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=secret
POSTGRES_DB=eridu_auth
POSTGRES_PORT=5432
```
- **Purpose**: Individual PostgreSQL connection parameters
- **Usage**: Alternative to `DATABASE_URL` for more granular control
- **Note**: Only needed if not using `DATABASE_URL`

## Application Settings

### Environment & Port
```env
NODE_ENV=development
```
- **Purpose**: Node.js environment setting
- **Values**: `development`, `production`, `test`
- **Usage**: Affects logging, error handling, and feature flags

```env
PORT=3000
```
- **Purpose**: Port for the auth service to run on
- **Default**: `3000`
- **Usage**: Must match `BETTER_AUTH_URL` port in development

### Logging & Debugging
```env
LOG_LEVEL=debug
```
- **Purpose**: Logging verbosity level
- **Values**: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`
- **Development**: Use `debug` for detailed logs
- **Production**: Use `warn` or `error` for performance

### User Registration
```env
DISABLE_SIGNUP=false
```
- **Purpose**: Control user registration
- **Values**: `true` (disable), `false` (allow)
- **Use Cases**: 
  - `false`: Allow public registration (Phase 1)
  - `true`: Invite-only system (enterprise)

## Database Operations

### Migration Control
```env
DB_MIGRATING=false
```
- **Purpose**: Flag for database migration operations
- **Usage**: Set to `true` when running migrations
- **Note**: Prevents normal app startup during migrations

```env
DB_SEEDING=false
```
- **Purpose**: Flag for database seeding operations
- **Usage**: Set to `true` when seeding initial data
- **Note**: Prevents normal app startup during seeding

## API Documentation

```env
OPEN_API_DOC_TITLE=Eridu Auth Service
```
- **Purpose**: Title for OpenAPI documentation
- **Usage**: Displayed in the interactive API docs
- **Access**: Available at `/api/auth/openapi` when running

## Future SSO Configuration (Optional)

### SAML Configuration (Enterprise Ready)
```env
SAML_ENTRY_POINT=https://your-saml-provider.com/sso
```
- **Purpose**: SAML Identity Provider SSO URL
- **Usage**: Where users are redirected for SAML authentication
- **Providers**: Azure AD, Okta, ADFS, etc.

```env
SAML_ISSUER=your-saml-issuer-id
```
- **Purpose**: Unique identifier for your SAML provider
- **Usage**: Identifies which provider is sending SAML assertions
- **Format**: Usually a URL or URN format

```env
SAML_CERT="-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END CERTIFICATE-----"
```
- **Purpose**: X.509 certificate for verifying SAML assertions
- **Security**: Critical for preventing SAML response tampering
- **Format**: PEM format certificate from your SAML provider

### OIDC Configuration (Social Login Ready)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```
- **Purpose**: Google OAuth 2.0 credentials
- **Source**: Google Cloud Console > APIs & Services > Credentials
- **Security**: Client secret must be kept confidential

```env
LINE_CLIENT_ID=your-line-channel-id
LINE_CLIENT_SECRET=your-line-channel-secret
```
- **Purpose**: LINE Login credentials
- **Source**: LINE Developers Console
- **Usage**: For Asian market authentication

```env
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_ISSUER=https://your-domain.auth0.com
```
- **Purpose**: Auth0 OIDC provider credentials
- **Source**: Auth0 Dashboard > Applications
- **Usage**: Alternative OIDC provider

## Environment-Specific Examples

### Development Environment
```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=dev-secret-key-not-for-production
DATABASE_URL=postgresql://admin:secret@localhost:5432/eridu_auth_dev
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DISABLE_SIGNUP=false
```

### Production Environment
```env
BETTER_AUTH_URL=https://auth.yourdomain.com
BETTER_AUTH_SECRET=super-secure-production-secret-key
DATABASE_URL=postgresql://prod_user:secure_password@prod_host:5432/eridu_auth_prod
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
DISABLE_SIGNUP=false
```

### Testing Environment
```env
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=test-secret-key
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/eridu_auth_test
NODE_ENV=test
PORT=3001
LOG_LEVEL=silent
DISABLE_SIGNUP=false
```

## Security Best Practices

### Secret Management
- 🔒 **Never commit secrets** to version control
- 🔒 **Use different secrets** for each environment
- 🔒 **Rotate secrets regularly** in production
- 🔒 **Use environment-specific** configuration management
- 🔒 **Validate secrets** are set before startup

### Production Considerations
- 🔒 **Use HTTPS** for all production URLs
- 🔒 **Use strong passwords** for database connections
- 🔒 **Limit database access** to necessary IPs
- 🔒 **Monitor authentication** attempts and failures
- 🔒 **Set up alerting** for security events

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid redirect URI" | URL mismatch | Check `BETTER_AUTH_URL` matches actual URL |
| "Client ID not found" | Missing env var | Verify OIDC credentials are set |
| "Database connection failed" | Wrong credentials | Check `DATABASE_URL` or `POSTGRES_*` vars |
| "Secret too short" | Weak secret | Use 32+ character random string |
| "Port already in use" | Port conflict | Change `PORT` or stop conflicting service |

### Validation
The application validates all environment variables on startup. Check the console output for any validation errors.

### Debug Mode
Set `LOG_LEVEL=debug` to see detailed information about environment variable loading and validation.

## Quick Setup Commands

### Generate Secure Secret
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Copy Environment Template
```bash
# Copy template to actual environment file
cp .env.example .env

# Edit with your values
nano .env  # or your preferred editor
```

### Validate Environment
```bash
# Check if all required variables are set
pnpm type-check

# Start with environment validation
pnpm dev
```
