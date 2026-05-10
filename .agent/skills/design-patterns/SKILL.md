---
name: design-patterns
description: Provides comprehensive architectural patterns for building scalable systems. This skill focuses on high-level architecture, layer boundaries, and package organization.
---

# Design Patterns Skill

Provides comprehensive architectural patterns for building scalable systems. This skill focuses on **High-Level Architecture**, **Layer Boundaries**, and **Package Organization**.

For implementation details, refer to the specific layer skills:
- **[Controllers](../backend-controller-pattern-nestjs/SKILL.md)**: HTTP Boundary & Input Validation
- **[Services](../service-pattern-nestjs/SKILL.md)**: Business Logic & Orchestration
- **[Repositories](../repository-pattern-nestjs/SKILL.md)**: Data Access & Persistence

## Architectural Layers

**Organize code into distinct layers with clear responsibilities**:

```
┌─────────────────────────────────┐
│       HTTP API Layer            │  Controllers, Route handlers
│   (Request/Response handling)   │  Input validation, HTTP status codes
└──────────────┬──────────────────┘
               │ Calls Services
               │
┌──────────────▼──────────────────┐
│     Business Logic Layer        │  Services, Orchestration
│  (Core domain operations)       │  Transactions, Validation, Error handling
└──────────────┬──────────────────┘
               │ Calls Repositories
               │
┌──────────────▼──────────────────┐
│     Data Access Layer           │  Repositories, Queries
│    (Database operations)        │  ORM mapping, Query building
└──────────────┬──────────────────┘
               │ Calls Database
               │
┌──────────────▼──────────────────┐
│      Database Layer             │  Tables, Relationships
│    (Data persistence)           │  Constraints, Migrations
└─────────────────────────────────┘
```

**Key Boundaries**:
- **Controller Boundary**: Only Controllers speak HTTP (Req/Res, Status Codes). Services should NEVER know about HTTP.
- **Service Boundary**: Services implement all business logic. Controllers should NEVER contain business logic.
- **Repository Boundary**: Repositories hide the Database/ORM. Services should NEVER write raw queries or know about SQL.
- **Types Boundary**: Use Shared API Types (`@eridu/api-types`) at the external edges (Controller inputs/outputs). Use Domain/DB types internally.

## Recorded Facts vs Derived Read Models

Store operational facts on the entity whose real-world scope they describe, and keep derived reference figures in backend read models/calculators.

| Fact type | Canonical entity scope |
| :--- | :--- |
| Overall show timing | `Show` |
| Creator participation timing within a show | `ShowCreator` |
| Platform stream/performance/revenue facts | `ShowPlatform` or a dedicated child metrics model |
| Operator/member labor timing | `StudioShiftBlock` |

Rules:
- Actual timestamps are recorded facts, not calculated money.
- Use the narrowest scoped entity that can answer the business question without ambiguity.
- Multiple actual start/end fields can coexist when they mean different things; do not collapse creator participation, platform stream timing, and show timing into one generic "actuals" concept.
- Do not persist calculated finance totals on operational tables. If a future workflow needs durable paid/settled/frozen numbers, model that as an explicit snapshot, settlement, or payment artifact rather than reusing live operational rows.

## Dependency Injection (High Level)

**Pattern**: Inversion of Control.

- **Inject dependencies**, do not instantiate them manually.
- **Low Coupling**: Rely on interfaces/contracts instead of concrete implementations where possible.
- **Testability**: Ensure dependencies can be easily mocked in unit tests.

## Service Architecture Strategy

Distinguish between two types of services to manage complexity and avoid circular dependencies.

| Type | Responsibility | Dependencies | Example |
| :--- | :--- | :--- | :--- |
| **Model Service** | CRUD for a **Single Entity**. | Repository, UtilityService | `UserService`, `ShowService` |
| **Orchestration Service** | Coordinate **Multiple Entities**. | Multiple Model Services or Repositories | `ShowOrchestrationService` |

**Decision Tree**:
1. Does it touch only **one** table/entity? -> **Model Service**.
2. Does it touch **multiple** tables/entities in a transaction? -> **Orchestration Service**.

## Monorepo Package Organization

**Organize workspace packages by concern**:

- **`packages/api-types`**: **Single Source of Truth** for API contracts. Shared between FE and BE.
- **`packages/auth-sdk`**: Authentication utilities (JWT, JWKS) shared across apps.
- **`packages/ui`**: Shared UI components (React) and styles.
- **`packages/eslint-config`**: Shared linting rules.

**Best Practices**:
- ✅ Always export compiled code from `dist/` in packages.
- ✅ Use `workspace:*` for internal dependencies.
- ❌ **Never** import from an `app` into a `package` (Cyclic dependency).
- ❌ Ensure apps rely on packages, not other apps.

## Module Exports

**Rule: Export Services Only. No exceptions.**

Modules export their Service as the only public API.
Repositories are private implementation details — never export them.

✅ exports: [UserService]
❌ exports: [UserService, UserRepository]
❌ exports: [UserRepository]

**Why**: Exporting a repository leaks the data layer. Every consumer would couple
to your database access patterns. When you need a new repository operation from
an orchestration service, add a method to the model service instead.

**Join/Association Table modules**: Follow the same rule.
- Add a service even if it's thin (it generates UIDs and exposes the repo methods)
- Export only the service
- Examples: ShowMcModule (DB-level: `ShowMC` Prisma model, API surface uses "creator"), ShowPlatformModule, TaskTargetModule
- **Naming note**: Some model-layer modules retain legacy DB names (e.g. `ShowMcModule` / `ShowMcService`) while the API surface and admin routes use creator-first naming (`/admin/show-creators`). This is intentional — the Prisma model is `ShowMC`, and renaming it would require a migration.

**Reference/Lookup table modules**: Same rule.
- Examples: ShowStandardModule, ShowStatusModule, ShowTypeModule

**Orchestration modules**: Same rule.
- Export only the orchestration service
- Never export orchestration-internal repositories or processors

## When to Create a Separate Module for Join Tables

Create a separate module when the association:
- Has its own business lifecycle (create/restore/cascade-delete methods)
- Carries extra payload fields beyond the two FK columns
- Is referenced independently by multiple domains

Fold into the parent module when:
- It is purely a FK link with no extra data or logic
- Only created/deleted within a single transaction owned by the parent

Examples:
- ShowMcModule (separate) → has restore/cascade methods, note field (DB model: `ShowMC`; API surface: "show-creator")
- ShowPlatformModule (separate) → has liveStreamLink, viewerCount
- TaskTargetModule (separate) → 1:N polymorphic join, kept separate for consistency
- `CompensationLineItemTarget` (folded into `CompensationLineItemModule`) → strict 1:1 polymorphism-only side table; no own service or repository, addressed exclusively through the parent line item. See the polymorphism guidance in the [Database Patterns skill, Rule 7](../database-patterns/SKILL.md#7-explicit-fks-over-polymorphism) for when to pick side table vs Exclusive Arc.


## Performance Optimization Strategy

Address performance at the correct layer:

**1. Database Layer (The Foundation)**
- Create indexes on foreign keys and frequently queried fields.
- Use correct column types.

**2. Repository Layer (The Query)**
- **Eager Loading**: Use `include` to solve N+1 problems.
- **Bulk Operations**: Use `createMany`/`updateMany` instead of loops.
- **Soft Deletes**: Always filter `deletedAt: null`.

**3. Service Layer (The Logic)**
- **Parallel Execution**: Use `Promise.all()` for independent operations.
- **Transactions**: Keep transactions short and focused on DB writes.

**4. HTTP Layer (The Edge)**
- **Caching**: Cache responses where appropriate.
- **Pagination**: Always paginate list endpoints.

## Related Skills

For architecture-specific patterns (N+1 queries, Soft Deletes, etc.), refer to:
- **[Backend Controller Patterns](../backend-controller-pattern-nestjs/SKILL.md)**
- **[Service Patterns](../service-pattern-nestjs/SKILL.md)**
- **[Repository Patterns](../repository-pattern-nestjs/SKILL.md)**
- **[Database Patterns](../database-patterns/SKILL.md)**
- **[Code Quality](../code-quality/SKILL.md)**
