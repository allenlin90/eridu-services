---
name: service-pattern-nestjs
description: Comprehensive NestJS service implementation patterns. This skill should be used when implementing Model Services, Orchestration Services, or business logic with NestJS decorators.
---

# Service Pattern - NestJS

Implementation guide for NestJS Services in Eridu.

## Canonical Examples

Study these real implementations as the source of truth:
- **Model Service**: [task-template.service.ts](../../../apps/erify_api/src/models/task-template/task-template.service.ts)
- **Schema File**: [task-template.schema.ts](../../../apps/erify_api/src/models/task-template/schemas/task-template.schema.ts)
- **Base Service**: [base-model.service.ts](../../../apps/erify_api/src/lib/services/base-model.service.ts)

> See [references/service-examples.md](references/service-examples.md) for detailed code examples.

## Service Architecture

```
Controller → Service → Repository → Database
               ├─ Model Services (single entity CRUD)
               └─ Orchestration Services (multi-entity workflows)
```

### Model Services

Extend `BaseModelService`. Handle single-entity CRUD, UID generation, and domain logic.

### Orchestration Services

Coordinate multiple Model Services. Use `@Transactional()` for atomicity. See `orchestration-service-nestjs` skill.

## Critical Rules

### 1. Extend BaseModelService

Define `UID_PREFIX` (no trailing underscore). Inject `UtilityService`. Use `this.generateUid()`.

### 2. No ORM Coupling

🔴 Services MUST NEVER import or use `Prisma.*` types in method signatures.

- **Schema files** MAY use Prisma types to define payload types.
- **Services** import payload types from schemas, not Prisma.
- **Pass-through methods** use `Parameters<Repository['method']>` to match repo signatures.
- **Money / `Prisma.Decimal`:** `Decimal` is a `Prisma.*` type — don't expose it in public service signatures; convert `Decimal` → string at the boundary. Format with the canonical `decimalToString` (`lib/utils`); don't add parallel money formatters with divergent semantics. A shared domain `Money` type is a deferred direction decision (see `docs/tech-debt/erify-api-refactor-residuals.md`).

### 3. Never Call Zod `.parse()` in Services

The controller/DTO layer validates input. Services accept typed payloads. Parsing again is double-validation in the wrong layer.

### 4. Repository Owns Where-Clause Building

Services pass domain-level parameters. Repositories build ORM-specific filters internally.

### 5. Domain Transition Rule

Business-state transitions (not generic field updates) must be explicit service actions with invariants: allowed states, blocking conditions, audit context, idempotent behavior.

## Error Handling by Service Type

| Service Type | Pattern |
|---|---|
| Model Service | Return `null` for not-found. Controller calls `ensureResourceExists()`. |
| Orchestration Service | May throw `HttpError.badRequest()` / `HttpError.forbidden()` for cross-domain constraints. |
| Controller | Verifies existence BEFORE calling mutation service. |

## When Does a Model Service Justify Existing?

A model service exists to generate UIDs, enforce invariants, translate payloads, and be the module's stable public API. A pass-through service is acceptable for pattern consistency and UID generation. A service with no UID generation and zero logic should be questioned.

## Checklist

- [ ] Extends `BaseModelService` with `UID_PREFIX` (no trailing underscore)
- [ ] 🔴 Schema-defined payload types, never `Prisma.*` in service signatures
- [ ] 🔴 Never calls Zod `.parse()` — accepts typed payloads
- [ ] 🔴 `Parameters<Repository['method']>` for pass-through methods
- [ ] 🔴 Repository builds where-clauses, not service
- [ ] 🔴 Returns `null` for not-found (no throws in read operations)
- [ ] Catches `VersionConflictError` → `HttpError.conflict()`
- [ ] Bulk operations use repository bulk methods, not loops
- [ ] Dedicated methods preferred over exposing `include` parameters
- [ ] Mark internal orchestration methods with `@internal` JSDoc

## Related Skills

- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Data access patterns
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Controller patterns
- [Database Patterns](../database-patterns/SKILL.md) — Transactions, soft delete, locking
- [Data Validation](../data-validation/SKILL.md) — Input validation patterns
