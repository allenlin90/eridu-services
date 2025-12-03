# Phase 1 Authentication Setup

## Overview

Phase 1 focuses on traditional email/password authentication with JWT tokens for service-to-service communication across the monorepo.

## Phase 1 Features

- ✅ **Email/Password Authentication** - Traditional user registration and login
- ✅ **Email Verification** - Required for new user accounts
- ✅ **User Portal** - Central hub at `/` displaying session information and logout functionality
- ✅ **JWT Tokens** - 15-minute expiration for API authentication
- ✅ **Password Reset** - Email-based password recovery
- ✅ **Multi-Session Support** - Users can be logged in on multiple devices
- ✅ **Organization Management** - Team and organization support
- ✅ **API Key Management** - Service-to-service authentication
- ✅ **Admin Panel** - Administrative user management

## Disabled for Phase 1

- ❌ **OIDC Providers** (Google, LINE) - Disabled to reduce complexity
- ❌ **SAML Providers** - Disabled but ready for enterprise clients
- ❌ **Social Login** - Focus on email/password only

## Authentication Flow

### User Registration

1. User provides email and password
2. System sends verification email
3. User clicks verification link
4. Account is activated and user is signed in
5. JWT token is generated for API access

### User Login

1. User provides email and password
2. Credentials are validated
3. JWT token is generated
4. User session is created
5. User is redirected to portal at `/`
6. Token can be used across all monorepo services

### User Portal

After successful authentication, users are redirected to the portal at `/` which displays:
- User name and email
- Email verification status
- Session information (user ID, session start time)
- Logout functionality
- Placeholder for integrated applications (future feature)

The portal serves as a central hub and will be expanded to include:
- Admin dashboard access
- Personal account settings
- Navigation to integrated applications

### Service Authentication

```javascript
// Other services verify tokens
const response = await fetch('http://localhost:3000/api/auth/session', {
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
});
const session = await response.json();
```

## API Endpoints

### Portal

- `GET /` - User portal (authenticated users only, redirects to `/sign-in` if not authenticated)

### Authentication

- `POST /api/auth/sign-up` - Register new user
- `POST /api/auth/sign-in` - Login with email/password
- `POST /api/auth/sign-out` - Sign out user
- `GET /api/auth/session` - Get current user session

### Password Management

- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Email Verification

- `POST /api/auth/send-verification` - Resend verification email
- `POST /api/auth/verify-email` - Verify email with token

### User Management

- `GET /api/auth/user` - Get user profile
- `PUT /api/auth/user` - Update user profile
- `POST /api/auth/change-password` - Change password

## Environment Configuration

### Required Variables

```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://admin:secret@localhost:5432/eridu_auth
```

### Optional Variables (Future Use)

```env
# SAML (for enterprise clients)
SAML_ENTRY_POINT=https://your-saml-provider.com/sso
SAML_ISSUER=your-saml-issuer-id
SAML_CERT=your-saml-certificate

# OIDC (for social login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINE_CLIENT_ID=your-line-channel-id
LINE_CLIENT_SECRET=your-line-channel-secret
```

## JWT Token Structure

```json
{
  "id": "user-id",
  "name": "User Name",
  "email": "user@example.com",
  "image": "profile-image-url",
  "activeOrganizationId": "org-id",
  "activeTeamId": "team-id",
  "impersonatedBy": null,
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Testing Authentication

### Register New User

```bash
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login User

```bash
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Verify Session

```bash
curl -X GET http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Integration

### Login Form

```javascript
async function login(email, password) {
  const response = await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (data.session) {
    // Store JWT token
    localStorage.setItem('authToken', data.session.token);
    // Redirect to portal
    window.location.href = '/';
  }
}
```

### API Service Integration

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('authToken');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}
```

## Security Considerations

### Phase 1 Security

- 🔒 **Email Verification Required** - All new accounts must verify email
- 🔒 **Strong Password Requirements** - Enforce password complexity
- 🔒 **JWT Token Expiration** - 15-minute token lifetime
- 🔒 **Secure Session Management** - Multi-session support with proper cleanup
- 🔒 **Password Reset Security** - Secure token-based password reset

### Future Security (When Adding SSO)

- 🔒 **SAML Certificate Validation** - Verify SAML assertions
- 🔒 **OIDC Token Validation** - Validate OIDC tokens
- 🔒 **Provider Trust** - Only trust verified identity providers

## Migration Path

### Phase 1 → Phase 2 (Adding OIDC)

1. Uncomment OIDC configuration in `auth.ts`
2. Add OIDC environment variables
3. Configure Google/LINE providers
4. Test OIDC authentication flows
5. Update frontend to show social login buttons

### Phase 1 → Enterprise (Adding SAML)

1. Uncomment SAML configuration in `auth.ts`
2. Add SAML environment variables
3. Configure enterprise SAML provider
4. Test SAML authentication flows
5. Update frontend for SAML login

## Maintenance Workload

### Current (Phase 1)

- **Low Maintenance**: Email/password only
- **Simple Testing**: Single authentication path
- **Easy Debugging**: Clear error messages
- **Minimal Dependencies**: No external OAuth providers

### Future (With SAML)

- **Zero Additional Maintenance**: SAML is just configuration
- **No Performance Impact**: Unused SAML doesn't affect runtime
- **Easy to Enable**: Just add environment variables
- **Enterprise Ready**: When clients require SAML

## Next Steps

1. **Implement Email Service**: Set up email sending for verification and password reset
2. **Add Password Complexity**: Enforce strong password requirements
3. **Implement Rate Limiting**: Prevent brute force attacks
4. **Add Audit Logging**: Track authentication events
5. **Test JWT Integration**: Verify tokens work across all monorepo services

Phase 1 provides a solid foundation for authentication while keeping complexity low and maintenance minimal.
