---
name: design-patterns
description: Provides comprehensive architectural patterns for building scalable systems. This skill focuses on high-level architecture, layer boundaries, and package organization. Use when making architecture decisions, defining layer boundaries, or organizing packages.
---

# Design Patterns

High-level architecture, layer boundaries, and package organization.

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

## Recorded Facts vs Derived Read Models

Store facts on the narrowest entity: `Show` (event timing), `ShowCreator` (participation), `ShowPlatform` (stream/revenue), `StudioShiftBlock` (labor). Never persist calculated finance totals on operational tables.

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
