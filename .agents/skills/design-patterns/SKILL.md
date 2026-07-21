---
name: design-patterns
description: Make high-level architecture, layer-boundary, and package-organization decisions, not implementation quality checks.
---

# Design Patterns

High-level architecture, layer boundaries, and package organization.

For `erify_api` module and capability placement, [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md) is authoritative (its persistence-matrix rules are pilot-gated; repository-first persistence stays canonical until the `ShowStatus` pilot).

For implementation details: [controllers](../backend-controller-pattern-nestjs/SKILL.md) | [services](../service-pattern-nestjs/SKILL.md) | [repositories](../repository-pattern-nestjs/SKILL.md)

## Architectural Layers

```
HTTP API (Controllers) → Business Logic (Services) → Data Access (Repositories) → Database
```

**Boundaries**:
- Only Controllers speak HTTP — services never know about HTTP
- Services implement all business logic — controllers never contain business logic
- Repositories hide DB/ORM — services never write raw queries
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
| **Model Service** | Single entity CRUD | Repository, UtilityService |
| **Orchestration** | Multi-entity coordination | Multiple Model Services |

Decision: one table → Model Service; multiple tables in transaction → Orchestration.

## Module Exports

Export services only. Repositories are private. Join/association table modules: add a service (even if thin), export only the service.

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
