# Multi-Provider SSO Architecture Explained

## Better Auth as OIDC Client

Better Auth acts as an **OIDC Client** that can connect to multiple **OIDC Providers**:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Google OIDC   │    │   LINE OIDC     │    │   Auth0 OIDC    │
│    Provider     │    │    Provider     │    │    Provider     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ OIDC Flow             │ OIDC Flow             │ OIDC Flow
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Better Auth Service                          │
│                    (OIDC Client)                               │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Google      │  │ LINE        │  │ Auth0       │              │
│  │ Provider    │  │ Provider    │  │ Provider    │              │
│  │ Config      │  │ Config      │  │ Config      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Unified User Management
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Your Applications                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Frontend    │  │ API Service │  │ Admin Panel │              │
│  │ App         │  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Provider Selection Strategies

### 1. **Domain-Based Routing** (Most Common)

```typescript
// Users with @company.com emails → Google SSO
// Users with @personal.com emails → LINE SSO
// Users with @partner.com emails → Auth0 SSO

const providers = [
  {
    domain: 'company.com',
    providerId: 'google',
    oidcConfig: {
      /* Google config */
    },
  },
  {
    domain: 'personal.com',
    providerId: 'line',
    oidcConfig: {
      /* LINE config */
    },
  },
];
```

### 2. **User Choice** (Let users pick)

```typescript
// Show multiple login buttons:
// [Login with Google] [Login with LINE] [Login with Auth0]
```

### 3. **Organization-Based** (Enterprise)

```typescript
// Different organizations use different providers
// Org A → Google SSO
// Org B → Microsoft SSO
// Org C → Custom SAML
```

## Configuration Example

Here's how you'd configure multiple providers in your Better Auth service:

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  // ... other config
  plugins: [
    // ... other plugins
    sso({
      defaultSSO: [
        // Google Provider
        {
          domain: 'company.com',
          providerId: 'google',
          oidcConfig: {
            issuer: 'https://accounts.google.com',
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            discoveryEndpoint:
              'https://accounts.google.com/.well-known/openid_configuration',
            pkce: true,
            scopes: ['openid', 'profile', 'email'],
          },
        },
        // LINE Provider
        {
          domain: 'personal.com',
          providerId: 'line',
          oidcConfig: {
            issuer: 'https://access.line.me',
            clientId: process.env.LINE_CLIENT_ID!,
            clientSecret: process.env.LINE_CLIENT_SECRET!,
            discoveryEndpoint:
              'https://access.line.me/.well-known/openid_configuration',
            pkce: true,
            scopes: ['openid', 'profile'],
          },
        },
        // Auth0 Provider
        {
          domain: 'partner.com',
          providerId: 'auth0',
          oidcConfig: {
            issuer: 'https://your-domain.auth0.com',
            clientId: process.env.AUTH0_CLIENT_ID!,
            clientSecret: process.env.AUTH0_CLIENT_SECRET!,
            discoveryEndpoint:
              'https://your-domain.auth0.com/.well-known/openid_configuration',
            pkce: true,
            scopes: ['openid', 'profile', 'email'],
          },
        },
      ],
    }),
  ],
});
```

## Environment Variables for Multiple Providers

```env
# Google OIDC
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LINE OIDC
LINE_CLIENT_ID=your-line-client-id
LINE_CLIENT_SECRET=your-line-client-secret

# Auth0 OIDC
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_ISSUER=https://your-domain.auth0.com
```

## Best Practices

### 1. **Provider Selection Strategy**

- **Domain-based**: Most intuitive for users
- **User choice**: Good for consumer apps
- **Organization-based**: Best for enterprise

### 2. **User Account Linking**

```typescript
// Better Auth automatically handles account linking
// Same email from different providers → same user account
// Different emails → separate accounts (unless manually linked)
```

### 3. **Fallback Authentication**

```typescript
// Always provide email/password as fallback
emailAndPassword: {
  enabled: true,
  // ... config
}
```

### 4. **Provider Management**

- Use environment variables for each provider
- Implement provider-specific error handling
- Monitor authentication success rates per provider

## Common Use Cases

### **Consumer App (Google + LINE)**

- Google: For users in Western markets
- LINE: For users in Asian markets
- Domain-based routing or user choice

### **Enterprise App (Google + Microsoft + SAML)**

- Google: For Google Workspace organizations
- Microsoft: For Microsoft 365 organizations
- SAML: For custom enterprise identity providers

### **Developer Platform (GitHub + GitLab + Google)**

- GitHub: For open source developers
- GitLab: For enterprise developers
- Google: For general users

## Security Considerations

1. **Separate Client Secrets**: Each provider needs its own credentials
2. **Provider Validation**: Verify tokens from each provider independently
3. **Account Linking**: Secure linking of accounts from different providers
4. **Audit Logging**: Track which provider was used for each authentication

## Implementation Steps

1. **Register with each provider** (Google, LINE, etc.)
2. **Get client credentials** from each provider
3. **Configure Better Auth** with multiple provider configs
4. **Implement provider selection** logic (domain-based, user choice, etc.)
5. **Test authentication flows** for each provider
6. **Handle edge cases** (account linking, provider failures, etc.)

This architecture gives you maximum flexibility while maintaining security and user experience.
