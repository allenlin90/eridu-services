# Quick Reference Guide

## 🚀 Common Tasks

### **Start Development**
```bash
pnpm dev
```

### **Environment Setup**
```bash
# Copy template to actual environment file
cp .env.example .env

# Edit with your values (see Environment Variables Guide for details)
nano .env  # or your preferred editor
```

### **Database Operations**
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

### **Testing Authentication (Phase 1)**
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

## 🔧 Environment Variables

### **Required (Phase 1)**
```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://admin:secret@localhost:5432/eridu_auth
```

### **Optional (Future SSO)**
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

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-up` | POST | Register new user (Phase 1) |
| `/api/auth/sign-in` | POST | Login with email/password (Phase 1) |
| `/api/auth/sign-out` | POST | Sign out user |
| `/api/auth/session` | GET | Get current user session |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/send-verification` | POST | Resend verification email |
| `/api/auth/verify-email` | POST | Verify email with token |
| `/api/auth/openapi` | GET | Interactive API docs |

## 🔍 Troubleshooting

### **Common Issues**

| Issue | Solution |
|-------|----------|
| "Invalid redirect URI" | Check callback URLs in provider settings |
| "Client ID not found" | Verify environment variables |
| "Email verification required" | Check email verification settings |
| "Database connection failed" | Check DATABASE_URL or POSTGRES_* vars |
| "Secret too short" | Use 32+ character random string |

### **Debug Mode**
```env
LOG_LEVEL=debug
```

## 📚 Documentation Links

- [Phase 1 Setup Guide](./PHASE_1_SETUP.md)
- [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
- [Google & LINE Setup Guide](./GOOGLE_LINE_SETUP.md)
- [Multi-Provider SSO Guide](./MULTI_PROVIDER_SSO_GUIDE.md)
- [Upgrade Summary](./UPGRADE_SUMMARY.md)
- [Complete Documentation Index](./README.md)
