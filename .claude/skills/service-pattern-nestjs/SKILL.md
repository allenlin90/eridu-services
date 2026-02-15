---
name: service-pattern-nestjs
description: Comprehensive NestJS service implementation patterns. This skill should be used when implementing Model Services, Orchestration Services, or business logic with NestJS decorators.
metadata:
  priority: 3
  applies_to: [backend, nestjs, services]
  supersedes: [service-pattern]
---

# Service Pattern - NestJS

**Complete implementation guide for NestJS Services in Eridu.**

## Canonical Examples

Study these real implementations as the source of truth:
- **Model Service**: [task-template.service.ts](../../../apps/erify_api/src/models/task-template/task-template.service.ts)
- **Schema File**: [task-template.schema.ts](../../../apps/erify_api/src/models/task-template/schemas/task-template.schema.ts)
- **Base Service**: [base-model.service.ts](../../../apps/erify_api/src/lib/services/base-model.service.ts)

**Detailed code examples**: See [references/service-examples.md](references/service-examples.md)

---

## Core Responsibilities

Services act as the business logic layer:

1. **Implement business logic** - Handle domain rules and operations
2. **Coordinate data access** - Call repositories to fetch/persist data
3. **Validate input** - Check data before persistence
4. **Handle errors** - Transform low-level errors to domain errors
5. **Coordinate operations** - Orchestrate multi-entity workflows
6. **Manage transactions** - Ensure data consistency

---

## Service Architecture

```
Controller (HTTP boundary)
    ↓
Service (Business logic)
    ├─ Model Services (single entity CRUD)
    └─ Orchestration Services (multi-entity workflows)
    ↓
Repository (Data access)
    ↓
Database
```

---

## Model Service Structure

🔴 **Critical**: Extend `BaseModelService` for standard CRUD.

```typescript
import { Injectable } from '@nestjs/common';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class UserService extends BaseModelService {
  static readonly UID_PREFIX = 'user';  // NO trailing underscore
  protected readonly uidPrefix = UserService.UID_PREFIX;

  constructor(
    private readonly userRepository: UserRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  // Example CRUD methods...
}
```

---

## Context-Agnostic Design

🔴 **Critical**: Services MUST be context-agnostic and callable from **any context**:
- HTTP Controllers, GraphQL Resolvers, CLI Commands, Background Jobs, Other Services

### Design Principles

1. ✅ **Clean contracts** - Domain payloads in, domain entities out
2. ✅ **No caller awareness** - Services don't know who calls them
3. ✅ **No context coupling** - No HTTP, CLI, or job-specific logic
4. ✅ **Fully reusable** - Same method works in all contexts
5. ✅ **Domain exceptions** - Not transport-specific errors

**Key Test**: _"Can this service be called from a CLI script without changes?"_

**Example**:
```typescript
// ✅ GOOD: Context-agnostic
async create(payload: CreateTaskPayload): Promise<Task> {
  const task = await this.taskRepository.create({
    ...payload,
    uid: this.generateUid(),
  });
  return task;
}

// ❌ BAD: HTTP-coupled
async create(req: Request, res: Response) { ... }

// ❌ BAD: DTO-coupled
async create(dto: CreateTaskDto) { ... }
```

**📖 See [references/service-examples.md#context-agnostic-examples](references/service-examples.md#context-agnostic-examples) for detailed examples.**

---

## Error Handling Trade-Off

⚠️ **Note**: This project uses `HttpError` (couples to HTTP) for **pragmatic simplicity**:

```typescript
// Current Pattern (pragmatic)
if (!user) throw HttpError.notFound('User', uid);

// Trade-offs: ✅ Simpler, fewer classes | ❌ HTTP-coupled
```

**Ideal Pattern**: Domain exceptions + controller mapping (more complex, fully context-agnostic).

**📖 See [references/service-examples.md#error-handling-patterns](references/service-examples.md#error-handling-patterns) for comparison.**

---

## Strict ORM Decoupling

🔴 **STRICT**: Services are **FORBIDDEN** from ANY Prisma imports. **NO EXCEPTIONS**.

### 4 Rules

1. **Schema files define payloads** - MAY use `Prisma.*` to define types
2. **Services import payloads** - NOT `Prisma.*` types
3. **Use `Parameters<Repo['method']>`** - For pass-through methods
4. **Repository builds queries** - Services pass domain parameters

**Examples**:
```typescript
// ✅ GOOD: Schema defines payload (allowed Prisma here)
// In schema file:
export type CreateTaskPayload = Omit<Prisma.TaskCreateInput, 'uid'>;

// ✅ GOOD: Service imports payload
import type { CreateTaskPayload } from './schemas';
async create(payload: CreateTaskPayload): Promise<Task>

// ✅ GOOD: Pass-through with Parameters<>
async findOne(...args: Parameters<TaskRepository['findOne']>)

// ❌ BAD: Direct Prisma import in service
import { Prisma } from '@prisma/client';
async create(data: Prisma.TaskCreateInput)
```

**📖 See [references/service-examples.md#orm-decoupling-examples](references/service-examples.md#orm-decoupling-examples) for detailed examples.**

---

## Best Practices Checklist

### Context-Agnostic Design
- [ ] 🔴 **STRICT**: Services accept domain payloads, NOT DTOs or HTTP objects
- [ ] 🔴 **STRICT**: Services return domain entities, NOT HTTP responses
- [ ] 🔴 **STRICT**: Services don't know caller context (HTTP, CLI, job)
- [ ] 🔴 **STRICT**: Methods callable from any context without modification
- [ ] Use `HttpError` for exceptions (pragmatic trade-off)

### ORM Decoupling (STRICT)
- [ ] 🔴 **STRICT**: ZERO `import { Prisma }` in service files
- [ ] 🔴 **STRICT**: ZERO `Prisma.*` types in method signatures
- [ ] 🔴 **STRICT**: Payload types defined in schema files ONLY
- [ ] 🔴 **STRICT**: Use `Parameters<Repository['method']>` for pass-through
- [ ] 🔴 **STRICT**: ALL query building in repository layer

### Standard Patterns
- [ ] Extend `BaseModelService`
- [ ] Define `UID_PREFIX` static constant (no trailing underscore)
- [ ] Inject `UtilityService`
- [ ] Use `this.generateUid()` for ID generation
- [ ] 🔴 **Critical**: Verify resource exists before Update/Delete
- [ ] Never throw `NotFoundException` (use `HttpError.notFound`)
- [ ] Catch `VersionConflictError` → rethrow as `HttpError.conflict()`
- [ ] Use `Promise.all` for independent async operations
- [ ] Use `PrismaService.$transaction` for multi-step workflows
- [ ] Prefer dedicated methods over exposing `include` parameters
- [ ] Mark orchestration methods with `@internal` JSDoc

---

## Common Patterns

📖 **See [references/service-examples.md](references/service-examples.md) for detailed examples of**:
- CRUD operations (Create, Read, Update, Delete, Bulk)
- Optimistic locking with version checks
- Including relations (dedicated methods vs flexibility)
- Orchestration services with transactions
- Context-agnostic design patterns
- ORM decoupling strategies

---

## Related Skills

- **[Repository Pattern NestJS](../repository-pattern-nestjs/SKILL.md)** - Data access patterns
- **[Backend Controller Pattern NestJS](../backend-controller-pattern-nestjs/SKILL.md)** - Controller patterns
- **[Database Patterns](../database-patterns/SKILL.md)** - Transactions, soft delete, locking
- **[Data Validation](../data-validation/SKILL.md)** - Input validation patterns
