# Design Patterns Skill

Provides comprehensive architectural patterns for building scalable systems. This skill focuses on **High-Level Architecture**, **Layer Boundaries**, and **Package Organization**.

For implementation details, refer to the specific layer skills:
- **[Controllers](backend-controller-pattern/SKILL.md)**: HTTP Boundary & Input Validation
- **[Services](service-pattern/SKILL.md)**: Business Logic & Orchestration
- **[Repositories](repository-pattern/SKILL.md)**: Data Access & Persistence

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

## Dependency Injection (High Level)

**Pattern**: Inversion of Control.

- **Dependencies are injected**, not instantiated.
- **Low Coupling**: Classes rely on interfaces/contracts, not concrete implementations (where possible).
- **Testability**: Dependencies can be easily mocked in unit tests.

## Service Architecture Strategy

We distinguish between two types of services to manage complexity and avoid circular dependencies.

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
- ❌ A `package` should never import from an `app` (Cyclic dependency).
- ❌ Apps should rely on packages, not other apps.

## Performance Optimization Strategy

Address performance at the correct layer:

**1. Database Layer (The Foundation)**
- Indexes on foreign keys and frequently queried fields.
- Correct column types.

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

- **backend-controller-pattern/SKILL.md**
- **service-pattern/SKILL.md**
- **repository-pattern/SKILL.md**
- **database-patterns/SKILL.md**
- **code-quality/SKILL.md**
