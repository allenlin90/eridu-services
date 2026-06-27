# Repository Pattern Examples

Use these examples when the main skill needs a concrete reminder of how repositories are structured in `erify_api`.

## Canonical Files

- [task-template.repository.ts](../../../../apps/erify_api/src/models/task-template/task-template.repository.ts)
- [base.repository.ts](../../../../apps/erify_api/src/lib/repositories/base.repository.ts)

## What To Study

- How `BaseRepository` is extended
- How wrapper classes bridge Prisma delegates into the base repository contract
- How domain-specific list and relation queries stay in the repository layer
- How services consume repository methods without importing Prisma types
