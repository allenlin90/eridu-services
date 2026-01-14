---
name: database-patterns
description: Provides Prisma-specific patterns for soft delete, transactions, optimistic locking, bulk operations, and performance optimization. Use when implementing data persistence, handling concurrent updates, managing complex multi-table operations, or optimizing query performance.
---

# Database Patterns Skill

Provides comprehensive patterns for effective database design and operations with Prisma.

## Soft Delete Pattern

**Never permanently delete data - use timestamps instead**:

```prisma
model User {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  name      String
  email     String    @unique
  deletedAt DateTime? @map("deleted_at")  // NULL = active, DateTime = deleted
  
  @@index([deletedAt])  // Index for filtering active records
}
```

**Query only active records**:

```typescript
// ✅ CORRECT: Exclude deleted records
const users = await prisma.user.findMany({
  where: { deletedAt: null },
});

// ❌ WRONG: Returns deleted records
const users = await prisma.user.findMany({};);
```

**Soft delete operation**:

```typescript
// ✅ CORRECT: Soft delete (update deletedAt)
await prisma.user.update({
  where: { uid: "user_123" },
  data: { deletedAt: new Date() },
});

// ❌ WRONG: Hard delete (unrecoverable)
await prisma.user.delete({
  where: { uid: "user_123" },
});
```

**Repository pattern**:

```typescript
private buildWhereClause(params?: { where?: Prisma.UserWhereInput }): Prisma.UserWhereInput {
  return {
    ...params?.where,
    deletedAt: null,  // Always include soft delete filter
  };
}

async findMany(params?: FindManyParams<Prisma.UserWhereInput>) {
  return this.model.findMany({
    where: this.buildWhereClause(params),
    skip: params?.skip,
    take: params?.take,
  });
}
```

**Benefits**:
- ✅ Preserve data for auditing and recovery
- ✅ Maintain referential integrity
- ✅ Support "undelete" functionality
- ✅ Easy to query active vs deleted records
- ✅ No cascading delete complications

## Transaction Pattern

**Atomic multi-table operations**:

```typescript
// Single transaction ensures atomicity
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Create schedule
  const schedule = await tx.schedule.create({
    data: { /* ... */ },
  });

  // Step 2: Create shows from schedule
  const shows = await tx.show.createMany({
    data: planDocument.shows.map(show => ({
      /* ... */
      scheduleId: schedule.id,
    })),
  });

  // Step 3: Create show relationships
  const showMCs = await tx.showMC.createMany({
    data: showMCRecords,
  });

  // All succeed or all rollback
  return { schedule, shows, showMCs };
});
```

**Transaction guarantees**:
- All operations succeed together
- All fail together (automatic rollback)
- No partial updates
- Perfect for multi-step workflows

**Key Rules**:
- ✅ Use for multi-table operations
- ✅ Keep transactions short
- ✅ Use `tx` instead of `prisma`
- ❌ Don't nest transactions
- ❌ Don't reference `prisma` inside transaction

## Optimistic Locking Pattern

**Prevent concurrent edit conflicts**:

```prisma
model Schedule {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  name      String
  version   Int       @default(1)  // Version column for locking
  
  @@index([uid])
}
```

**Update with version check**:

```typescript
// User A loads schedule version 1
const schedule = await prisma.schedule.findUnique({
  where: { uid: "schedule_001" },
});
// version: 1

// User B modifies and increments to version 2
await prisma.schedule.update({
  where: { uid: "schedule_001" },
  data: { name: "Updated by B", version: 2 },
});

// User A tries to update with version 1
try {
  await prisma.schedule.update({
    where: { uid: "schedule_001", version: 1 },  // Version doesn't match!
    data: { name: "Updated by A", version: 2 },
  });
} catch (e) {
  // Error: No record found (version 1 no longer exists)
  // User A must reload and retry
}
```

**Implementation**:

```typescript
// Service checks version
async updateSchedule(uid: string, data: UpdateScheduleDto, version: number) {
  const updated = await this.repository.update({
    where: { uid, version },  // Both uid AND version must match
    data: { ...data, version: version + 1 },
  });

  if (!updated) {
    throw HttpError.conflict('Version mismatch. Please reload and retry.');
  }

  return updated;
}
```

**Benefits**:
- ✅ Detect concurrent edits
- ✅ No locking overhead
- ✅ Simple to implement
- ✅ Clear conflict messages
- ✅ User must choose which version to keep

## Bulk Operations Pattern

**Create/update many records efficiently**:

```typescript
// ✅ CORRECT: Single bulk operation
const shows = await prisma.show.createMany({
  data: [
    { name: "Show 1", clientId: 1, /* ... */ },
    { name: "Show 2", clientId: 1, /* ... */ },
    { name: "Show 3", clientId: 1, /* ... */ },
  ],
});
// Result: Creates 3 shows in ~1 query

// ❌ WRONG: Loop and create one at a time
for (const show of shows) {
  await prisma.show.create({
    data: show,
  });
}
// Result: 3 separate queries (slow!)

// ❌ WRONG: Using forEach async
shows.forEach(async (show) => {
  await prisma.show.create({ data: show });
});
// Result: Uncontrolled concurrency
```

**Bulk update pattern**:

```typescript
// ✅ CORRECT: Bulk update
await prisma.show.updateMany({
  where: { scheduleId: schedule.id, deletedAt: null },
  data: { status: "published" },
});
// Result: Single query updates many

// ❌ WRONG: Loop and update one at a time
for (const show of shows) {
  await prisma.show.update({
    where: { uid: show.uid },
    data: { status: "published" },
  });
}
// Result: N separate queries
```

**Benefits**:
- ✅ Dramatically faster (10x+ for 100 records)
- ✅ Lower database load
- ✅ Atomic operation (all or none)
- ✅ Single network roundtrip

## Delete + Insert Publishing Pattern

**Replace old data with new data atomically**:

```typescript
// Republish a schedule (update existing shows)
async publishSchedule(scheduleId: BigInt, planDocument: PlanDocument) {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Delete existing shows for this schedule
    await tx.show.deleteMany({
      where: { scheduleId },  // Hard delete (or soft delete based on design)
    });

    // Step 2: Create new shows from updated plan
    const shows = await tx.show.createMany({
      data: planDocument.shows.map(show => ({
        uid: UtilityService.generateBrandedId('show'),
        name: show.name,
        clientId: show.clientId,
        scheduleId,
        /* ... other fields ... */
      })),
    });

    // Step 3: Create all relationships atomically
    const showMCs = await tx.showMC.createMany({
      data: /* MC relationships */,
    });

    // Mark schedule as published
    await tx.schedule.update({
      where: { id: scheduleId },
      data: { status: "published", publishedAt: new Date() },
    });

    return { shows, showMCs };
  });
}
```

**Benefits**:
- ✅ Atomic replacement (no in-between state)
- ✅ Supports republishing (update + resync)
- ✅ Clean data state
- ✅ Rollback on any error

**Alternative: Soft delete**:

```typescript
// Mark old shows as deleted instead of hard delete
await tx.show.updateMany({
  where: { scheduleId },
  data: { deletedAt: new Date() },
});
// Then create new shows
```

## Nested Connect Pattern

**Create relationships without manual ID lookup**:

```typescript
// ✅ CORRECT: Use nested connect with UID
const show = await prisma.show.create({
  data: {
    name: "Studio Show",
    // Connect by UID (not database ID)
    client: { connect: { uid: "client_123" } },
    studioRoom: { connect: { uid: "room_456" } },
    showType: { connect: { uid: "type_bau" } },
    // Nested creates in same transaction
    showMCs: {
      create: [
        {
          mc: { connect: { uid: "mc_001" } },
          note: "Host",
        },
      ],
    },
  },
});

// ❌ WRONG: Manual lookup of database ID
const client = await prisma.client.findUnique({
  where: { uid: "client_123" },
});
const show = await prisma.show.create({
  data: {
    name: "Studio Show",
    clientId: client.id,  // Extra query, using database ID
  },
});
```

**Benefits**:
- ✅ Single atomic operation
- ✅ No extra queries for IDs
- ✅ Works with UIDs directly
- ✅ Automatic validation (entity must exist)

## Indexed Queries Pattern

**Fast lookups with proper indexes**:

```prisma
model User {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique            // Automatic index
  email     String    @unique            // Automatic index
  name      String
  deletedAt DateTime?
  
  // Common queries
  @@index([uid])                         // Find by UID
  @@index([email])                       // Find by email
  @@index([deletedAt])                   // Filter active records
  @@index([name])                        // Search by name
  @@index([createdAt])                   // Range queries
}

model Show {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  clientId  BigInt    @map("client_id")
  startTime DateTime  @map("start_time")
  deletedAt DateTime?
  
  // Fast queries
  @@index([uid])                         // Find by UID
  @@index([clientId, deletedAt])         // Shows per client (active only)
  @@index([startTime, deletedAt])        // Range queries
  @@index([clientId, startTime])         // Client shows sorted by time
  @@index([deletedAt])                   // Filter active
}
```

**Query patterns**:

```typescript
// Fast: Uses index on uid
const user = await prisma.user.findUnique({
  where: { uid: "user_123" },
});

// Fast: Uses index on (clientId, deletedAt)
const shows = await prisma.show.findMany({
  where: { clientId: 1, deletedAt: null },
  orderBy: { startTime: "asc" },
});

// Slow: No index on name (full table scan)
const users = await prisma.user.findMany({
  where: { name: { contains: "john" } },
});
// Solution: Add full-text search index or use search service
```

**Index naming pattern**:
- `@index([uid])` for simple lookups
- `@index([foreignKey, status])` for filtered lookups
- `@index([dateField])` for range queries
- `@unique` for unique constraints

## Query Optimization Pattern

**Efficient related data loading**:

```typescript
// ✅ CORRECT: Single query with includes
const shows = await prisma.show.findMany({
  where: { clientId: 1, deletedAt: null },
  include: {
    client: true,
    studioRoom: true,
    showType: true,
    showMCs: {
      where: { deletedAt: null },
      include: { mc: true },
    },
    showPlatforms: {
      where: { deletedAt: null },
      include: { platform: true },
    },
  },
  orderBy: { startTime: "asc" },
});
// Result: Single query with all relations

// ❌ WRONG: N+1 query problem
const shows = await prisma.show.findMany({
  where: { clientId: 1 },
});
for (const show of shows) {
  const client = await prisma.client.findUnique({
    where: { id: show.clientId },
  });
  // Result: 1 + N queries (slow for 100 shows!)
}
```

**Type-safe includes**:

```typescript
type ShowWithRelations = Prisma.ShowGetPayload<{
  include: {
    client: true;
    showMCs: { include: { mc: true } };
  };
}>;

const shows = await prisma.show.findMany({
  include: {
    client: true,
    showMCs: { include: { mc: true } },
  },
});
// Result: shows is typed as ShowWithRelations[]
```

## Pagination Pattern

**Efficient data slicing**:

```typescript
async findMany(params?: FindManyParams) {
  const [data, count] = await Promise.all([
    this.model.findMany({
      where: this.buildWhereClause(params),
      skip: params?.skip ?? 0,
      take: params?.take ?? 10,
      orderBy: params?.orderBy ?? { createdAt: "desc" },
    }),
    this.model.count({
      where: this.buildWhereClause(params),
    }),
  ]);

  return { data, total: count };
}
```

**Benefits**:
- ✅ Parallel count + data queries (faster)
- ✅ Proper offset/limit handling
- ✅ Total count for pagination UI
- ✅ Custom ordering support

## Best Practices Checklist

- [ ] Always use soft delete (deletedAt) instead of hard delete
- [ ] Always filter deletedAt: null in queries
- [ ] Use transactions for multi-step operations
- [ ] Implement optimistic locking with version column
- [ ] Use bulk operations instead of loops
- [ ] Use nested connect for relationships (not IDs)
- [ ] Index frequently queried columns
- [ ] Use includes instead of separate queries (N+1 prevention)
- [ ] Parallel count + data queries for pagination
- [ ] Type-safe includes with Prisma.GetPayload
- [ ] Keep transactions short
- [ ] Use migrations for schema changes
- [ ] Support republishing with delete + insert pattern
- [ ] Validate all external IDs before using them
- [ ] Document complex query patterns

## Related Skills

- **repository-pattern/SKILL.md** - Data access layer implementation
- **service-pattern/SKILL.md** - Business logic and transactions
- **data-validation/SKILL.md** - ID management and validation
