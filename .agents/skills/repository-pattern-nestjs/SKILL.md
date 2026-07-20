---
name: repository-pattern-nestjs
description: DEPRECATED legacy erify_api repository pattern. Do not use BaseRepository by default; use erify-api-capability-refactoring first.
---

# Repository Pattern - Prisma/NestJS (Deprecated)

> **Deprecated for new code and refactoring.**
>
> Use [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md)
> as the authoritative architecture skill. Repositories are now selective persistence
> tools, not the default layer for every Prisma model.

## Allowed Use

Use this skill only when maintaining an existing repository whose removal or redesign is
explicitly outside the task scope.

Do not use this skill to justify:

- creating a repository per Prisma model;
- extending `BaseRepository` by default;
- adding repository interfaces for a single Prisma implementation;
- wrapping Prisma CRUD without meaningful persistence behavior;
- exporting repositories for cross-module convenience;
- relying on inherited `BaseRepository` methods inside transactions.

For new or refactored code, apply the persistence decision matrix in the authoritative
capability-refactoring skill. Shallow capability services may use
`TransactionHost.tx.<model>` directly. Specialized repositories remain appropriate for
complex queries, optimistic writes, raw SQL, aggregate persistence, synchronization,
audit storage, and transaction-sensitive operations.

## Legacy Safety Rules

When a task is strictly limited to legacy repository maintenance:

- always preserve soft-delete filtering, including on join rows;
- never throw HTTP exceptions from generic persistence code;
- route transaction-dependent reads and writes through `TransactionHost.tx`;
- do not assume inherited `BaseRepository` methods join the ambient transaction;
- use physical `@@map` and `@map` identifiers in raw SQL;
- include required relations on every path feeding a serializer;
- preserve optimistic-lock conflict behavior.

## Known Unsafe Abstraction

`BaseRepository` is not an approved default for expansion. Its broad generic types leak
Prisma concepts, inherited delegates are not transaction-aware, and its generic
`restore()` behavior is incorrect for deleted rows. Refactoring should retire or replace
it rather than reproduce it.

## Authority

If this file conflicts with
[`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md), the
capability-refactoring skill wins.
