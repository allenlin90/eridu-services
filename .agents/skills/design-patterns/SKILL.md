---
name: design-patterns
description: Make high-level architecture, layer-boundary, and package-organization decisions, not implementation quality checks.
---

# Design Patterns

High-level architecture, layer boundaries, and package organization.

For `erify_api` module placement and persistence selection,
[`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md)
is authoritative.

For implementation details: [controllers](../backend-controller-pattern-nestjs/SKILL.md) | [services](../service-pattern-nestjs/SKILL.md) | [repositories](../repository-pattern-nestjs/SKILL.md)

## Architectural Layers

```
HTTP API → Capability Service / Use Case → Persistence → Database
                                      ├─ direct txHost for shallow CRUD
                                      └─ private repository/queries for complexity
```

**Boundaries**:
- Only Controllers speak HTTP — services never know about HTTP
- Services implement all business logic — controllers never contain business logic
- Capability APIs never expose ORM query types
- Shallow services may use `TransactionHost.tx` directly; complex persistence stays private behind a named provider
- Shared API types at external edges; domain/DB types internally

## OLTP Facts vs Analytical Read Models

Keep OLTP tables focused on operational writes, exception review, and lifecycle decisions. Store facts on the narrowest entity: `Show` (event timing), `ShowCreator` (participation), `ShowPlatform` (platform stream facts), `ShowPlatformViolation` (platform exception events), `StudioShiftBlock` (labor).

Only promote a metric to an operational column when it drives a current operational query, filter, export, override, or constraint. Late, missing, incomplete, stale, and violation states belong in the OLTP path. Cross-show trends, post-show performance analysis, revenue exploration, and derived aggregates belong in an explicit analytical read model or OLAP design.

OLAP may share Postgres through projections/materialized views or use separate infrastructure. Do not assume the infrastructure before the product query shape, freshness, ownership, and backfill requirements are clear. Never persist calculated finance totals on operational tables.

## Audit History

Use the standard `Audit` / `AuditTarget` history for new override and extraction flows. Do not add new metadata audit arrays; existing metadata audit entries are legacy compatibility only.

## REST Route Shape

- One canonical collection per mutable resource under its authorization boundary
- Keep nesting shallow: one scope segment + resource
- Polymorphic resources: use `target_type`/`target_id` fields, not separate route families
- Reserve `include`/`expand` for read-time embedding, not primary mutation contracts

## Service Architecture

| Type | Responsibility | Dependencies |
|---|---|---|
| **Capability Service** | Stable API, single-capability behavior | `TransactionHost` or private persistence provider |
| **Orchestration** | Multi-capability coordination | Capability services and private workflow providers |

Decision: one shallow capability → direct persistence is allowed; complex or
reused persistence → private provider; multiple capabilities in one workflow →
capability-owned orchestration/use case.

## Module Exports

Export capability services or intentional query APIs only. Persistence
providers remain private. Do not add a thin service or module solely because a
join table exists.

For small reference-data capabilities, one module may own several focused
services and their transport adapters without merging the services themselves.
`ShowCatalogModule` is the reference: it owns show type, status, standard, and
platform registration, colocates their admin controllers, and exports only the
four focused services. Importers use `PlatformService.findActiveByUids()` rather
than importing `PlatformRepository`.

## When to Separate Join Table Modules

Separate when: own lifecycle (create/restore/cascade), extra payload fields, referenced by multiple domains.
Fold into parent when: pure FK link, only created/deleted within parent transaction.

## Monorepo Package Organization

- `packages/api-types` — API contracts (FE+BE)
- `packages/auth-sdk` — Auth utilities (JWT, JWKS)
- `packages/ui` — Shared React components
- Always `workspace:*` for internal deps; never import from app into package

## Performance Strategy

1. **DB**: indexes on FKs and frequent queries
2. **Repository**: eager loading (`include`), bulk ops (`createMany`/`updateMany`)
3. **Service**: `Promise.all()` for independent ops, short transactions
4. **HTTP**: caching, pagination
