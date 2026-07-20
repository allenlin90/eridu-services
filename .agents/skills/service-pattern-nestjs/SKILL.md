---
name: service-pattern-nestjs
description: Legacy erify_api model-service pattern. Capability skill wins on placement; persistence and correctness rules here stay canonical until the ShowStatus pilot.
---

# Service Pattern - NestJS (Superseded for placement)

> **Superseded for architecture and placement selection.**
>
> [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) is
> authoritative for where a capability service, command/use case, or query provider
> lives. Its persistence-matrix rules (direct `TransactionHost.tx`, retiring
> `BaseRepository`) are pilot-gated — until the `ShowStatus` pilot lands, the persistence
> and correctness rules below remain canonical.

## Allowed Use

Use this skill only when maintaining untouched legacy model-service code where changing
the architecture is explicitly outside the task scope.

Do not use this skill to justify:

- creating a model service per Prisma model;
- extending `BaseModelService` by default;
- preserving pass-through services for pattern consistency;
- forcing `Controller -> Service -> Repository` on new or refactored code;
- placing business workflows under table-shaped modules.

For refactoring, follow the capability ownership, command/query separation, persistence
decision matrix, transaction rules, and review checklist in the authoritative skill.

## Legacy Safety Rules

When a task is strictly limited to legacy maintenance, continue to preserve these
correctness constraints:

- keep Zod parsing at the transport boundary;
- do not expose raw `Prisma.*` argument types through public service APIs;
- make business-state transitions explicit;
- preserve UID, optimistic-locking, soft-delete, audit, and error behavior;
- route transaction-dependent persistence through `TransactionHost.tx`.

## Authority

If this file conflicts with
[`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md), the
capability-refactoring skill wins.
