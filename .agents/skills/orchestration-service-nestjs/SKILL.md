---
name: orchestration-service-nestjs
description: Legacy erify_api orchestration pattern. Capability skill wins on placement; workflow correctness rules here stay canonical until the ShowStatus pilot.
---

# Orchestration Service Pattern - NestJS (Superseded for placement)

> **Superseded for architecture and placement selection.**
>
> [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) is
> authoritative for where a cross-model workflow lives: place it under the business
> capability that owns the use case rather than a generic orchestration layer. The
> workflow correctness rules below (transactions, advisory locks, race-safe writes)
> remain canonical.

## Allowed Use

Use this skill only when maintaining an existing orchestration workflow whose
architectural redesign is explicitly outside the task scope.

Do not use this skill to justify:

- creating an orchestration service merely because two Prisma models are involved;
- organizing workflows around model services instead of business capabilities;
- adding a generic `{Domain}OrchestrationService` for every cross-table operation;
- keeping large workflow facades undecomposed;
- exporting repositories or using `forwardRef` to bypass ownership problems;
- separating a processor only to satisfy a naming convention rather than a real
  transaction or cohesion boundary.

For refactoring, prefer named commands/use cases, cohesive internal workflow services,
pure planning and policy functions, and dedicated query providers. A stable facade may
remain when it improves callers, but it should delegate to capability-owned units.

## Legacy Safety Rules

When a task is strictly limited to legacy orchestration maintenance:

- preserve transaction and advisory-lock behavior;
- keep transaction-dependent persistence on `TransactionHost.tx`;
- do not use `forwardRef` to hide a missing workflow owner;
- preserve idempotency, partial-success semantics, and audit effects;
- scope race-sensitive writes by parent and active-row predicates;
- distinguish stale/not-found outcomes from infrastructure failures;
- guard persisted JSON discriminator and registry lookups.

## Authority

If this file conflicts with
[`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md), the
capability-refactoring skill wins.
