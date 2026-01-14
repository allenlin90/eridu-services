---
name: service-pattern-nestjs
description: Provides NestJS-specific service implementation patterns for erify_api. Use when implementing Model Services, Orchestration Services, CRUD operations, and business logic with NestJS decorators. Includes error handling with HttpError utility and dependency injection patterns.
---

# Service Pattern - NestJS Implementation

NestJS-specific service patterns. For general principles, see **service-pattern/SKILL.md**.

## Model Service Structure

**Pattern**: Extend `BaseModelService<T>` for CRUD services

```typescript
import { Injectable } from '@nestjs/common';
import { BaseModelService } from '@/common/services/base-model.service';
import { HttpError } from '@/common/errors/http-error.util';

@Injectable()
export class UserService extends BaseModelService<User> {
  // UID_PREFIX has NO trailing underscore
  static readonly UID_PREFIX = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly utilityService: UtilityService,
  ) {
    super();
  }
}
```

**Key Rules**:
- ✅ Extend `BaseModelService<T>` for model services
- ✅ Define `UID_PREFIX` as static readonly constant (no trailing underscore)
- ✅ Inject repository and `UtilityService`
- ❌ Never use trailing underscore in UID_PREFIX

## CRUD Operations Implementation

### Create

```typescript
async createUser(data: CreateUserDto): Promise<User> {
  const user = await this.userRepository.create({
    uid: this.utilityService.generateBrandedId(UserService.UID_PREFIX),
    email: data.email,
    name: data.name,
    isBanned: false,
  });
  return user;
}
```

### Read

```typescript
async getUserById(uid: string): Promise<User> {
  const user = await this.userRepository.findByUid(uid);
  if (!user) {
    throw HttpError.notFound('User', uid);
  }
  return user;
}

async listUsers(params: { skip: number; take: number }): Promise<User[]> {
  return this.userRepository.findMany({
    where: { deletedAt: null },
    skip: params.skip,
    take: params.take,
    orderBy: { createdAt: 'desc' },
  });
}

async countUsers(): Promise<number> {
  return this.userRepository.count({
    where: { deletedAt: null },
  });
}
```

### Update

```typescript
async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
  // Always verify resource exists first
  await this.getUserById(uid);

  return this.userRepository.update(
    { uid, deletedAt: null },
    {
      email: data.email,
      name: data.name,
    },
  );
}
```

### Delete

```typescript
async deleteUser(uid: string): Promise<void> {
  // Verify resource exists
  await this.getUserById(uid);

  await this.userRepository.softDelete({
    uid,
    deletedAt: null,
  });
}
```

## Error Handling with HttpError

**Always use `HttpError` utility, never NestJS exceptions**:

```typescript
import { HttpError } from '@/common/errors/http-error.util';

// Not found error
if (!user) {
  throw HttpError.notFound('User', uid);
}

// Bad request error
if (!isValidEmail(email)) {
  throw HttpError.badRequest('Invalid email format');
}

// Bad request with details
if (!validationResult.isValid) {
  throw HttpError.badRequestWithDetails('Validation failed', {
    errors: validationResult.errors,
  });
}

// Conflict error (version mismatch, duplicates)
if (version !== currentVersion) {
  throw HttpError.conflict('Version mismatch. Expected 5, got 3');
}

// Other status codes
throw HttpError.unauthorized('Authentication required');
throw HttpError.forbidden('Access denied');
throw HttpError.unprocessableEntity('Invalid data format');
```

**Available HttpError Methods**:

| Method | Status | Use Case |
|--------|--------|----------|
| `notFound(resource, identifier?)` | 404 | Resource not found |
| `badRequest(message)` | 400 | Invalid input validation |
| `badRequestWithDetails(message, details)` | 400 | Validation with error details |
| `conflict(message)` | 409 | Version mismatch, duplicates |
| `unauthorized(message)` | 401 | Authentication required |
| `forbidden(message)` | 403 | Access denied |
| `unprocessableEntity(message)` | 422 | Invalid data format |

**Key Rules**:
- ✅ Always use `HttpError` utility
- ✅ Include resource name and identifier
- ✅ Provide actionable error messages
- ❌ Never throw NestJS exceptions directly
- ❌ Never expose sensitive implementation details

## Orchestration Services

**Pattern**: Coordinate multiple services with transactions

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly showMcService: ShowMcService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly prismaService: PrismaService,
  ) {}

  async createShowWithAssignments(
    data: CreateShowWithAssignmentsDto,
  ): Promise<Show> {
    return this.prismaService.$transaction(async (tx) => {
      // Step 1: Create show
      const show = await this.showService.createShow({
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        clientId: data.clientId,
      });

      // Step 2: Create MC assignments
      if (data.mcUids?.length) {
        for (const mcUid of data.mcUids) {
          await this.showMcService.addMcToShow(show.id, mcUid);
        }
      }

      // Step 3: Create platform assignments
      if (data.platformUids?.length) {
        for (const platformUid of data.platformUids) {
          await this.showPlatformService.addPlatformToShow(
            show.id,
            platformUid,
          );
        }
      }

      return show;
    });
  }
}
```

**Key Rules**:
- ✅ Inject multiple services/repositories
- ✅ Use `PrismaService.$transaction()` for atomicity
- ✅ Validate before multi-step operations
- ✅ Return complete result with all relations
- ❌ Don't call external APIs in transactions
- ❌ Don't do long-running operations in transactions

## Dependency Injection

**Constructor injection pattern**:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly utilityService: UtilityService,
    private readonly configService: ConfigService<Env>,
  ) {}
}
```

**In module**:

```typescript
@Module({
  imports: [UtilityModule, ConfigModule], // Import dependencies
  providers: [UserRepository, UserService], // Provide service
  exports: [UserService], // Export for other modules
})
export class UserModule {}
```

## Pagination in Services

```typescript
async listUsers(params: {
  page?: number;
  limit?: number;
}): Promise<{ data: User[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const skip = (page - 1) * limit;

  // Query data and count in parallel
  const [data, total] = await Promise.all([
    this.userRepository.findMany({
      where: { deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.userRepository.count({
      where: { deletedAt: null },
    }),
  ]);

  return { data, total };
}
```

**Key Rules**:
- ✅ Use `Promise.all()` for data + count queries
- ✅ Provide sensible defaults (page: 1, limit: 10)
- ✅ Calculate skip correctly: `(page - 1) * limit`
- ✅ Include total count in response

## Bulk Operations

**Never loop, use batch operations**:

```typescript
// ❌ WRONG: Multiple database calls
async createManyUsers(users: CreateUserDto[]): Promise<User[]> {
  const results = [];
  for (const user of users) {
    const created = await this.createUser(user);
    results.push(created);
  }
  return results;
}

// ✅ CORRECT: Bulk operation
async createManyUsers(users: CreateUserDto[]): Promise<User[]> {
  return this.userRepository.createMany(
    users.map((user) => ({
      ...user,
      uid: this.utilityService.generateBrandedId(UserService.UID_PREFIX),
    })),
  );
}
```

## Service Testing

**Unit test example** (with mocked repository):

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;
  let utility: UtilityService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            create: jest.fn(),
            findByUid: jest.fn(),
          },
        },
        {
          provide: UtilityService,
          useValue: {
            generateBrandedId: jest.fn().mockReturnValue('user_123'),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repository = module.get(UserRepository);
    utility = module.get(UtilityService);
  });

  describe('createUser', () => {
    it('should create user with generated UID', async () => {
      const data: CreateUserDto = {
        email: 'test@example.com',
        name: 'Test User',
      };

      jest.spyOn(repository, 'create').mockResolvedValue({
        id: 1n,
        uid: 'user_123',
        ...data,
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await service.createUser(data);

      expect(utility.generateBrandedId).toHaveBeenCalledWith('user');
      expect(repository.create).toHaveBeenCalled();
      expect(result.uid).toBe('user_123');
    });
  });
});
```

## Verify Before Modify Pattern

**Always check resource exists before update/delete**:

```typescript
async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
  // ✅ Verify first
  const existingUser = await this.getUserById(uid);

  // Then update
  return this.userRepository.update(
    { uid, deletedAt: null },
    {
      email: data.email,
      name: data.name,
    },
  );
}

async deleteUser(uid: string): Promise<void> {
  // ✅ Verify exists
  await this.getUserById(uid);

  // Then delete
  await this.userRepository.softDelete({
    uid,
    deletedAt: null,
  });
}
```

## Query with Relations

```typescript
async getUserWithStudio(uid: string): Promise<User & { studio?: Studio }> {
  return this.userRepository.findByUid(uid, {
    studio: true, // Include related studio
  });
}

async listUsersWithStudios(params: {
  page?: number;
  limit?: number;
}): Promise<(User & { studio?: Studio })[]> {
  return this.userRepository.findMany({
    where: { deletedAt: null },
    include: {
      studio: true,
    },
    skip: (params.page ?? 1 - 1) * (params.limit ?? 10),
    take: params.limit ?? 10,
  });
}
```

## Best Practices Checklist

- [ ] Extend `BaseModelService<T>` for model services
- [ ] Define `UID_PREFIX` without trailing underscore
- [ ] Use `UtilityService.generateBrandedId()` for UID generation
- [ ] Always verify resource exists before update/delete
- [ ] Use `HttpError` utility for all errors (never NestJS exceptions)
- [ ] Include resource name in error messages
- [ ] Use `Promise.all()` for parallel queries
- [ ] Use `PrismaService.$transaction()` for multi-step operations
- [ ] Implement pagination with proper defaults
- [ ] Use bulk operations instead of loops
- [ ] Keep model services focused on single entity
- [ ] Use orchestration services for multi-entity operations
- [ ] All services injectable and testable
- [ ] No circular dependencies between services
- [ ] Proper error context and actionable messages

## Related Skills

- **service-pattern/SKILL.md** - General service principles
- **repository-pattern-nestjs/SKILL.md** - Data access layer
- **backend-controller-pattern-nestjs/SKILL.md** - Service consumption
- **authentication-authorization-backend/SKILL.md** - Auth patterns
