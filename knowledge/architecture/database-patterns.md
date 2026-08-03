# Database & Persistence Architecture Standard

okf_version: "0.2"
type: architecture_doctrine
status: active
stale_after: "2027-01-01"

## Overview

Canonical database and persistence rules for PostgreSQL & Prisma in `apps/erify_api` and `apps/eridu_auth`.

## Persistence Rules

1. **Transaction Isolation**: Wrap multi-table mutation flows using `@nestjs-cls/transactional` (`TransactionHost.tx`). Never manage raw database connections in controllers or handlers.
2. **N+1 Prevention**: Explicitly specify Prisma `include` or `select` trees for nested relations, or use batch loaders (`DataLoader`) for list queries.
3. **Migration Integrity**: Never edit deployed Prisma migration SQL files (`prisma/migrations/`). New schema changes require `npx prisma migrate dev`.
4. **Soft Delete**: Soft-deleted entities specify `deletedAt DateTime?`. Active queries must default to `where: { deletedAt: null }`.
