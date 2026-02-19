# NestJS Service Pattern Examples

This file contains detailed code examples for service implementation patterns. Refer to the main SKILL.md for rules and best practices.

## Model Service Example

**File**: [task-template.service.ts](file:///Users/allenlin/Desktop/projects/eridu-services/apps/erify_api/src/models/task-template/task-template.service.ts)

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

  // Pass-through method using Parameters<Repo['method']>
  async getTaskTemplates(
    ...args: Parameters<TaskTemplateRepository['findPaginated']>
  ): Promise<{ data: TaskTemplate[]; total: number }> {
    return this.repository.findPaginated(...args);
  }

  // Pass-through method
  async findOne(
    ...args: Parameters<TaskTemplateRepository['findOne']>
  ): Promise<TaskTemplate | null> {
    return this.repository.findOne(...args);
  }

  // Create method using payload type from schema file
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
          `Record is out of date. Please refresh your record and try again.`,
        );
      }
      throw error;
    }
  }

  // Soft delete with existence check
  async softDelete(
    ...args: Parameters<TaskTemplateRepository['softDelete']>
  ): Promise<void> {
    await this.repository.softDelete(...args);
  }

  private validateSchema(schema: any): boolean {
    try {
      TemplateSchemaValidator.parse(schema);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## Schema File with Payload Types

**File**: [task-template.schema.ts](file:///Users/allenlin/Desktop/projects/eridu-services/apps/erify_api/src/models/task-template/schemas/task-template.schema.ts)

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

import { TemplateSchemaValidator } from '@eridu/api-types/task-management';

import type { Prisma } from '@prisma/client';

// Response DTO
export const taskTemplateDto = z.object({
  uid: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currentSchema: TemplateSchemaValidator,
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Create DTO (for controller)
export const createStudioTaskTemplateDto = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  schema: TemplateSchemaValidator,
});

export class CreateStudioTaskTemplateDto extends createZodDto(
  createStudioTaskTemplateDto,
) {}

// Update DTO (for controller)
export const updateStudioTaskTemplateDto = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  schema: TemplateSchemaValidator.optional(),
  version: z.number(),
});

export class UpdateStudioTaskTemplateDto extends createZodDto(
  updateStudioTaskTemplateDto,
) {}

// Service Payload Type (for service layer)
export type CreateTaskTemplatePayload = Omit<
  Prisma.TaskTemplateCreateInput,
  'uid' | 'version'
> & {
  uid?: string;
  currentSchema: any;
};

// List Query DTO
export const listTaskTemplatesQueryDto = z.object({
  skip: z.coerce.number().optional(),
  take: z.coerce.number().optional(),
  name: z.string().optional(),
  uid: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
});

export class ListTaskTemplatesQueryDto extends createZodDto(
  listTaskTemplatesQueryDto,
) {}
```

---

## Orchestration Service Example

> **Note**: Transactions use the `@Transactional()` decorator via CLS (Continuation-Local Storage).
> The `PrismaService` is auto-injected into the active transaction context — no `tx` parameter passing.
> See `database-patterns/SKILL.md` for the full transaction pattern.

```typescript
import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ShowService } from '@/models/show/show.service';
import { AssignmentService } from '@/models/assignment/assignment.service';

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly assignmentService: AssignmentService,
  ) {}

  @Transactional()
  async createShowWithAssignments(data: CreateShowDto) {
    // No `tx` parameter — CLS propagates the transaction automatically
    const show = await this.showService.createShow(data);
    await this.assignmentService.createAssignments(show.id, data.assignments);
    return show;
  }

  @Transactional()
  async publishSchedule(scheduleId: string) {
    const schedule = await this.scheduleService.getById(scheduleId);
    await this.showService.deleteBySchedule(scheduleId);
    const shows = await this.showService.createMany(
      schedule.shows.map(s => ({ ...s, scheduleId })),
    );
    await this.scheduleService.updateStatus(scheduleId, 'published');
    return shows;
  }
}
```

---

## CRUD Operation Examples

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

### Read — Return null, let Controller throw 404

```typescript
// ✅ CORRECT: Service returns null, Controller calls ensureResourceExists()
async getUserById(uid: string): Promise<User | null> {
  return this.userRepository.findOne({ uid, deletedAt: null });
}

// ❌ WRONG: Service throws HTTP exception
async getUserById(uid: string): Promise<User> {
  const user = await this.userRepository.findByUid(uid);
  if (!user) throw HttpError.notFound('User', uid); // ← Never do this in service
  return user;
}
```

### Update — Controller verifies first, then service updates

```typescript
// ✅ CORRECT: Service trusts caller verified existence
async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
  return this.userRepository.update({ uid }, data);
}

// In Controller:
// const user = await this.userService.getUserById(id);
// this.ensureResourceExists(user, 'User', id);  ← Controller throws 404
// return this.userService.updateUser(id, dto);
```

### Delete — Controller verifies first, then service deletes

```typescript
// ✅ CORRECT: Service trusts caller verified existence
async deleteUser(uid: string): Promise<void> {
  await this.userRepository.softDelete({ uid });
}

// In Controller:
// const user = await this.userService.getUserById(id);
// this.ensureResourceExists(user, 'User', id);  ← Controller throws 404
// await this.userService.deleteUser(id);
```

### Bulk Operations

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

## Including Relations - Patterns

### Anti-Pattern: Public Service API with Include

```typescript
// ❌ DISCOURAGED: Public service method exposes Prisma include
async getTaskById(uid: string, include?: Prisma.TaskInclude): Promise<Task> {
  const task = await this.taskRepository.findByUid(uid, include);
  if (!task) throw HttpError.notFound('Task', uid);
  return task;
}
```

**Problems**:
- Couples service API to Prisma
- Controllers must know Prisma include syntax
- Hard to change ORM later

### Recommended Pattern: Dedicated Methods

```typescript
// ✅ GOOD: Dedicated methods for different data shapes
async getTaskById(uid: string): Promise<Task> {
  const task = await this.taskRepository.findByUid(uid);
  if (!task) throw HttpError.notFound('Task', uid);
  return task;
}

async getTaskWithAssignee(uid: string): Promise<Task & { assignee: User }> {
  const task = await this.taskRepository.findByUid(uid, { assignee: true });
  if (!task) throw HttpError.notFound('Task', uid);
  return task;
}

async getTaskWithTemplate(uid: string): Promise<Task & { template: TaskTemplate }> {
  const task = await this.taskRepository.findByUid(uid, { template: true });
  if (!task) throw HttpError.notFound('Task', uid);
  return task;
}
```

### Acceptable Pattern: Internal Orchestration API

```typescript
// ✅ ACCEPTABLE: For orchestration services that need flexibility
// Mark as internal with JSDoc comment
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
- **Include parameter**: For orchestration service-to-service calls (acceptable)
- **Parameters spread**: For internal flexibility (acceptable, mark as @internal)
