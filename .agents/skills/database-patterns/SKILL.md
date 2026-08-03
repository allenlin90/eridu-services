---
name: database-patterns
description: Manage Prisma schema, migrations, transaction isolation, N+1 query prevention, and soft deletes.
---

# Database & Persistence Procedure

Thin procedural skill for database schema and query operations. Canonical database rules live in [`knowledge/architecture/database-patterns.md`](../../../knowledge/architecture/database-patterns.md).

## Task Workflow

1. **Schema Mutations**: Apply schema changes via `npx prisma migrate dev`. Never edit existing migration SQL files.
2. **Transaction Scoping**: Wrap multi-table operations in `@nestjs-cls/transactional` (`TransactionHost.tx`).
3. **Prevent N+1 Queries**: Define explicit `include`/`select` fields or use batch loaders.
4. **Soft Delete Filtering**: Ensure active queries filter `{ deletedAt: null }`.
5. **Verification**: Run `DATABASE_URL=... pnpm --filter erify_api db:generate`.

## Canonical Knowledge Reference

- [`knowledge/architecture/database-patterns.md`](../../../knowledge/architecture/database-patterns.md)
