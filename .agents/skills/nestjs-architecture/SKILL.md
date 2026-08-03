---
name: nestjs-architecture
description: Implement erify_api controllers, capability services, private repositories, and orchestration workflows with their layer-specific correctness rules.
---

# NestJS Layering — erify_api

One entry point for the four `erify_api` layers. Each layer's rules, checklists, and code examples are unchanged from the per-layer skills this replaces — they moved into [`references/`](references/) verbatim.

> **Placement first.** [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) decides *where* a use case lives and whether persistence stays inline (`TransactionHost.tx`) or moves behind a private provider. This skill applies once that is settled — it does not compete with that decision.

## Route to the layer you are changing

| Changing | Read |
| --- | --- |
| Controller, route shape, guards, response serialization | [`references/controller-pattern.md`](references/controller-pattern.md) → [`controller-rules.md`](references/controller-rules.md), [`controller-examples.md`](references/controller-examples.md) |
| Capability or model service, payload types, UID generation | [`references/service-pattern.md`](references/service-pattern.md) → [`service-examples.md`](references/service-examples.md) |
| A private repository the persistence matrix selected | [`references/repository-pattern.md`](references/repository-pattern.md) → [`repository-examples.md`](references/repository-examples.md) |
| Multi-model workflow, transactions, idempotency, locks, race-safe writes | [`references/orchestration-pattern.md`](references/orchestration-pattern.md) → [`orchestration-examples.md`](references/orchestration-examples.md) |

A repository is **not** the default. Read the repository reference only after the persistence matrix selects one; shallow CRUD belongs directly in the capability service.

## Verification

```bash
pnpm --filter erify_api lint && pnpm --filter erify_api typecheck && pnpm --filter erify_api test && pnpm --filter erify_api build
```

Changes affecting transaction semantics, soft-delete/restore, CLS participation, or Nest runtime composition also require the guarded real-database gate in [`code-quality` § backend testing](../code-quality/references/backend-testing-patterns.md#5-real-database-integration-tests). Record the result in the PR.

## Canonical Knowledge

- [`knowledge/architecture/service-pattern-nestjs`](../../../knowledge/architecture/service-pattern-nestjs.md) — service rules, error matrix, checklist
- [`knowledge/architecture/backend-controller-pattern-nestjs`](../../../knowledge/architecture/backend-controller-pattern-nestjs.md) — controller types, rules, review list
- [`knowledge/architecture/database-patterns`](../../../knowledge/architecture/database-patterns.md) — transactions, soft delete, optimistic locking
- [`apps/erify_api/docs/ARCHITECTURE.md`](../../../apps/erify_api/docs/ARCHITECTURE.md) — capability and persistence matrix

## Related Skills

- [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) — placement and persistence selection (read first)
- [`erify-authorization`](../erify-authorization/SKILL.md) — guards, roles, studio membership
- [`database-patterns`](../database-patterns/SKILL.md) — Prisma-level persistence procedure
- [`fact-extraction-pipeline`](../fact-extraction-pipeline/SKILL.md) — extractor and paired-write patterns
