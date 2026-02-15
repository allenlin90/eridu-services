---
name: service-pattern-nestjs
description: Provides NestJS-specific service implementation patterns. This skill should be used when implementing Model Services, Orchestration Services, or business logic with NestJS decorators.
---

# Service Pattern - NestJS Implementation

**Implementation guide for NestJS Services in Eridu.**

For core database concepts (Transactions, Bulk Ops), see **[Database Patterns](database-patterns/SKILL.md)**.
For general service architecture, see **[Service Pattern](service-pattern/SKILL.md)**.

## Model Service Structure

**Extend `BaseModelService<T>` for standard CRUD**.

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

## Generic Service Payload Pattern

**Define the Service Payload type in your schema file.**

This ensures the type is reused across Controllers and the Service, and decouples the Service from specific Prisma Input types.

**1. Define Payload in `schemas/model.schema.ts`**

```typescript
// apps/erify_api/src/models/user/schemas/user.schema.ts
import type { Prisma } from '@prisma/client';

// Define the payload type relative to Prisma's CreateInput
// Make fields optional that the Service handles (uid, version, timestamps)
export type CreateUserPayload = Omit<Prisma.UserCreateInput, 'uid'> & { 
  uid?: string; 
};
```

**2. Implement Service with Payload**

```typescript
// apps/erify_api/src/models/user/user.service.ts
import type { CreateUserPayload } from './schemas/user.schema';

@Injectable()
export class UserService extends BaseModelService {
  // ...

  // Base Create Method: Accept the Payload
  async create(payload: CreateUserPayload): Promise<User> {
    return this.userRepository.create({
      ...payload,
      // Provide defaults for omitted/optional fields
      uid: payload.uid ?? this.generateUid(),
    });
  }
}
```

**3. Controller Translates DTO → Payload**

```typescript
// apps/erify_api/src/studios/studio-task-template/studio-task-template.controller.ts

@Post()
@ZodResponse(taskTemplateDto, HttpStatus.CREATED)
async create(
  @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
  @Body() createStudioTaskTemplateDto: CreateStudioTaskTemplateDto,
) {
  const { name, description, schema } = createStudioTaskTemplateDto;

  // Controller translates DTO → Service Payload
  return this.taskTemplateService.createTemplateWithSnapshot({
    name,
    description,
    currentSchema: schema,
    studio: { connect: { uid: studioId } }, // Connect relation from route param
  });
}
```

## Avoiding ORM Coupling in Services

**Critical Rule**: Services MUST NOT import or use ORM-specific types (e.g., `Prisma.*`).

### Anti-Pattern: Service Coupled to Prisma

```typescript
// ❌ BAD: Service method uses Prisma types
import { Prisma } from '@prisma/client';

async getTaskTemplates(params: {
  where?: Prisma.TaskTemplateWhereInput;  // ❌ ORM coupling
  orderBy?: Prisma.TaskTemplateOrderByWithRelationInput;  // ❌ ORM coupling
}): Promise<{ data: TaskTemplate[]; total: number }> {
  // Service builds Prisma where clause
  const where: Prisma.TaskTemplateWhereInput = { ...params.where };
  // ... filter building logic
}
```

### Correct Pattern: Service Uses Domain Types

```typescript
// ✅ GOOD: Service method uses domain-level parameters
async getTaskTemplates(...args: Parameters<TaskTemplateRepository['findPaginated']>): Promise<{ data: TaskTemplate[]; total: number }> {
  return this.taskTemplateRepository.findPaginated(...args);
}
```

**Benefits**:
- Service has zero ORM imports
- Service signature matches repository signature
- Changing ORM only requires updating repository
- Service tests don't need to mock Prisma types

### Repository Handles ORM Logic

```typescript
// Repository accepts domain parameters and builds ORM queries
async findPaginated(params: {
  skip?: number;
  take?: number;
  name?: string;
  uid?: string;
  includeDeleted?: boolean;
  studioUid?: string;
  orderBy?: 'asc' | 'desc';
}): Promise<{ data: TaskTemplate[]; total: number }> {
  const { skip, take, name, uid, includeDeleted, studioUid, orderBy } = params;

  // Repository builds Prisma where clause
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

  const [data, total] = await Promise.all([
    this.model.findMany({
      skip,
      take,
      where,
      orderBy: orderBy ? { createdAt: orderBy } : undefined,
    }),
    this.model.count({ where }),
  ]);

  return { data, total };
}
```

## CRUD Operations

**Implement business logic here.**

```typescript
// Create with ID generation
async createUser(data: CreateUserDto): Promise<User> {
  return this.userRepository.create({
    uid: this.generateUid(), // Helper from BaseModelService
    email: data.email,
    name: data.name,
  });
}

// Read with verification
async getUserById(uid: string): Promise<User> {
  const user = await this.userRepository.findByUid(uid);
  if (!user) throw HttpError.notFound('User', uid);
  return user;
}

// Update (See "Verify Before Modify" pattern)
async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
  await this.getUserById(uid); // Ensure exists
  return this.userRepository.update({ uid }, data);
}
```

## Optimistic Locking Pattern

**For versioned entities, use version checks to prevent concurrent update conflicts.**

```typescript
async updateTemplateWithSnapshot(
  where: Prisma.TaskTemplateWhereUniqueInput & { version?: number },
  payload: Prisma.TaskTemplateUpdateInput & { version?: number; currentSchema?: any },
): Promise<TaskTemplate> {
  if (payload.currentSchema && !this.validateSchema(payload.currentSchema)) {
    throw HttpError.badRequest('Invalid schema');
  }

  try {
    if (payload.currentSchema) {
      const newVersion = (payload.version as number) + 1;
      return await this.repository.updateWithVersionCheck(
        where,
        {
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
        },
      );
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

## Orchestration Services

**Coordinate multiple services/repositories using Transactions.**
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

## Verify Before Modify Pattern

**Always check existence before mutating.**

```typescript
async deleteUser(uid: string): Promise<void> {
  // 1. Verify existence (throws 404 if missing)
  await this.getUserById(uid);

  // 2. Perform operation
  await this.userRepository.softDelete({ uid });
}
```

## Pagination and Advanced Filtering

**Execute Count and Data queries in parallel and build complex filters.**

```typescript
async getTaskTemplates(params: {
  skip?: number;
  take?: number;
  name?: string;
  uid?: string;
  includeDeleted?: boolean;
  where?: Prisma.TaskTemplateWhereInput;
  orderBy?: Prisma.TaskTemplateOrderByWithRelationInput;
}): Promise<{ data: TaskTemplate[]; total: number }> {
  const { skip, take, name, uid, includeDeleted, where: extraWhere, orderBy } = params;

  const where: Prisma.TaskTemplateWhereInput = { ...extraWhere };

  if (!includeDeleted) {
    where.deletedAt = null;
  }

  if (name) {
    where.name = {
      contains: name,
      mode: 'insensitive',
    };
  }

  if (uid) {
    where.uid = {
      contains: uid,
      mode: 'insensitive',
    };
  }

  const [data, total] = await Promise.all([
    this.repository.findMany({
      skip,
      take,
      where,
      orderBy,
    }),
    this.repository.count(where),
  ]);

  return { data, total };
}
```

## Bulk Operations

**Use Repository bulk methods, DO NOT loop in Service.**

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

## Best Practices Checklist

- [ ] Extend `BaseModelService`
- [ ] Define `UID_PREFIX` static constant
- [ ] Inject `UtilityService`
- [ ] Use `this.generateUid()`
- [ ] **Verify** resource exists before Update/Delete
- [ ] Use `HttpError` for all exceptions
- [ ] Use `Promise.all` for independent async tasks
- [ ] Use `PrismaService.$transaction` for multi-step workflows
- [ ] **Never** throw `NotFoundException` directly (use `HttpError.notFound`)
- [ ] Catch `VersionConflictError` and rethrow as `HttpError.conflict()`
- [ ] **Never** import or use `Prisma.*` types in service methods
- [ ] Use `Parameters<Repository['methodName']>` to match repository signatures
- [ ] Delegate filter building to repository layer
