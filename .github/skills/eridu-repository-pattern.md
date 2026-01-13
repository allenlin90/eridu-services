# Eridu Services - Repository Pattern Skill

Provides guidance for implementing repository layers in Eridu Services.

## Core Repository Pattern

### BaseRepository Extension

Extend `BaseRepository<T, C, U, W>` for all entity repositories:

```typescript
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new UserModelWrapper(prisma));
  }
}
```

**Type Parameters**:
- `T` = Entity type (Prisma model)
- `C` = Create input type
- `U` = Update input type
- `W` = Where clause type

## Specialized Query Methods

### Finding Records

```typescript
async findByUid(uid: string): Promise<User | null> {
  return this.model.findFirst({
    where: { uid, deletedAt: null },
  });
}

async findByExtId(extId: string): Promise<User | null> {
  return this.model.findFirst({
    where: { extId, deletedAt: null },
  });
}

async findById<T extends Prisma.UserInclude = Record<string, never>>(
  id: bigint,
  include?: T,
): Promise<User | Prisma.UserGetPayload<{ include: T }> | null> {
  return this.model.findFirst({
    where: { id, deletedAt: null },
    ...(include && { include }),
  });
}
```

### Error Handling in Repositories

**Use Prisma's `findFirstOrThrow` and `findUniqueOrThrow`**:

```typescript
// ✅ CORRECT: Let Prisma throw, PrismaExceptionFilter converts to 404
async getUserOrThrow(uid: string): Promise<User> {
  return this.model.findFirstOrThrow({
    where: { uid, deletedAt: null },
  });
}

// Prisma throws P2025 → PrismaExceptionFilter converts to 404
```

**Key Rules**:

- ✅ Use `findFirstOrThrow()` and `findUniqueOrThrow()` for not-found scenarios
- ✅ Include `deletedAt: null` in all WHERE clauses (soft delete pattern)
- ✅ Create specialized `findBy*` methods for common queries
- ❌ Never throw HTTP exceptions in repositories
- ❌ Never manually resolve UIDs to IDs (use Prisma's `connect: { uid }`)

## Soft Delete Pattern

**Always filter out deleted records**:

```typescript
// ✅ CORRECT: Only active records
const users = await this.model.findMany({
  where: { deletedAt: null },
});

// ✅ CORRECT: Soft delete operation
async softDelete(where: Prisma.UserWhereUniqueInput): Promise<void> {
  await this.model.update({
    where,
    data: { deletedAt: new Date() },
  });
}

// ✅ CORRECT: Query deleted records if needed
const deletedUsers = await this.model.findMany({
  where: { deletedAt: { not: null } },
});
```

**Key Points**:

- ✅ Always add `deletedAt: null` to WHERE clauses
- ✅ Use `softDelete()` method instead of delete
- ✅ Create separate methods for querying deleted records
- ❌ Never use hard delete (Prisma's native delete)
- ❌ Never forget the soft delete filter

## Bulk Operations

**Never loop for creates/updates in repositories**:

```typescript
// ❌ WRONG: Multiple database calls
for (const user of users) {
  await this.model.create({ data: user });
}

// ✅ CORRECT: Bulk operation
async createMany(data: Prisma.UserCreateInput[]): Promise<Prisma.BatchPayload> {
  return this.model.createMany({
    data,
    skipDuplicates: true,
  });
}

// ✅ CORRECT: Bulk update
async updateMany(
  where: Prisma.UserWhereInput,
  data: Prisma.UserUpdateInput,
): Promise<Prisma.BatchPayload> {
  return this.model.updateMany({ where, data });
}
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
```

## Related Skills

- **eridu-service-pattern.md** - Service layer using repositories
- **eridu-database-patterns.md** - Advanced Prisma patterns
- **eridu-error-handling.md** - Error handling in services

## Best Practices Checklist

- [ ] Extend `BaseRepository<T, C, U, W>`
- [ ] Create specialized `findBy*` methods
- [ ] Use `findFirstOrThrow()` for not-found errors
- [ ] Include `deletedAt: null` in all queries
- [ ] Use bulk operations instead of loops
- [ ] Never throw HTTP exceptions
- [ ] Support type-safe includes for relations
