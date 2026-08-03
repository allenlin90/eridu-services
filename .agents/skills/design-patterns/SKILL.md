---
name: design-patterns
description: Make high-level architecture, layer-boundary, and package-organization decisions, not implementation quality checks.
---

# Architecture & Design Patterns Procedure

Thin procedural skill for high-level architecture decisions. Canonical architecture doctrine lives in [`knowledge/architecture/design-patterns.md`](../../../knowledge/architecture/design-patterns.md) and [`apps/erify_api/docs/ARCHITECTURE.md`](../../../apps/erify_api/docs/ARCHITECTURE.md).

## Task Workflow

1. **Verify Boundary**: Ensure new use cases are placed in capability-first modules (`ShowCatalogModule`), avoiding table-first or audience-first modules.
2. **Enforce UIDs**: Validate that database primary IDs never cross API boundaries; translate to UIDs (`{prefix}_{nanoid}`).
3. **Verify Transactions**: Ensure transactional operations use `@nestjs-cls/transactional` via `TransactionHost.tx`.
4. **Verification**: Run `pnpm architecture:signals` to verify cycle-free dependency graphs.

## Canonical Knowledge Reference

- [`knowledge/architecture/design-patterns.md`](../../../knowledge/architecture/design-patterns.md)
- [`apps/erify_api/docs/ARCHITECTURE.md`](../../../apps/erify_api/docs/ARCHITECTURE.md)
