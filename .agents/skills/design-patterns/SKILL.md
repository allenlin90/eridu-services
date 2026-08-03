---
name: design-patterns
description: Make high-level architecture, layer-boundary, and package-organization decisions, not implementation quality checks.
---

# Design Patterns

Procedure for architecture, layer-boundary, and package-organization decisions. Canonical doctrine lives in [`knowledge/architecture/design-patterns`](../../../knowledge/architecture/design-patterns.md).

> For `erify_api` module placement and persistence selection, [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) is authoritative and takes precedence over this skill.

## Procedure

1. Name the decision: layer boundary, OLTP-vs-analytical, route shape, module export, join-table module, or package placement. Read that section of the knowledge doc.
2. Place the use case with the business capability that owns the rule — not a table-first or audience-first slice.
3. Check the module-export rules before exporting anything: capability services and intentional query APIs only; persistence providers stay private.
4. For anything crossing a workspace boundary, check [`package-extraction-strategy`](../package-extraction-strategy/SKILL.md) before creating a package.
5. Record the decision and its trigger in the plan and PR. Do not introduce a speculative layer to make a hypothetical future refactor easier.

## Verification

```bash
pnpm architecture:signals
```

Then the standard checklist for each workspace the decision touches (`lint`, `typecheck`, `test`, `build`).

## Canonical Knowledge

- [`knowledge/architecture/design-patterns`](../../../knowledge/architecture/design-patterns.md) — layers, OLTP/analytical split, route shape, module exports, package organization
- [`apps/erify_api/docs/ARCHITECTURE.md`](../../../apps/erify_api/docs/ARCHITECTURE.md) — capability-first direction and persistence matrix
- Implementation detail: [controllers](../nestjs-architecture/references/controller-pattern.md) | [services](../nestjs-architecture/references/service-pattern.md) | [repositories](../nestjs-architecture/references/repository-pattern.md)
