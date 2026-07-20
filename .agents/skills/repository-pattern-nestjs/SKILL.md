---
name: repository-pattern-nestjs
description: Legacy erify_api repository pattern. Capability skill wins on placement; repository-first persistence stays canonical until the ShowStatus pilot.
---

# Repository Pattern - Prisma/NestJS (Superseded for placement)

> **Superseded for architecture and placement selection.**
>
> [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) is
> authoritative for where persistence lives and whether a capability needs a repository.
> Its persistence-matrix rules — repositories as selective tools, direct
> `TransactionHost.tx`, retiring `BaseRepository` — are **pilot-gated**. Until the
> `ShowStatus` pilot lands, repository-first data access and `BaseRepository.softDelete()`
> remain canonical for persistence, and the safety rules below apply.

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

For placement, apply the capability-ownership rules in the capability-refactoring skill.
The persistence-decision matrix there (shallow capability services using
`TransactionHost.tx.<model>` directly) is pilot-gated: until the `ShowStatus` pilot is
accepted, keep persistence in a repository. Specialized repositories remain appropriate
for complex queries, optimistic writes, raw SQL, aggregate persistence, synchronization,
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
`restore()` behavior is incorrect for deleted rows. Do not expand its use or add new
reliance on its unsafe inherited behavior. Retiring or replacing it is the pilot-gated
destination (roadmap T9/T11) — not a change to make outside that work.

## Authority

If this file conflicts with
[`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md), the
capability-refactoring skill wins.
