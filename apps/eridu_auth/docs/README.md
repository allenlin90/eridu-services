# Better Auth Service Documentation

This directory contains comprehensive documentation for the Better Auth service, which serves as the Single Sign-On (SSO) solution for all services in the Eridu monorepo.

## 📚 Documentation Index

### **Setup & Configuration**

- **[Phase 1 Setup Guide](./PHASE_1_SETUP.md)** - Email/password authentication for Phase 1
- **[Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)** - Complete environment configuration reference
- **[Google & LINE SSO Setup Guide](./GOOGLE_LINE_SETUP.md)** - Complete guide for setting up Google and LINE authentication
- **[Multi-Provider SSO Guide](./MULTI_PROVIDER_SSO_GUIDE.md)** - Understanding and configuring multiple SSO providers
- **[Seeding Guide](./SEEDING.md)** - Database seeding for test users

### **Quick Start**

1. **Environment Setup**: Copy `.env.example` to `.env` and configure your credentials
2. **Google Setup**: Follow the [Google & LINE Setup Guide](./GOOGLE_LINE_SETUP.md) to get Google OAuth credentials
3. **LINE Setup**: Follow the [Google & LINE Setup Guide](./GOOGLE_LINE_SETUP.md) to get LINE Login credentials
4. **Database Setup**: Run migrations and start the service
5. **Testing**: Test authentication flows with the provided examples

### **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐
│   Google OIDC   │    │   LINE OIDC     │
│    Provider     │    │    Provider     │
└─────────────────┘    └─────────────────┘
         │                       │
         │ OIDC Flow             │ OIDC Flow
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│            Better Auth Service           │
│            (OIDC Client)                 │
│                                         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Google      │  │ LINE        │      │
│  │ Provider    │  │ Provider    │      │
│  │ Config      │  │ Config      │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
         │
         │ Unified Authentication
         ▼
┌─────────────────────────────────────────┐
│         Eridu Monorepo Services         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Frontend    │  │ API Service │      │
│  │ Apps        │  │             │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
```

### **Key Features**

- ✅ **Email/Password Authentication** - Traditional user registration and login (Phase 1)
- ✅ **Email Verification** - Required for new user accounts (Phase 1)
- ✅ **User Portal** - Central hub displaying session information and logout functionality (Phase 1)
- ✅ **JWT Token Generation** - Secure tokens for API authentication with 15-minute expiration
- ✅ **Multi-Session Support** - Support for multiple devices per user
- ✅ **Organization Management** - Team and organization support
- ✅ **API Key Management** - Service-to-service authentication
- ✅ **Google OAuth 2.0** - Full Google authentication with profile and email access (Future)
- ✅ **LINE Login** - LINE authentication for Asian markets (Future)
- ✅ **Account Linking** - Same email from different providers links to same user (Future)

### **Environment Configuration**

The service uses the following key environment variables:

```env
# Core Authentication
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key

# Database
DATABASE_URL=postgresql://admin:secret@localhost:5432/eridu_auth

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LINE Login
LINE_CLIENT_ID=your-line-channel-id
LINE_CLIENT_SECRET=your-line-channel-secret
```

### **API Endpoints**

**Phase 1 (Current):**
- `GET /` - User portal (authenticated users)
- `POST /api/auth/sign-up` - Register new user with email/password
- `POST /api/auth/sign-in` - Login with email/password
- `POST /api/auth/sign-out` - Sign out user
- `GET /api/auth/session` - Get current user session
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/send-verification` - Resend verification email
- `POST /api/auth/verify-email` - Verify email with token
- `GET /api/auth/reference` - Interactive API documentation

**Future (SSO):**
- `POST /api/auth/sign-in/sso` - Initiate SSO authentication
- `GET /api/auth/sso/callback/:providerId` - OIDC callback handler

### **Integration Examples**

#### Frontend Integration

```javascript
// Login with Google
const response = await fetch('/api/auth/sign-in/sso', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callbackURL: window.location.origin + '/dashboard',
    providerId: 'google',
    domain: '*',
  }),
});
const data = await response.json();
if (data.redirect) {
  window.location.href = data.url;
}
```

#### API Service Integration

```javascript
// Verify authentication in API services
const session = await fetch('http://localhost:3000/api/auth/session', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

if (session.user) {
  // User is authenticated
  console.log('User:', session.user);
}
```

### **Development Commands**

```bash
# Start development server
pnpm dev

# Generate auth schema
pnpm auth:schema

# Generate database migrations
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Type checking
pnpm type-check

# Build for production
pnpm build
```

### **Security Considerations**

- 🔒 **Keep secrets secure** - Never commit client secrets to version control
- 🔒 **Use HTTPS in production** - Always use HTTPS for production callbacks
- 🔒 **Validate tokens** - Always validate tokens on your API services
- 🔒 **Monitor usage** - Set up monitoring for authentication attempts
- 🔒 **Regular rotation** - Rotate client secrets regularly

### **Troubleshooting**

Common issues and solutions are documented in the individual guide files. For quick reference:

1. **"Invalid redirect URI"** - Check callback URLs match exactly in provider settings
2. **"Client ID not found"** - Verify environment variables are set correctly
3. **"Scope not authorized"** - Ensure required scopes are enabled in provider settings
4. **"User not found"** - Check that user has granted required permissions

### **Support**

- Better Auth Documentation: https://www.better-auth.com
- SSO Plugin Docs: https://www.better-auth.com/plugins/sso
- GitHub Issues: https://github.com/better-auth/better-auth/issues

---

For detailed setup instructions, see the individual documentation files in this directory.
