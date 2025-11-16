# Backdoor API E2E Testing Flow

This directory contains all test payloads, scripts, and documentation for testing service-to-service backdoor operations (user and membership management).

## Directory Structure

```
backdoor/
├── README.md                          # This file
├── BACKDOOR_WORKFLOW.md               # Complete workflow documentation
├── payloads/                          # Test payload JSON files
│   ├── 01-create-user.json            # Create user payload
│   ├── 02-update-user.json            # Update user payload
│   └── 03-create-membership.json      # Create membership payload
└── scripts/                           # Test scripts
    ├── 1.create-users.ts              # Create user
    ├── 2.update-users.ts              # Update user
    ├── 3.create-memberships.ts        # Create membership
    └── workflows/
        └── run-all.ts                 # Run all steps sequentially
```

## Quick Start

### Option 1: Run Complete Workflow (Recommended)

Run all steps sequentially in a single command:

```bash
# Run complete workflow with default API URL
pnpm run manual:backdoor:all

# Custom API URL
pnpm run manual:backdoor:all -- --api-url=http://localhost:3000

# Custom studio ID (optional, defaults to studio_123 from payload)
pnpm run manual:backdoor:all -- --studio-id=studio_456
```

This will:
1. Create a user
2. Update the created user
3. Create a studio membership for the user

### Option 2: Run Steps Individually

#### 1. Create a User

```bash
pnpm run manual:backdoor:create-users
```

This creates a user using the payload in `payloads/01-create-user.json`.

#### 2. Update the User

```bash
# Replace user_123 with the actual user ID from step 1
pnpm run manual:backdoor:update-users -- --user-id=user_123
```

#### 3. Create a Membership

First, update `payloads/03-create-membership.json` with the actual `user_id` and `studio_id`, then:

```bash
pnpm run manual:backdoor:create-memberships
```

## Workflow Steps

1. **Create User** - Create a new user account via backdoor endpoint
2. **Update User** - Update user profile information
3. **Create Membership** - Grant user access to a studio with admin role

## Documentation

- **[Backdoor Workflow](./BACKDOOR_WORKFLOW.md)** - Complete API workflow documentation
- **[Main Test Payloads README](../README.md)** - Overview of all testing flows

## Authentication

Scripts automatically read `BACKDOOR_API_KEY` from `.env` file:
- **Without key**: Scripts don't send header (dev mode behavior)
- **With key**: Scripts include `X-API-Key` header (production behavior)

See [Server-to-Server Authentication Guide](../../docs/SERVER_TO_SERVER_AUTH.md) for details.

## Endpoints

- `POST /backdoor/users` - Create user (API key required)
- `PATCH /backdoor/users/:id` - Update user (API key required)
- `POST /backdoor/studio-memberships` - Create membership (API key required)

