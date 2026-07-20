---
name: service-pattern-nestjs
description: DEPRECATED legacy erify_api model-service pattern. Do not use for new code or refactoring; use erify-api-capability-refactoring first.
---

# Service Pattern - NestJS (Deprecated)

> **Deprecated for new code and refactoring.**
>
> Use [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md)
> as the authoritative architecture skill. It decides whether a capability service,
> named command/use case, query provider, specialized repository, or direct
> transaction-aware Prisma access is appropriate.

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
