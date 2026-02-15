# NestJS Service Pattern - Detailed Examples

This file contains comprehensive code examples for service implementation patterns. Refer to the main SKILL.md for core principles and rules.

---

## Table of Contents

1. [Context-Agnostic Examples](#context-agnostic-examples)
2. [Error Handling Patterns](#error-handling-patterns)
3. [ORM Decoupling Examples](#orm-decoupling-examples)
4. [CRUD Operations](#crud-operations)
5. [Optimistic Locking](#optimistic-locking)
6. [Including Relations](#including-relations)
7. [Orchestration Services](#orchestration-services)

---

## Context-Agnostic Examples

Services must be callable from **any context** without modification.

### ✅ GOOD: Context-Agnostic Service

```typescript
@Injectable()
export class TaskService extends BaseModelService {
  static readonly UID_PREFIX = 'task';
  protected readonly uidPrefix = TaskService.UID_PREFIX;

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly userRepository: UserRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  // Clean contract: payload in, Task out
  // Callable from: HTTP controllers, CLI, jobs, GraphQL, other services
  async create(payload: CreateTaskPayload): Promise<Task> {
    const task = await this.taskRepository.create({
      ...payload,
      uid: this.generateUid(),
    });
    return task;
  }

  // Domain operation - no transport knowledge
  async assignToUser(taskUid: string, userUid: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ uid: taskUid });
    if (!task) {
      throw HttpError.notFound('Task', taskUid);
    }

    const user = await this.userRepository.findOne({ uid: userUid });
    if (!user) {
      throw HttpError.notFound('User', userUid);
    }

    return this.taskRepository.update({
      where: { uid: taskUid },
      data: { assigneeId: user.id },
    });
  }

  // Domain query - reusable everywhere
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.taskRepository.findMany({ status });
  }
}
```

**Usage from different contexts**:

```typescript
// HTTP Controller
@Post()
async create(@Body() dto: CreateTaskDto) {
  const { name, description, assigneeId } = dto; // Filter DTO
  return this.taskService.create({ name, description, assigneeId });
}

// CLI Command
async seedTasks() {
  const task = await this.taskService.create({
    name: 'Sample Task',
    description: 'Seeded from CLI',
  });
  console.log(`Created task: ${task.uid}`);
}

// Background Job
async processPendingTasks() {
  const tasks = await this.taskService.getTasksByStatus('pending');
  for (const task of tasks) {
    await this.processTask(task);
  }
}

// Other Service
async createProjectWithTasks(project: Project, taskPayloads: CreateTaskPayload[]) {
  const tasks = await Promise.all(
    taskPayloads.map(payload => this.taskService.create(payload))
  );
  return { project, tasks };
}
```

### ❌ BAD: Context-Coupled Services

```typescript
// ❌ BAD: HTTP-coupled service
@Injectable()
export class TaskService {
  async create(req: Request, res: Response) {
    // Can't use in CLI, jobs, or other services
    const task = await this.taskRepository.create(req.body);
    res.status(201).json(task);
  }
}

// ❌ BAD: Knows about caller context
@Injectable()
export class TaskService {
  async create(
    payload: CreateTaskPayload,
    callerType: 'http' | 'cli' | 'job'
  ) {
    // Service shouldn't have different behavior based on caller
    if (callerType === 'http') {
      // HTTP-specific logic - violation!
    }
    return this.taskRepository.create(payload);
  }
}

// ❌ BAD: Takes entire DTO from controller
@Injectable()
export class TaskService {
  async create(dto: CreateTaskDto) {
    // Service now knows about HTTP DTO structure
    // Coupled to API layer changes
    return this.taskRepository.create(dto);
  }
}

// ❌ BAD: Returns HTTP-specific responses
@Injectable()
export class TaskService {
  async create(payload: CreateTaskPayload): Promise<HttpResponse> {
    const task = await this.taskRepository.create(payload);
    return {
      statusCode: 201,
      body: task,
    };
  }
}
```

---

## Error Handling Patterns

### Current Pattern: HttpError (Pragmatic)

**Used in this project for simplicity**:

```typescript
async getUserById(uid: string): Promise<User> {
  const user = await this.userRepository.findOne({ uid });
  if (!user) {
    throw HttpError.notFound('User', uid);  // ⚠️ HTTP-coupled
  }
  return user;
}

async updateUser(uid: string, data: UpdateUserPayload): Promise<User> {
  const user = await this.getUserById(uid); // Throws 404 if not found
  return this.userRepository.update({ uid }, data);
}
```

**Trade-offs**:
- ✅ **Simpler**: Less code, fewer exception classes
- ✅ **Direct**: No mapping layer needed in controllers
- ❌ **HTTP-coupled**: Services know about HTTP status codes
- ❌ **Less flexible**: Harder to reuse in non-HTTP contexts (CLI/jobs need to catch and remap)

### Ideal Pattern: Domain Exceptions (Context-Agnostic)

**More complex but fully decoupled**:

```typescript
// 1. Define domain exceptions
export class UserNotFoundError extends Error {
  constructor(public uid: string) {
    super(`User ${uid} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidUserDataError extends Error {
  constructor(public reason: string) {
    super(`Invalid user data: ${reason}`);
    this.name = 'InvalidUserDataError';
  }
}

// 2. Service throws domain exceptions
@Injectable()
export class UserService {
  async getUserById(uid: string): Promise<User> {
    const user = await this.userRepository.findOne({ uid });
    if (!user) {
      throw new UserNotFoundError(uid);  // ✅ Domain exception
    }
    return user;
  }

  async updateUser(uid: string, data: UpdateUserPayload): Promise<User> {
    if (!data.email?.includes('@')) {
      throw new InvalidUserDataError('Invalid email format');
    }
    const user = await this.getUserById(uid); // May throw UserNotFoundError
    return this.userRepository.update({ uid }, data);
  }
}

// 3. Controller maps domain exceptions → HTTP
@Controller('users')
export class UserController {
  @Get(':id')
  async getUser(@Param('id') id: string) {
    try {
      return await this.userService.getUserById(id);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);  // Map to 404
      }
      throw error;
    }
  }
}

// 4. CLI catches domain exceptions differently
async function seedUsers() {
  try {
    const user = await userService.getUserById('user_123');
    console.log('User found:', user);
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      console.warn(`User not found, creating new one...`);
      // Different handling in CLI context
    }
  }
}
```

**Trade-offs**:
- ✅ **Fully context-agnostic**: Works in HTTP, CLI, jobs without modification
- ✅ **Clear semantics**: Exception names describe business meaning
- ✅ **Better testability**: Easy to assert on specific exception types
- ❌ **More boilerplate**: Requires exception classes + mapping layer
- ❌ **Mapping in controllers**: Controllers need try/catch blocks

---

## ORM Decoupling Examples

### Rule 1: Schema Files Define Payloads (Prisma Allowed Here)

```typescript
// ✅ ALLOWED: In schema file (schemas/user.schema.ts)
import type { Prisma } from '@prisma/client';

export type CreateUserPayload = Omit<
  Prisma.UserCreateInput,
  'uid' | 'createdAt' | 'updatedAt'
> & {
  uid?: string;
};

export type UpdateUserPayload = Partial<
  Omit<Prisma.UserUpdateInput, 'uid' | 'createdAt' | 'updatedAt'>
>;

export type UserFilters = {
  email?: string;
  name?: string;
  isBanned?: boolean;
  studioId?: string;
};
```

### Rule 2: Services Import Payloads, NOT Prisma

```typescript
// ✅ GOOD: Service imports payload types from schema
import type { User } from '@prisma/client';  // ✅ Entity type OK
import type { CreateUserPayload, UpdateUserPayload, UserFilters } from './schemas';

@Injectable()
export class UserService extends BaseModelService {
  // ✅ Payload type from schema
  async create(payload: CreateUserPayload): Promise<User> {
    return this.userRepository.create({
      ...payload,
      uid: this.generateUid(),
    });
  }

  // ✅ Payload type from schema
  async update(uid: string, payload: UpdateUserPayload): Promise<User> {
    return this.userRepository.update({ uid }, payload);
  }

  // ✅ Domain filter type, not Prisma.WhereInput
  async findUsers(filters: UserFilters): Promise<User[]> {
    return this.userRepository.findMany(filters);
  }
}
```

```typescript
// ❌ BAD: Service imports Prisma types directly
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserService {
  // ❌ Direct Prisma type in signature
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.userRepository.create(data);
  }

  // ❌ Exposing Prisma WhereInput
  async findUsers(where: Prisma.UserWhereInput): Promise<User[]> {
    return this.userRepository.findMany({ where });
  }

  // ❌ Building Prisma queries in service
  async getActiveUsers(): Promise<User[]> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      isBanned: false,
    };
    return this.userRepository.findMany({ where });
  }
}
```

### Rule 3: Use Parameters<Repo['method']> for Pass-Through

```typescript
// ✅ GOOD: Pass-through methods with Parameters<>
@Injectable()
export class TaskTemplateService extends BaseModelService {
  // Service signature automatically matches repository
  // No Prisma imports needed
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
}
```

**Benefits**:
- ✅ Zero Prisma imports in service
- ✅ Service signature auto-updates when repository changes
- ✅ Easy to change ORM (only update repository)
- ✅ Service tests don't mock Prisma types

### Rule 4: Repository Builds Where Clauses

```typescript
// ✅ GOOD: Repository accepts domain parameters
// In repository:
async findMany(filters: {
  email?: string;
  name?: string;
  studioId?: string;
  includeDeleted?: boolean;
}): Promise<User[]> {
  // Repository builds Prisma query internally
  const where: Prisma.UserWhereInput = {};

  if (!filters.includeDeleted) {
    where.deletedAt = null;
  }

  if (filters.email) {
    where.email = { contains: filters.email, mode: 'insensitive' };
  }

  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }

  if (filters.studioId) {
    where.studioMemberships = {
      some: { studio: { uid: filters.studioId } },
    };
  }

  return this.prisma.user.findMany({ where });
}

// Service just passes domain parameters
async findUsers(filters: UserFilters): Promise<User[]> {
  return this.userRepository.findMany(filters);
}
```

```typescript
// ❌ BAD: Service builds Prisma queries
async findUsers(filters: UserFilters): Promise<User[]> {
  // Building Prisma-specific where clause in service
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
  };

  if (filters.email) {
    where.email = { contains: filters.email };
  }

  // This belongs in repository!
  return this.userRepository.findMany({ where });
}
```

---

## CRUD Operations

### Create with ID Generation

```typescript
async createUser(payload: CreateUserPayload): Promise<User> {
  return this.userRepository.create({
    ...payload,
    uid: this.generateUid(), // From BaseModelService
  });
}
```

### Read with Verification

```typescript
async getUserById(uid: string): Promise<User> {
  const user = await this.userRepository.findOne({ uid });
  if (!user) {
    throw HttpError.notFound('User', uid);
  }
  return user;
}

// Optional version
async findUserById(uid: string): Promise<User | null> {
  return this.userRepository.findOne({ uid });
}
```

### Update - Verify Before Modify Pattern

🔴 **Critical**: Always verify existence before mutating.

```typescript
async updateUser(uid: string, payload: UpdateUserPayload): Promise<User> {
  await this.getUserById(uid); // Throws 404 if not found
  return this.userRepository.update({ uid }, payload);
}
```

### Delete with Verification

```typescript
async deleteUser(uid: string): Promise<void> {
  await this.getUserById(uid); // Verify exists (throws 404)
  await this.userRepository.softDelete({ uid });
}
```

### Bulk Operations

🟡 **Recommended**: Use repository bulk methods, DO NOT loop in service.

```typescript
// ✅ GOOD: Single DB call
async createManyUsers(users: CreateUserPayload[]): Promise<User[]> {
  const data = users.map(u => ({
    ...u,
    uid: this.generateUid(),
  }));
  return this.userRepository.createMany(data);
}

// ❌ BAD: Looping in service
async createManyUsers(users: CreateUserPayload[]): Promise<User[]> {
  const created = [];
  for (const user of users) {
    // N database calls instead of 1!
    created.push(await this.create(user));
  }
  return created;
}
```

---

## Optimistic Locking

🟡 **Recommended**: For versioned entities, use version checks to prevent concurrent update conflicts.

```typescript
async updateTemplateWithSnapshot(
  where: Parameters<TaskTemplateRepository['updateWithVersionCheck']>[0],
  payload: Parameters<TaskTemplateRepository['updateWithVersionCheck']>[1],
): Promise<TaskTemplate> {
  // Validate business rules
  if (payload.currentSchema && !this.validateSchema(payload.currentSchema)) {
    throw HttpError.badRequest('Invalid schema');
  }

  try {
    if (payload.currentSchema) {
      const newVersion = (payload.version as number) + 1;

      // Update with version check + create snapshot
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

    // Simple update without snapshot
    return await this.repository.update(where, {
      name: payload.name,
      description: payload.description,
    });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      throw HttpError.conflict(
        `Record is out of date. Please refresh and try again.`,
      );
    }
    throw error;
  }
}
```

---

## Including Relations

**Question**: Should services expose `include` parameters?

**Short Answer**: Avoid when possible, but acceptable for internal orchestration.

### Recommended: Dedicated Methods

```typescript
// ✅ GOOD: Explicit methods for different data shapes
async getTaskById(uid: string): Promise<Task> {
  return this.taskRepository.findOne({ uid });
}

async getTaskWithAssignee(uid: string): Promise<Task & { assignee: User }> {
  return this.taskRepository.findOne({
    uid,
    include: { assignee: true },
  });
}

async getTaskWithTemplate(uid: string): Promise<Task & { template: TaskTemplate }> {
  return this.taskRepository.findOne({
    uid,
    include: { template: true },
  });
}

async getTaskWithAll(uid: string): Promise<Task & { assignee: User; template: TaskTemplate }> {
  return this.taskRepository.findOne({
    uid,
    include: { assignee: true, template: true },
  });
}
```

**Benefits**:
- ✅ Clear API - consumers know what they're getting
- ✅ Type-safe - return types are explicit
- ✅ No over-fetching - get exactly what you need

### Acceptable: Internal Orchestration API

```typescript
// ✅ ACCEPTABLE: For flexibility in orchestration services
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
- **Parameters spread**: For internal orchestration flexibility (mark as @internal)

---

## Orchestration Services

🔴 **Critical**: Coordinate multiple services/repositories using transactions.

### Example: Creating Show with Assignments

```typescript
@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly assignmentService: AssignmentService,
    private readonly prismaService: PrismaService,
  ) {}

  async createShowWithAssignments(
    payload: CreateShowPayload,
    assignments: CreateAssignmentPayload[],
  ): Promise<Show> {
    return this.prismaService.$transaction(async (tx) => {
      // 1. Create parent entity
      const show = await this.showService.create(payload, tx);

      // 2. Create related entities
      await this.assignmentService.createMany(
        assignments.map(a => ({ ...a, showId: show.id })),
        tx
      );

      return show;
    });
  }
}
```

### Example: Complex Multi-Step Workflow

```typescript
async processOrderCompletion(orderId: string): Promise<Order> {
  return this.prismaService.$transaction(async (tx) => {
    // 1. Update order status
    const order = await this.orderService.updateStatus(orderId, 'completed', tx);

    // 2. Create invoice
    const invoice = await this.invoiceService.createFromOrder(order, tx);

    // 3. Update inventory
    await this.inventoryService.decrementStock(order.items, tx);

    // 4. Send notifications (non-transactional, can fail)
    // Do this AFTER transaction commits
    await this.notificationService.sendOrderConfirmation(order);

    return order;
  });
}
```

**Best Practices**:
- ✅ Use transactions for atomic multi-step operations
- ✅ Pass transaction client to service methods
- ✅ Keep transactions focused and short
- ✅ Handle non-critical side effects (emails, notifications) AFTER transaction
- ✅ Document transaction boundaries with comments

---

## Complete Model Service Example

**Real implementation from codebase**:

```typescript
import { Injectable } from '@nestjs/common';
import { TaskTemplate } from '@prisma/client';

import { TemplateSchemaValidator } from '@eridu/api-types/task-management';

import type { CreateTaskTemplatePayload } from './schemas/task-template.schema';
import { TaskTemplateRepository } from './task-template.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class TaskTemplateService extends BaseModelService {
  static readonly UID_PREFIX = 'task_template';
  protected readonly uidPrefix = TaskTemplateService.UID_PREFIX;

  constructor(
    private readonly repository: TaskTemplateRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  // Pass-through with Parameters<>
  async getTaskTemplates(
    ...args: Parameters<TaskTemplateRepository['findPaginated']>
  ): Promise<{ data: TaskTemplate[]; total: number }> {
    return this.repository.findPaginated(...args);
  }

  // Pass-through with Parameters<>
  async findOne(
    ...args: Parameters<TaskTemplateRepository['findOne']>
  ): Promise<TaskTemplate | null> {
    return this.repository.findOne(...args);
  }

  // Create with payload type from schema
  async createTemplateWithSnapshot(
    payload: CreateTaskTemplatePayload,
  ): Promise<TaskTemplate> {
    if (!this.validateSchema(payload.currentSchema)) {
      throw HttpError.badRequest('Invalid schema');
    }

    return this.repository.create({
      ...payload,
      uid: this.generateUid(),
      version: 1,
      snapshots: {
        create: {
          version: 1,
          schema: payload.currentSchema,
        },
      },
    });
  }

  // Update with optimistic locking
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
          `Template is out of date. Please refresh and try again.`,
        );
      }
      throw error;
    }
  }

  // Business logic validation
  private validateSchema(schema: unknown): boolean {
    return TemplateSchemaValidator.safeParse(schema).success;
  }
}
```
