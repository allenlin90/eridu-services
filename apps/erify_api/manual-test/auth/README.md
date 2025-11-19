# JWT Authentication E2E Testing Flow

This directory contains test scripts and documentation for testing JWT authentication flow with `erify_auth` service and `@eridu/auth-sdk` SDK.

## Overview

This flow tests the complete authentication workflow:
1. **Login** - Authenticate with `erify_auth` service using seeded test user credentials
2. **Get JWT Token** - Extract JWT token from login response
3. **Test /me Endpoint** - Use JWT token to access authenticated endpoint in `erify_api`

## Prerequisites

1. **erify_auth Service Running**: The auth service must be running and accessible
   ```bash
   # In apps/erify_auth
   pnpm run dev
   ```

2. **erify_api Service Running**: The API service must be running
   ```bash
   # In apps/erify_api
   pnpm run dev
   ```

3. **Database Seeded**: Ensure `erify_auth` database is seeded with test users
   ```bash
   # In apps/erify_auth
   pnpm db:seed
   ```

4. **Environment Variables**: Configure `ERIFY_AUTH_URL` in `erify_api/.env`
   ```env
   ERIFY_AUTH_URL=http://localhost:3000
   ```

## Test Users

The seed creates the following test users (from `erify_auth`):

| Email                     | Password          | Role    | Email Verified |
| ------------------------- | ----------------- | ------- | -------------- |
| `test-user@example.com`   | `testpassword123` | `user`  | ✅ Yes         |
| `test-admin@example.com`  | `testpassword123` | `admin` | ✅ Yes         |
| `test-user-2@example.com` | `testpassword123` | `user`  | ✅ Yes         |

## Quick Start

### Option 1: Run Complete Workflow (Recommended)

Run all steps sequentially in a single command:

```bash
# Run complete workflow with default URLs
pnpm run manual:auth:all

# Custom auth service URL
pnpm run manual:auth:all -- --auth-url=http://localhost:3000

# Custom API URL
pnpm run manual:auth:all -- --api-url=http://localhost:3001

# Custom test user
pnpm run manual:auth:all -- --email=test-user@example.com --password=testpassword123
```

This will:
1. Login to `erify_auth` and get JWT token
2. Test `GET /me` endpoint with the JWT token

### Option 2: Run Steps Individually

#### 1. Login and Get JWT Token

```bash
pnpm run manual:auth:login
```

This logs in using credentials from `payloads/01-login.json` and displays the JWT token.

#### 2. Test /me Endpoint

```bash
# Provide token from step 1
pnpm run manual:auth:test-me -- --token=<JWT_TOKEN>
```

**Note**: The token from step 1 must be passed to step 2. For convenience, use `pnpm run manual:auth:all` to run both steps together.

## Directory Structure

```
auth/
├── README.md                          # This file
├── payloads/                          # Test payload JSON files
│   └── 01-login.json                 # Login credentials
└── scripts/                           # Test scripts
    ├── 1.login.ts                     # Login and get JWT token (exports performLogin)
    ├── 2.test-me.ts                   # Test /me endpoint (exports performTestMe)
    └── workflows/
        └── run-all.ts                 # Run all steps sequentially (uses exported functions)
```

## Workflow Steps

1. **Login** - Authenticate with `erify_auth` service using test user credentials
   - Calls `POST /api/auth/sign-in/email` to establish session
   - Calls `GET /api/auth/token` to get JWT token
   - Returns JWT token string
2. **Test /me** - Use JWT token in Authorization header to access `/me` endpoint
   - Receives JWT token as parameter
   - Calls `GET /me` with `Authorization: Bearer <token>` header
   - Validates response contains user profile data

**Note**: The functions are pure - step 1 returns a token that is passed directly to step 2. No file I/O is used.

## Documentation

- **[Auth Workflow](./AUTH_WORKFLOW.md)** - Complete API workflow documentation
- **[Main Test Payloads README](../README.md)** - Overview of all testing flows
- **[Authentication Guide](../../docs/AUTHENTICATION_GUIDE.md)** - JWT validation and authorization patterns

## Endpoints

### erify_auth Service
- `POST /api/auth/sign-in/email` - Login with email/password

### erify_api Service
- `GET /me` - Get authenticated user profile (requires JWT token)

## How It Works

1. **Login Request**: Script sends POST request to `erify_auth` with email/password
2. **Token Extraction**: Better Auth returns JWT token in response (cookie or body)
3. **Token Validation**: `erify_api` uses `@eridu/auth-sdk` to validate token via JWKS
4. **Profile Access**: Validated token allows access to `/me` endpoint

The `@eridu/auth-sdk` SDK automatically:
- Fetches JWKS from `{ERIFY_AUTH_URL}/api/auth/jwks` on startup
- Validates JWT tokens locally using cached public keys
- Extracts user information from token payload

