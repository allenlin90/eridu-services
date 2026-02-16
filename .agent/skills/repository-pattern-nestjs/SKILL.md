---
name: repository-pattern-nestjs
description: Comprehensive Prisma repository implementation patterns for NestJS. This skill should be used when implementing repositories that extend BaseRepository or use Prisma delegates.
metadata:
  priority: 3
  applies_to: [backend, nestjs, repositories, prisma]
  supersedes: [repository-pattern]
---

# Repository Pattern - Prisma/NestJS

**Complete implementation guide for NestJS Repositories using Prisma.**

## Canonical Examples

Study these real implementations as the source of truth:
- **Model Repository**: [task-template.repository.ts](../../../apps/erify_api/src/models/task-template/task-template.repository.ts)
- **Base Repository**: [base.repository.ts](../../../apps/erify_api/src/lib/repositories/base.repository.ts)

**Detailed code examples**: See [references/repository-examples.md](references/repository-examples.md)

---

## Core Responsibilities

Repositories act as data access abstraction. They should:

1. **Encapsulate queries** - All database operations go through repositories
2. **Hide database details** - Services don't know SQL or ORM specifics
3. **Provide typed interfaces** - Strong typing for queries and results
4. **Handle errors** - Low-level errors are handled here
5. **Implement soft deletes** - Consistent deletion strategy
6. **Support common patterns** - Find, create, update, delete operations
7. **Optimize queries** - Eager loading, indexes, pagination

---

## BaseRepository Extension

🔴 **Critical**: All repositories MUST extend `BaseRepository<T, C, U, W>`.

> [!IMPORTANT]
> **Why Extend BaseRepository?**
> - **Standardization**: Consistent CRUD interface across all repositories
> - **Soft Delete**: Automatic `deletedAt: null` filtering in base methods
> - **Type Safety**: Generic types ensure compile-time correctness
> - **Reusability**: Inherit common methods (create, findOne, update, etc.)
> - **Maintainability**: Bug fixes in BaseRepository benefit all repositories

```typescript
import { BaseRepository, IBaseModel } from '@/lib/repositories/base.repository';

// 1. Define Wrapper (bridges BaseRepo generics to Prisma Delegate)
class UserModelWrapper implements IBaseModel<User, Prisma.UserCreateInput, Prisma.UserUpdateInput, Prisma.UserWhereInput> {
  constructor(private readonly delegate: Prisma.UserDelegate) {}
  create(args: any) { return this.delegate.create(args); }
  findFirst(args: any) { return this.delegate.findFirst(args); }
  findMany(args: any) { return this.delegate.findMany(args); }
  update(args: any) { return this.delegate.update(args); }
  delete(args: any) { return this.delegate.delete(args); }
  count(args: any) { return this.delegate.count(args); }
}

// 2. Implement Repository
@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new UserModelWrapper(prisma.user));
  }
}
```

### Inherited Methods — Do NOT Override

🔴 **Critical**: `BaseRepository` already provides these methods with built-in `deletedAt: null` filtering. Do NOT re-implement them in child repositories unless you need **custom behavior beyond what the base provides** (e.g., version checking, additional joins).

| Method | Provided by `BaseRepository` | Override only if… |
|--------|------------------------------|-------------------|
| `create` | ✅ | Never — use as-is |
| `findOne` | ✅ | Never — use as-is |
| `findMany` | ✅ | Never — use as-is |
| `update` | ✅ | You need custom where-clause logic (e.g., `studioUid` scoping, version checks) |
| `softDelete` | ✅ | You need additional side effects |
| `delete` | ✅ | Never — use as-is |
| `restore` | ✅ | Never — use as-is |
| `count` | ✅ | Never — use as-is |

```typescript
// ❌ BAD: Redundant override — BaseRepository already does this
async update(
  where: Prisma.PlatformWhereUniqueInput,
  data: Prisma.PlatformUpdateInput,
): Promise<Platform> {
  return this.prisma.platform.update({ where, data });
}

async softDelete(where: Prisma.PlatformWhereUniqueInput): Promise<Platform> {
  return this.prisma.platform.update({
    where,
    data: { deletedAt: new Date() },
  });
}

// ✅ GOOD: Only add specialized methods
async findPaginated(params: { ... }): Promise<{ data: Platform[]; total: number }> {
  // Custom filtering logic that BaseRepository doesn't provide
}
```

---

## Specialized Find Methods

🟡 **Recommended**: Implement domain-specific queries here (not in Service).

```typescript
// Find by UID (Standard)
async findByUid(uid: string): Promise<User | null> {
  return this.model.findFirst({
    where: { uid, deletedAt: null },
  });
}

// Find or Throw (Let Prisma throw P2025 -> converted to 404 by Global Filter)
async findByUidOrThrow(uid: string): Promise<User> {
  return this.model.findFirstOrThrow({
    where: { uid, deletedAt: null },
  });
}

// Find with Relations (Type-safe)
async findByUidWithProfile(uid: string): Promise<User & { profile: Profile } | null> {
  return this.model.findFirst({
    where: { uid, deletedAt: null },
    include: { profile: true },
  });
}
```

---

## Advanced Filtering with Pagination

🔴 **Critical**: Repositories should accept domain-level parameters and build Prisma where clauses internally.

```typescript
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

  if (uid) {
    where.uid = { contains: uid, mode: 'insensitive' };
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

**Why This Pattern?**
- Service layer stays ORM-agnostic (no Prisma types)
- Repository encapsulates all filter-building logic
- Easy to add new filters without changing service
- Testable without mocking Prisma types

---

## Optimistic Locking

🟡 **Recommended**: Implement `updateWithVersionCheck()` for versioned entities.

```typescript
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';

async updateWithVersionCheck(
  where: Prisma.TaskTemplateWhereUniqueInput & { version?: number },
  data: Prisma.TaskTemplateUpdateInput,
  include?: Prisma.TaskTemplateInclude,
): Promise<TaskTemplate> {
  try {
    return await this.prisma.taskTemplate.update({
      where: { ...where, deletedAt: null },
      data,
      ...(include && { include }),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === PRISMA_ERROR.RecordNotFound && where.version) {
        const existing = await this.findOne({ uid: where.uid, deletedAt: null });
        
        if (!existing) {
          throw error; // Actually not found
        }
        
        throw new VersionConflictError(
          'Task template version is outdated',
          where.version,
          existing.version,
        );
      }
    }
    throw error;
  }
}
```

---

## Best Practices Checklist

- [ ] 🔴 **Critical**: Extend `BaseRepository` (never implement repositories from scratch)
- [ ] Create proper ModelWrapper implementing `IBaseModel`
- [ ] Implement `findByUid` using `findFirst` (not `findUnique`)
- [ ] Implement `findByUidOrThrow` for error handling
- [ ] 🔴 **Critical**: Always filter `deletedAt: null` in custom queries
- [ ] Use `Promise.all` for pagination (count + data)
- [ ] Return `null` for not found (unless `OrThrow`)
- [ ] 🔴 **Critical**: Never throw HTTP Exceptions (leave that to Service/Controller)
- [ ] Use `Prisma.GetPayload` for typed relations
- [ ] Implement `updateWithVersionCheck` for versioned entities
- [ ] Throw `VersionConflictError` (not HTTP exceptions)
- [ ] Disambiguate P2025: 404 (not found) vs 409 (version conflict)
- [ ] Implement `findPaginated` for complex filtering scenarios
- [ ] Accept domain-level parameters (not Prisma types) in public methods
- [ ] Use `findFirst` when filtering by non-unique fields like `deletedAt`

---

## Related Skills

- **[Service Pattern NestJS](service-pattern-nestjs/SKILL.md)** - Service layer using repositories
- **[Database Patterns](database-patterns/SKILL.md)** - Soft delete, transactions, optimistic locking
- **[Backend Controller Pattern NestJS](backend-controller-pattern-nestjs/SKILL.md)** - Controller patterns
