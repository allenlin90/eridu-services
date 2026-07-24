---
name: service-pattern-nestjs
description: Implement erify_api capability services with stable typed APIs and evidence-based persistence boundaries.
---

# Service Pattern - NestJS

> **Capability placement and persistence selection.**
> [`erify-api-capability-refactoring`](../erify-api-capability-refactoring/SKILL.md)
> decides where a capability service, command/use case, or query provider lives
> and whether shallow persistence stays in the service or moves behind a private
> provider. This skill defines the service correctness rules for either choice.

Implementation guide for NestJS Services in Eridu.

## Canonical Examples

Study these real implementations as the source of truth:
- **Model Service**: [task-template.service.ts](../../../apps/erify_api/src/models/task-template/task-template.service.ts)
- **Schema File**: [task-template.schema.ts](../../../apps/erify_api/src/models/task-template/schemas/task-template.schema.ts)
- **Base Service**: [base-model.service.ts](../../../apps/erify_api/src/lib/services/base-model.service.ts)

> See [references/service-examples.md](references/service-examples.md) for detailed code examples.

## Service Architecture

```
Controller → Capability Service / Use Case → Persistence → Database
                                          ├─ direct txHost (shallow CRUD)
                                          └─ private repository/queries (complex)
```

### Model Services

Extend `BaseModelService`. Handle single-entity CRUD, UID generation, and domain logic.

### Orchestration Services

Coordinate multiple Model Services. Use `@Transactional()` for atomicity. See `orchestration-service-nestjs` skill.

## Critical Rules

### 1. Extend BaseModelService

Define `UID_PREFIX` (no trailing underscore). Inject `UidGeneratorService`.
Use `this.generateUid()`. Keep deterministic business helpers as pure
functions; do not add them to the UID adapter.

### 2. No ORM Coupling

🔴 Services MUST NEVER expose `Prisma.*` types in public method signatures.

- **Schema files** MAY use Prisma types to define payload types.
- **Services** import public payload/filter types from schemas.
- A direct-persistence service may use the generated delegate internally through
  `TransactionHost.tx.<model>` but must expose only domain/schema types.
- Repository-backed pass-through methods may use
  `Parameters<Repository['method']>` only when that does not leak Prisma types.
- **Money / `Prisma.Decimal`:** `Decimal` is a `Prisma.*` type — don't expose it in public service signatures; convert `Decimal` → string at the boundary. Format with the canonical `decimalToString` (`lib/utils`); don't add parallel money formatters with divergent semantics. A shared domain `Money` type is a deferred direction decision (see `docs/tech-debt/erify-api-refactor-residuals.md`).

### 3. Never Call Zod `.parse()` in Services

The controller/DTO layer validates input. Services accept typed payloads. Parsing again is double-validation in the wrong layer.

### 4. The Selected Persistence Boundary Owns Query Building

Public service methods accept domain-level parameters. A shallow
direct-persistence service builds its private bounded query internally. When a
repository or query provider is selected, that provider builds the
Prisma-specific filter.

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
- [ ] The persistence matrix selects direct `txHost.tx` or a justified private provider
- [ ] 🔴 Public methods expose domain/schema types, not a Prisma query DSL
- [ ] Query building stays private to the selected persistence boundary
- [ ] 🔴 Returns `null` for not-found (no throws in read operations)
- [ ] Catches `VersionConflictError` → `HttpError.conflict()`
- [ ] Bulk operations use bulk persistence methods, not loops
- [ ] Dedicated methods preferred over exposing `include` parameters
- [ ] Mark internal orchestration methods with `@internal` JSDoc

## Related Skills

- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Complex private persistence providers
- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Controller patterns
- [Database Patterns](../database-patterns/SKILL.md) — Transactions, soft delete, locking
- [Data Validation](../data-validation/SKILL.md) — Input validation patterns
