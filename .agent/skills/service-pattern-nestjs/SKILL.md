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

Services act as the business logic layer. They should:

1. **Implement business logic** - Handle domain rules and operations
2. **Coordinate data access** - Call repositories to fetch/persist data
3. **Validate input** - Check data before persistence
4. **Handle errors** - Transform low-level errors to domain errors
5. **Coordinate operations** - Orchestrate multi-entity workflows
6. **Manage transactions** - Ensure data consistency

---

## Service Architecture

**Layered Pattern**:

```
Controller (HTTP boundary)
    ↓
Service (Business logic)
    ├─ Model Services (single entity)
    └─ Orchestration Services (multiple entities)
    ↓
Repository (Data access)
    ↓
Database
```

### Model Services

Handle CRUD operations for a single entity. Focused on single entity, simple CRUD operations, dependency on one or more repositories.

### Orchestration Services

Coordinate multiple entities for complex workflows. Handle complex business workflows, use transactions for atomicity.

---

## Model Service Structure

🔴 **Critical**: Extend `BaseModelService<T>` for standard CRUD.

```typescript
import { Injectable } from '@nestjs/common';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class UserService extends BaseModelService {
  // UID_PREFIX has NO trailing underscore (e.g., 'user', not 'user_')
  static readonly UID_PREFIX = 'user';
  protected readonly uidPrefix = UserService.UID_PREFIX;

  constructor(
    private readonly userRepository: UserRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }
}
```

---

## Avoiding ORM Coupling in Services

🔴 **Critical**: Services MUST NEVER import or use Prisma types in method signatures or business logic.

**Why**: We use the repository pattern to encapsulate all database concerns. Services should be completely decoupled from the ORM to allow changing the database layer without touching business logic.

### Rule 1: Define Payload Types in Schema Files

Schema files MAY use `Prisma.*` types to **define** payload types:

```typescript
// ✅ ALLOWED: In schema file
import type { Prisma } from '@prisma/client';

export type CreateTaskTemplatePayload = Omit<
  Prisma.TaskTemplateCreateInput,
  'uid' | 'version'
> & {
  uid?: string;
  currentSchema: any;
};
```

### Rule 2: Services Import Payload Types, NOT Prisma Types

```typescript
// ✅ GOOD: Service imports payload type from schema
import type { CreateTaskTemplatePayload } from './schemas/task-template.schema';

async createTemplateWithSnapshot(
  payload: CreateTaskTemplatePayload,
): Promise<TaskTemplate> {
  return this.repository.create({
    ...payload,
    uid: this.generateUid(),
  });
}
```

```typescript
// ❌ BAD: Service imports Prisma types
import { Prisma } from '@prisma/client';

async create(payload: Prisma.TaskTemplateCreateInput): Promise<TaskTemplate> {
  // ...
}
```

### Rule 3: Use Parameters<Repo['method']> for Pass-Through

For methods that simply pass arguments to the repository, use `Parameters<>` to match the repository signature:

```typescript
// ✅ GOOD: Service signature matches repository
async getTaskTemplates(
  ...args: Parameters<TaskTemplateRepository['findPaginated']>
): Promise<{ data: TaskTemplate[]; total: number }> {
  return this.repository.findPaginated(...args);
}

async findOne(
  ...args: Parameters<TaskTemplateRepository['findOne']>
): Promise<TaskTemplate | null> {
  return this.repository.findOne(...args);
}
```

**Benefits**:
- Service has zero Prisma imports
- Service signature automatically matches repository
- Changing ORM only requires updating repository
- Service tests don't need to mock Prisma types

### Rule 4: Repository Owns Where-Clause Building

The repository layer is responsible for building ORM-specific where clauses. Services pass domain-level parameters:

```typescript
// ✅ GOOD: Repository accepts domain parameters
// Repository method signature:
async findPaginated(params: {
  skip?: number;
  take?: number;
  name?: string;
  uid?: string;
  includeDeleted?: boolean;
  studioUid?: string;
  orderBy?: 'asc' | 'desc';
}): Promise<{ data: TaskTemplate[]; total: number }>
```

The repository then builds the Prisma where clause internally:

```typescript
// Inside repository:
const where: Prisma.TaskTemplateWhereInput = {};

if (!includeDeleted) {
  where.deletedAt = null;
}

if (name) {
  where.name = { contains: name, mode: 'insensitive' };
}

if (studioUid) {
  where.studio = { uid: studioUid };
}
```

---

## CRUD Operations

### Create with ID Generation

```typescript
async createUser(data: CreateUserDto): Promise<User> {
  return this.userRepository.create({
    uid: this.generateUid(), // Helper from BaseModelService
    email: data.email,
    name: data.name,
  });
}
```

### Read with Verification

```typescript
async getUserById(uid: string): Promise<User> {
  const user = await this.userRepository.findByUid(uid);
  if (!user) throw HttpError.notFound('User', uid);
  return user;
}
```

### Update - Verify Before Modify Pattern

🔴 **Critical**: Always check existence before mutating.

```typescript
async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
  await this.getUserById(uid); // Ensure exists
  return this.userRepository.update({ uid }, data);
}
```

### Delete with Verification

```typescript
async deleteUser(uid: string): Promise<void> {
  // 1. Verify existence (throws 404 if missing)
  await this.getUserById(uid);

  // 2. Perform operation
  await this.userRepository.softDelete({ uid });
}
```

### Bulk Operations

🟡 **Recommended**: Use Repository bulk methods, DO NOT loop in Service.

```typescript
async createManyUsers(users: CreateUserDto[]) {
  // Map DTOs to internal structure (e.g. add UIDs)
  const data = users.map(u => ({
    ...u,
    uid: this.generateUid()
  }));
  
  // Single DB Call
  return this.userRepository.createMany(data);
}
```

---

## Optimistic Locking Pattern

🟡 **Recommended**: For versioned entities, use version checks to prevent concurrent update conflicts.

```typescript
async updateTemplateWithSnapshot(
  where: Parameters<TaskTemplateRepository['updateWithVersionCheck']>[0],
  payload: Parameters<TaskTemplateRepository['updateWithVersionCheck']>[1],
): Promise<TaskTemplate> {
  if (payload.currentSchema && !this.validateSchema(payload.currentSchema)) {
    throw HttpError.badRequest('Invalid schema');
  }

  try {
    if (payload.currentSchema) {
      const newVersion = (payload.version as number) + 1;
      return await this.repository.updateWithVersionCheck(where, {
        name: payload.name,
        description: payload.description,
        currentSchema: payload.currentSchema,
        version: newVersion,
        snapshots: {
          create: {
            version: newVersion,
            schema: payload.currentSchema,
          },
        },
      });
    }

    return await this.repository.update(where, {
      name: payload.name,
      description: payload.description,
    });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      throw HttpError.conflict(
        `Record is out of date. Please refresh your record and try again.`,
      );
    }
    throw error;
  }
}
```

---

## Including Relations

**Question**: Should services expose `include` parameters?

**Short Answer**: Avoid it when possible, but it's acceptable for internal orchestration APIs.

### Recommended Pattern: Dedicated Methods

```typescript
// ✅ GOOD: Dedicated methods for different data shapes
async getTaskById(uid: string): Promise<Task>
async getTaskWithAssignee(uid: string): Promise<Task & { assignee: User }>
async getTaskWithTemplate(uid: string): Promise<Task & { template: TaskTemplate }>
```

### Acceptable Pattern: Internal Orchestration API

```typescript
// ✅ ACCEPTABLE: For orchestration services that need flexibility
/**
 * @internal
 * Internal method for orchestration services.
 * Controllers should use dedicated methods like getTaskWithAssignee().
 */
async findOne(
  ...args: Parameters<TaskRepository['findOne']>
): Promise<Task | null> {
  return this.taskRepository.findOne(...args);
}
```

**When to use each**:
- **Dedicated methods**: For controller-facing APIs (preferred)
- **Parameters spread**: For internal flexibility (acceptable, mark as @internal)

---

## Orchestration Services

🔴 **Critical**: Coordinate multiple services/repositories using Transactions.

See **[Database Patterns](database-patterns/SKILL.md)** for transaction rules.

```typescript
// Example: Creating a Show implies creating Assignments
async createShowWithAssignments(data: CreateShowDto) {
  return this.prismaService.$transaction(async (tx) => {
    // 1. Create Parent
    const show = await this.showService.createShow({ ...data, tx });
    
    // 2. Create Children
    await this.assignmentService.createAssignments(show.id, data.assignments, tx);
    
    return show;
  });
}
```

---

## Best Practices Checklist

- [ ] Extend `BaseModelService`
- [ ] Define `UID_PREFIX` static constant (no trailing underscore)
- [ ] Inject `UtilityService`
- [ ] Use `this.generateUid()`
- [ ] 🔴 **Critical**: Define Payload types in schema files (not in service)
- [ ] 🔴 **Critical**: NEVER import or use `Prisma.*` types in service method signatures
- [ ] 🔴 **Critical**: Use `Parameters<Repository['methodName']>` for pass-through methods
- [ ] 🔴 **Critical**: Delegate filter building to repository layer (not service)
- [ ] 🔴 **Critical**: Verify resource exists before Update/Delete
- [ ] Use `HttpError` for all exceptions
- [ ] Use `Promise.all` for independent async tasks
- [ ] Use `PrismaService.$transaction` for multi-step workflows
- [ ] 🔴 **Critical**: Never throw `NotFoundException` directly (use `HttpError.notFound`)
- [ ] Catch `VersionConflictError` and rethrow as `HttpError.conflict()`
- [ ] 🟡 **Recommended**: Prefer dedicated methods over exposing `include` parameters
- [ ] Mark methods with `@internal` JSDoc if they're for orchestration only

---

## Related Skills

- **[Repository Pattern NestJS](repository-pattern-nestjs/SKILL.md)** - Data access patterns
- **[Backend Controller Pattern NestJS](backend-controller-pattern-nestjs/SKILL.md)** - Controller patterns
- **[Database Patterns](database-patterns/SKILL.md)** - Transactions, soft delete, locking
- **[Data Validation](data-validation/SKILL.md)** - Input validation patterns
