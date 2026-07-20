---
name: orchestration-service-nestjs
description: DEPRECATED legacy erify_api orchestration pattern. Do not create orchestration services by default; use erify-api-capability-refactoring first.
---

# Orchestration Service Pattern - NestJS (Deprecated)

> **Deprecated for new code and refactoring.**
>
> Use [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md)
> as the authoritative architecture skill. Cross-model behavior does not automatically
> require a generic orchestration layer; place workflows under the business capability
> that owns the use case.

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
