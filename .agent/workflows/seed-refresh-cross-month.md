---
description: Deterministic cross-app seed refresh workflow for month rollover and stale local fixtures
---

# Seed Refresh Workflow (Cross-Month / Stale Local Data)

Use this workflow when local seed data is stale (for example, new month rollover), or when cross-app user mapping breaks after DB reset.

## Trigger Conditions

Run this workflow when any of the following is true:

1. Current month changed and seeded schedules/shows no longer reflect the active month.
2. Availability/mapping/economics behavior looks inconsistent after schema/service changes.
3. `external_id` links between `eridu_auth` and `erify_api` users are missing or outdated.
4. A new developer needs a deterministic local setup from scratch.

## Goals

1. Rebuild local databases in a deterministic way.
2. Ensure seed data is month-fresh and complete.
3. Ensure cross-app auth user mapping (`ext_id`) is synced.
4. Ensure basic BE/FE smoke flows work before implementation continues.

## Canonical Command Order

### 1) Refresh auth-side identity source (`eridu_auth`)

```bash
pnpm --filter eridu_auth db:reset
```

This resets + migrates + seeds the auth DB using official app scripts.

### 2) Refresh app DB (`erify_api`)

```bash
pnpm --filter erify_api db:local:refresh
```

This runs:
- `db:migrate:reset`
- `db:migrate:deploy`
- `db:seed`

### 3) Sync external IDs from auth DB

```bash
pnpm --filter erify_api db:extid:sync
```

This step must run after both apps are seeded.

## Freshness Validation

### A) Seed completeness

Expected from `erify_api` seed logic:

1. Monthly schedules exist for seeded clients.
2. Seeded shows follow month-aware volume (`days_in_month * 3` in current implementation).
3. Studio roster (`StudioMc`) is present and active.

If seed logs indicate incomplete seeding, rerun `db:local:refresh` and resolve the first failing dependency instead of patching DB manually.

### B) Cross-app identity mapping

Expected from `db:extid:sync`:

1. Loaded mappings from `eridu_auth.user`.
2. Non-zero matched and updated counts for test users.
3. No required studio test users left unmatched.

If unmatched users remain, fix seed identifiers (email/name contract) rather than manual DB edits.

### C) Minimal smoke checks

1. Open studios app and verify `/studios/:studioId/creators` loads.
2. Verify roster list appears and allows add/update/remove.
3. Verify bulk creator assignment dialog opens and can search/select.
4. Verify show/task/economics pages load for expected roles.

## Policy Rules

1. Use official framework tooling/scripts first (Prisma/Drizzle/Better Auth).
2. Avoid ad-hoc SQL/manual DB patching for local setup unless debugging a clearly documented exception.
3. Keep seed contract in sync with schema/service changes in the same iteration.
4. If manual-test scripts fail due to DTO/schema drift, update scripts/seed fixtures first; do not change production logic unless behavior is actually wrong.

## Related Docs

- `.agent/workflows/verification.md`
- `docs/product/DB_MIGRATION_POLICY.md`
- `docs/roadmap/PHASE_4.md`
