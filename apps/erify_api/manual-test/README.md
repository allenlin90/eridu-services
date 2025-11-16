# Manual Testing Guide

This directory contains test payloads and scripts for manual end-to-end testing of different API workflows.

**Note**: These are manual testing tools, not part of the automated test suite (`pnpm test`).

## Directory Structure

```
manual-test/
├── README.md                          # This file (overview)
├── schedule-planning/                 # Schedule planning workflow
│   ├── README.md                      # Schedule planning guide
│   ├── GOOGLE_SHEETS_WORKFLOW.md      # Complete workflow docs
│   ├── payloads/                      # Schedule payloads
│   └── scripts/                       # Schedule scripts
├── backdoor/                          # Backdoor API workflow
│   ├── README.md                      # Backdoor guide
│   ├── BACKDOOR_WORKFLOW.md           # Complete workflow docs
│   ├── payloads/                      # Backdoor payloads
│   └── scripts/                       # Backdoor scripts
└── scripts/
    └── utils/                         # Shared utilities
        ├── http-request.ts            # Google Sheets HTTP utility
        └── backdoor-http-request.ts   # Backdoor HTTP utility
```

## Available Testing Flows

### 1. Schedule Planning Flow

**Purpose**: Test the complete schedule planning workflow from Google Sheets integration.

**Location**: `schedule-planning/`

**Quick Start**:
```bash
# Generate payloads (default: 50 shows per client for all 50 clients = 2500 total)
pnpm run manual:schedule:generate

# Or specify custom number
pnpm run manual:schedule:generate -- --shows=1000 --clients=10

# Run complete workflow
pnpm run manual:schedule:all
```

**Documentation**: See [schedule-planning/README.md](./schedule-planning/README.md) and [schedule-planning/GOOGLE_SHEETS_WORKFLOW.md](./schedule-planning/GOOGLE_SHEETS_WORKFLOW.md)

**Scripts**:
- `test:generate:schedule-payload` - Generate test payloads
- `test:create:schedules` - Create schedules
- `test:upload:schedule-plans` - Upload plan documents
- `test:validate:schedules` - Validate schedules
- `test:publish:schedules` - Publish schedules
- `test:schedule:all` - Run all steps

### 2. Backdoor API Flow

**Purpose**: Test service-to-service backdoor operations (user creation, updates, membership management).

**Location**: `backdoor/`

**Quick Start**:
```bash
# Run complete workflow (recommended)
pnpm run manual:backdoor:all

# Or run steps individually:
pnpm run manual:backdoor:create-users
pnpm run manual:backdoor:update-users -- --user-id=user_123
pnpm run manual:backdoor:create-memberships
```

**Documentation**: See [backdoor/README.md](./backdoor/README.md) and [backdoor/BACKDOOR_WORKFLOW.md](./backdoor/BACKDOOR_WORKFLOW.md)

**Scripts**:
- `manual:backdoor:create-users` - Create user
- `manual:backdoor:update-users` - Update user
- `manual:backdoor:create-memberships` - Create membership
- `manual:backdoor:all` - Run all steps sequentially

## Prerequisites

1. **Database Setup**: Ensure the database is seeded with fixtures
   ```bash
   cd apps/erify_api
   pnpm run db:seed
   ```

2. **API Server**: Start the API server
   ```bash
   pnpm run dev
   ```

3. **Environment Variables**: Configure API keys in `.env` file (optional for dev mode):
   ```env
   GOOGLE_SHEETS_API_KEY=your-api-key-here
   BACKDOOR_API_KEY=your-backdoor-api-key-here
   ```

## Authentication

All test scripts automatically read API keys from your `.env` file:

- **Without API Key in .env**: Scripts don't send the header, allowing you to test dev mode behavior (authentication bypassed)
- **With API Key in .env**: Scripts automatically include `X-API-Key` header, allowing you to test production mode behavior (authentication enforced)

This matches the server's actual configuration, so you can test the real behavior based on whether the server runs in dev or prod mode.

See [Server-to-Server Authentication Guide](../docs/SERVER_TO_SERVER_AUTH.md) for complete authentication details.

## Custom API URL

All scripts support a custom API URL via command line argument:

```bash
# Schedule planning scripts
pnpm run test:create:schedules -- --api-url=http://localhost:3000

# Backdoor scripts
pnpm run test:backdoor:create-users -- --api-url=http://localhost:3000
```

## Testing Different Scenarios

**Behavior Matrix**:
- **Dev mode + no key in .env**: No header sent → bypass auth (expected)
- **Dev mode + key in .env**: Header sent → auth enforced (expected)
- **Prod mode + no key in .env**: No header sent → should error (expected per behavior matrix)
- **Prod mode + key in .env**: Header sent → auth enforced (expected)

## Related Documentation

- **[Server-to-Server Authentication Guide](../docs/SERVER_TO_SERVER_AUTH.md)** - Complete API key guard documentation
- **[Authentication Guide](../docs/AUTHENTICATION_GUIDE.md)** - JWT validation and authorization patterns
- **[Schedule Planning Flow](./schedule-planning/README.md)** - Schedule planning testing guide
- **[Backdoor API Flow](./backdoor/README.md)** - Backdoor API testing guide
