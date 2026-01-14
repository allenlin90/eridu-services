---
name: repository-pattern-nestjs
description: Provides Prisma-specific repository implementation patterns for erify_api using NestJS. Use when implementing repositories extending BaseRepository, handling soft deletes, managing Prisma queries, and implementing data access methods with type-safe operations.
---

# Repository Pattern - Prisma/NestJS Implementation

Prisma-specific repository patterns for NestJS. For general principles, see **repository-pattern/SKILL.md**.

## BaseRepository Extension

**Extend `BaseRepository<T, C, U, W>` for all repositories**:

```typescript
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserRepository extends BaseRepository<
  User,                             // T = Entity type
  Prisma.UserCreateInput,          // C = Create input
  Prisma.UserUpdateInput,          // U = Update input
  Prisma.UserWhereInput            // W = Where clause
> {
  constructor(private readonly prisma: PrismaService) {
    super(new UserModelWrapper(prisma));
  }
}
```

**Type Parameters**:
- `T` = Prisma model type
- `C` = Create input type
- `U` = Update input type
- `W` = Where clause type

## Specialized Find Methods

### Find by UID

```typescript
async findByUid(uid: string): Promise<User | null> {
  return this.model.findFirst({
    where: { uid, deletedAt: null },
  });
}
```

### Find by External ID

```typescript
async findByExtId(extId: string): Promise<User | null> {
  return this.model.findFirst({
    where: { extId, deletedAt: null },
  });
}
```

### Find with Includes (Type-Safe)

```typescript
async findByUid<T extends Prisma.UserInclude = Record<string, never>>(
  uid: string,
  include?: T,
): Promise<User | Prisma.UserGetPayload<{ include: T }> | null> {
  return this.model.findFirst({
    where: { uid, deletedAt: null },
    ...(include && { include }),
  });
}
```

### Find Multiple with Pagination

```typescript
async findMany(
  params: {
    where?: Prisma.UserWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    include?: Prisma.UserInclude;
  } = {},
): Promise<User[]> {
  return this.model.findMany({
    where: {
      ...params.where,
      deletedAt: null, // ✅ Always filter out deleted
    },
    skip: params.skip,
    take: params.take,
    orderBy: params.orderBy,
    include: params.include,
  });
}
```

### Find or Throw

```typescript
async findByUidOrThrow(uid: string): Promise<User> {
  return this.model.findFirstOrThrow({
    where: { uid, deletedAt: null },
  });
  // Throws P2025 if not found → PrismaExceptionFilter converts to 404
}
```

## Create Operations

### Single Create

```typescript
async create(data: Prisma.UserCreateInput): Promise<User> {
  return this.model.create({
    data: {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
```

### Bulk Create

```typescript
async createMany(
  data: Prisma.UserCreateInput[],
): Promise<Prisma.BatchPayload> {
  return this.model.createMany({
    data,
    skipDuplicates: true,
  });
}
```

## Update Operations

### Single Update

```typescript
async update(
  where: Prisma.UserWhereUniqueInput,
  data: Prisma.UserUpdateInput,
): Promise<User> {
  return this.model.update({
    where,
    data: {
      ...data,
      updatedAt: new Date(), // ✅ Always update timestamp
    },
  });
}
```

### Bulk Update

```typescript
async updateMany(
  where: Prisma.UserWhereInput,
  data: Prisma.UserUpdateInput,
): Promise<Prisma.BatchPayload> {
  return this.model.updateMany({
    where: {
      ...where,
      deletedAt: null, // ✅ Only update non-deleted
    },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}
```

## Delete Operations

### Soft Delete

```typescript
async softDelete(where: Prisma.UserWhereUniqueInput): Promise<void> {
  await this.model.update({
    where,
    data: { deletedAt: new Date() }, // ✅ Set timestamp, don't hard delete
  });
}

async softDeleteMany(where: Prisma.UserWhereInput): Promise<void> {
  await this.model.updateMany({
    where,
    data: { deletedAt: new Date() },
  });
}
```

### Hard Delete (Use Sparingly)

```typescript
async hardDelete(where: Prisma.UserWhereUniqueInput): Promise<void> {
  await this.model.delete({
    where,
  });
}
```

## Query with Soft Delete Filter

**Always include `deletedAt: null` in WHERE clauses**:

```typescript
// ✅ CORRECT: Filters out deleted
const users = await this.model.findMany({
  where: { deletedAt: null },
});

// ✅ CORRECT: Custom filter with soft delete
const users = await this.model.findMany({
  where: {
    status: 'active',
    deletedAt: null, // ✅ Important!
  },
});

// ✅ CORRECT: Query only deleted
const deletedUsers = await this.model.findMany({
  where: { deletedAt: { not: null } },
});

// ❌ WRONG: No soft delete filter (includes deleted!)
const users = await this.model.findMany();
```

## Count Operations

```typescript
async count(where?: Prisma.UserWhereInput): Promise<number> {
  return this.model.count({
    where: {
      ...where,
      deletedAt: null, // ✅ Only count non-deleted
    },
  });
}
```

## Bulk Operations Pattern

**Never loop for creates/updates**:

```typescript
// ❌ WRONG: Multiple database calls
const results = [];
for (const user of users) {
  const created = await this.create(user);
  results.push(created);
}

// ✅ CORRECT: Single bulk operation
const result = await this.createMany(users);
```

## Type-Safe Includes

```typescript
async findManyWithRelations<T extends Prisma.UserInclude>(
  include: T,
): Promise<Prisma.UserGetPayload<{ include: T }>[]> {
  return this.model.findMany({
    where: { deletedAt: null },
    include,
  });
}

// Usage - fully typed
const users = await repo.findManyWithRelations({
  studio: true,
  studioMemberships: true,
});
// users[0].studio → Studio | undefined
// users[0].studioMemberships → StudioMembership[]
```

## Nested Connects with UIDs

**Use Prisma's `connect` with UIDs, not database IDs**:

```typescript
// In a service when creating a related entity
await this.prisma.studioRoom.create({
  data: {
    name: 'Studio A',
    // ✅ CORRECT: Use uid for connect
    studio: { connect: { uid: data.studioUid } },
    // NOT: studio: { connect: { id: data.studioId } }
  },
});
```

## Pagination Support

```typescript
async findPaginated(params: {
  page?: number;
  limit?: number;
  where?: Prisma.UserWhereInput;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}): Promise<{ data: User[]; total: number; page: number; limit: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.model.findMany({
      where: {
        ...params.where,
        deletedAt: null,
      },
      skip,
      take: limit,
      orderBy: params.orderBy,
    }),
    this.count(params.where),
  ]);

  return { data, total, page, limit };
}
```

## Error Handling

**Use Prisma's `OrThrow` variants, let `PrismaExceptionFilter` handle errors**:

```typescript
// ✅ CORRECT: Let Prisma throw, filter converts to HTTP
async getUserOrThrow(uid: string): Promise<User> {
  return this.model.findFirstOrThrow({
    where: { uid, deletedAt: null },
  });
  // Throws P2025 → PrismaExceptionFilter converts to 404
}

// ✅ CORRECT: Use unique constraint query
async getUserByEmailOrThrow(email: string): Promise<User> {
  return this.model.findUniqueOrThrow({
    where: { email },
  });
  // Throws P2025 → converted to 404
}
```

**Key Rules**:
- ✅ Use `findFirstOrThrow()` for optional unique constraints
- ✅ Use `findUniqueOrThrow()` for true unique constraints
- ✅ Let Prisma throw (P2025), global filter converts
- ❌ Never throw HTTP exceptions in repositories
- ❌ Never throw manually

## Module Registration

```typescript
@Module({
  imports: [PrismaModule],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
```

## Testing Repositories

**Integration test example**:

```typescript
describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserRepository, PrismaService],
    }).compile();

    repository = module.get(UserRepository);
    prisma = module.get(PrismaService);
  });

  describe('findByUid', () => {
    it('should find user by uid', async () => {
      // Create test user
      await prisma.user.create({
        data: {
          uid: 'user_123',
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      // Test find
      const user = await repository.findByUid('user_123');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should not find soft-deleted user', async () => {
      // Create and delete user
      await prisma.user.create({
        data: {
          uid: 'user_deleted',
          email: 'deleted@example.com',
          name: 'Deleted User',
          deletedAt: new Date(),
        },
      });

      // Should not find
      const user = await repository.findByUid('user_deleted');

      expect(user).toBeNull();
    });
  });
});
```

## Best Practices Checklist

- [ ] Extend `BaseRepository<T, C, U, W>`
- [ ] Always include `deletedAt: null` in WHERE clauses
- [ ] Use soft delete instead of hard delete
- [ ] Create specialized `findBy*` methods for common queries
- [ ] Use `findFirstOrThrow()` for not-found scenarios
- [ ] Use bulk operations instead of loops
- [ ] Type-safe includes for relations
- [ ] Use Prisma's `connect: { uid }` for relations
- [ ] Use `Promise.all()` for parallel queries (data + count)
- [ ] Never throw HTTP exceptions
- [ ] Let Prisma throw, global filter converts errors
- [ ] Support pagination with skip/take
- [ ] Update timestamps on create/update
- [ ] Support ordering and filtering in queries
- [ ] Repositories testable with real database

## Related Skills

- **repository-pattern/SKILL.md** - General repository principles
- **service-pattern-nestjs/SKILL.md** - Repository consumption
- **database-patterns/SKILL.md** - Advanced Prisma patterns
