---
name: service-pattern-nestjs
description: Implement NestJS service architecture, capability vs model boundaries, transactions, and public UIDs.
---

# NestJS Service Architecture Procedure

Thin procedural skill for implementing NestJS backend service layers. Canonical service patterns live in [`knowledge/architecture/service-pattern-nestjs.md`](../../../knowledge/architecture/service-pattern-nestjs.md) and [`apps/erify_api/docs/ARCHITECTURE.md`](../../../apps/erify_api/docs/ARCHITECTURE.md).

## Task Workflow

1. **Classify Service**: Determine if service is a Capability Service (orchestration) or Model Service (entity CRUD).
2. **Transaction Scoping**: Ensure business transactions are managed via `TransactionHost.tx` in Capability Services.
3. **Public UID Translation**: Translate internal DB IDs to public UIDs (`{prefix}_{nanoid}`) before returning to controllers.
4. **Verification**: Run `pnpm --filter erify_api test` for service unit specs.

## Canonical Knowledge Reference

- [`knowledge/architecture/service-pattern-nestjs.md`](../../../knowledge/architecture/service-pattern-nestjs.md)
