# Schedule Planning E2E Testing Flow

This directory contains all test payloads, scripts, and documentation for testing the schedule planning workflow (Google Sheets integration).

## Directory Structure

```
schedule-planning/
├── README.md                          # This file
├── GOOGLE_SHEETS_WORKFLOW.md          # Complete workflow documentation
├── payloads/                          # Test payload JSON files
│   ├── 01-create-schedule.json        # Single schedule creation
│   ├── 01-bulk-create-schedule.json   # Bulk schedule creation
│   ├── 02-update-schedule.json        # Schedule update
│   ├── 03-publish-schedule.json       # Schedule publishing
│   └── update-payloads/                # Per-client update payloads
│       ├── 02-update-schedule-01-Nike.json
│       └── ...
└── scripts/                           # Test scripts
    ├── generate-schedule-payload.ts   # Generate test payloads
    ├── 1.create-schedules.ts          # Create schedules
    ├── 2.upload-schedule-plan-documents.ts  # Upload plan documents
    ├── 3.validate-schedules.ts       # Validate schedules
    ├── 4.publish-schedules.ts         # Publish schedules
    └── workflows/
        └── run-all.ts                  # Run all steps sequentially
```

## Quick Start

Baseline note:
- `pnpm run db:seed` now creates a small report-ready dataset (shows + submitted tasks) and non-empty task templates for quick Task Report sanity checks.
- Continue using this schedule-planning workflow for full Google Sheets E2E validation and larger/local stress scenarios.

### 1. Full Reset + Run (Recommended)

```bash
# Full local cycle:
# db refresh -> ext-id sync -> prisma generate -> payload generate -> upload/validate/publish
pnpm run manual:schedule:refresh-and-run

# Full cycle with custom payload size
pnpm run manual:schedule:refresh-and-run -- --shows=1000 --clients=10

# Fast rerun (skip db refresh + ext-id sync)
pnpm run manual:schedule:regen-and-run
```

### 2. Generate Test Payloads (Manual Control)

**Default Behavior**:

- Single client: 50 shows
- Multiple clients: **50 shows per client** (testing maximum)
  - Example: `--clients=50` generates 2500 total shows (50 clients × 50 shows each)

```bash
# Single client (50 shows - default)
pnpm run manual:schedule:generate

# Multiple clients with default (50 shows per client)
pnpm run manual:schedule:generate -- --clients=50
# This generates 2500 total shows (50 clients × 50 shows each)

# Custom number of shows per client
pnpm run manual:schedule:generate -- --shows=1000 --clients=10
# This generates 100 shows per client (1000 total ÷ 10 clients)

# Single client with custom shows
pnpm run manual:schedule:generate -- --shows=100
```

**Note**:

- When `--clients` is specified without `--shows`, it defaults to **50 shows per client** (testing maximum)
- The `02-update-schedule.json` and `update-payloads/*.json` files will contain the specified number of shows
- After publishing, you'll have the full number of shows in the database

### 3. Run Complete Workflow

```bash
# Run all steps sequentially
pnpm run manual:schedule:all

# Or run steps individually:
pnpm run manual:schedule:create
pnpm run manual:schedule:upload
pnpm run manual:schedule:validate
pnpm run manual:schedule:publish
```

## Workflow Steps

1. **Ensure + Upload Plan Documents** - Ensure schedules exist and upload plan documents
2. **Validate Schedules** - Validate schedules for conflicts and errors
3. **Publish Schedules** - Publish validated schedules to create shows

## Documentation

- **[Google Sheets Workflow](./GOOGLE_SHEETS_WORKFLOW.md)** - Complete API workflow documentation
- **[Main Test Payloads README](../README.md)** - Overview of all testing flows

## Authentication

Scripts automatically read `GOOGLE_SHEETS_API_KEY` from `.env` file:

- **Without key**: Scripts don't send header (dev mode behavior)
- **With key**: Scripts include `X-API-Key` header (production behavior)

See [Server-to-Server Authentication Guide](../../docs/design/AUTHORIZATION_GUIDE.md) for details.
