# Eridu Services - Database Patterns Skill

Provides guidance for Prisma patterns and database operations in Eridu Services.

## Soft Delete Pattern

**Always filter out soft-deleted records**:

```typescript
// ✅ CORRECT: Only active records
const users = await prisma.user.findMany({
  where: { deletedAt: null },
});

// ✅ CORRECT: Soft delete operation
await prisma.user.update({
  where: { uid: 'user_123' },
  data: { deletedAt: new Date() },
});

// ✅ CORRECT: Query deleted records if needed
const deletedUsers = await prisma.user.findMany({
  where: { deletedAt: { not: null } },
});

// ❌ WRONG: Includes deleted records
const allUsers = await prisma.user.findMany();
```

**Key Rules**:

- ✅ Always add `deletedAt: null` to WHERE clauses
- ✅ Use soft delete (update with `deletedAt`) instead of hard delete
- ✅ Create separate queries for deleted records when needed
- ❌ Never use Prisma's native delete operation
- ❌ Never forget the soft delete filter

## Transactions for Atomic Operations

**For multi-entity operations**:

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  // Create user
  const user = await tx.user.create({
    data: {
      uid: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  // Create studio membership
  const membership = await tx.studioMembership.create({
    data: {
      uid: 'smb_456',
      userId: user.id,        // Use internal id from created user
      studioId: studioId,
      role: 'admin',
    },
  });

  // Create snapshot
  await tx.scheduleSnapshot.create({
    data: {
      uid: 'snap_789',
      scheduleId: scheduleId,
      planDocument: schedule.planDocument,
      version: schedule.version,
    },
  });

  return { user, membership };
});

// If any operation fails, all are rolled back automatically
```

**Use Cases**:

- Multi-entity creations
- Complex updates across tables
- Nested operations requiring consistency
- Publishing schedules (delete old + create new shows)

**Key Rules**:

- ✅ Use `this.prisma.$transaction()` for atomic operations
- ✅ All operations roll back if any fail
- ✅ Return meaningful result from transaction
- ❌ Don't use transactions for single operations
- ❌ Don't perform external operations inside transactions

## Include Pattern (Prevent N+1 Queries)

### Basic Include

**Load related data in single query**:

```typescript
// ❌ WRONG: N+1 queries (1 show + N client queries)
const shows = await prisma.show.findMany({
  where: { deletedAt: null },
});
for (const show of shows) {
  const client = await prisma.client.findUnique({
    where: { id: show.clientId },
  });
}

// ✅ CORRECT: Single query with include
const shows = await prisma.show.findMany({
  where: { deletedAt: null },
  include: {
    client: true,
    studioRoom: true,
    showType: true,
    showStatus: true,
    showStandard: true,
  },
});
```

### Nested Include

**Load related data at multiple levels**:

```typescript
const shows = await prisma.show.findMany({
  where: { deletedAt: null },
  include: {
    client: true,
    showMCs: {
      include: {
        mc: true,  // Load MC for each ShowMC
      },
    },
    showPlatforms: {
      include: {
        platform: true,  // Load Platform for each ShowPlatform
      },
    },
  },
});
```

### Conditional Include

```typescript
const includes: Prisma.ShowInclude = {
  client: true,
};

if (includeDetails) {
  includes.showMCs = { include: { mc: true } };
  includes.showPlatforms = { include: { platform: true } };
}

const show = await prisma.show.findUnique({
  where: { uid: 'show_123' },
  include: includes,
});
```

**Key Rules**:

- ✅ Use `include` for all needed relations
- ✅ Use nested `include` for multiple levels
- ✅ Make includes conditional when needed
- ❌ Never fetch data then loop for related entities
- ❌ Don't forget `deletedAt: null` in include where clauses

## Bulk Operations Pattern

**Never loop for creates/updates in database**:

```typescript
// ❌ WRONG: Multiple database calls
for (const show of shows) {
  await prisma.show.create({ data: show });
}

// ✅ CORRECT: Bulk create
await prisma.show.createMany({
  data: shows,
  skipDuplicates: true,  // Skip if unique constraint violated
});

// ✅ CORRECT: Bulk update
await prisma.show.updateMany({
  where: { scheduleId: scheduleId, deletedAt: null },
  data: { showStatusId: confirmedStatusId },
});

// ✅ CORRECT: Bulk delete (soft)
await prisma.show.updateMany({
  where: { scheduleId: scheduleId },
  data: { deletedAt: new Date() },
});
```

**Performance Benefits**:

- 1 call instead of N calls
- ~90% reduction in database operations
- Automatic transaction handling
- Better error handling (partial success)

## Connect via UID Pattern

**Use Prisma's native `connect` for relationships**:

```typescript
// ✅ CORRECT: Connect using uid
const show = await prisma.show.create({
  data: {
    uid: 'show_123',
    name: 'Morning Show',
    startTime: new Date(),
    endTime: new Date(),
    client: { connect: { uid: 'client_456' } },        // Connect via UID
    studioRoom: { connect: { uid: 'room_789' } },      // Not internal id!
    showType: { connect: { uid: 'sht_bau' } },
    showStatus: { connect: { uid: 'shs_confirmed' } },
    showStandard: { connect: { uid: 'shs_premium' } },
  },
});

// ✅ CORRECT: Nested create with connect
const show = await prisma.show.create({
  data: {
    uid: 'show_123',
    client: { connect: { uid: 'client_456' } },
    showMCs: {
      create: [
        {
          uid: 'show_mc_001',
          mc: { connect: { uid: 'mc_123' } },  // Connect via UID
        },
        {
          uid: 'show_mc_002',
          mc: { connect: { uid: 'mc_456' } },
        },
      ],
    },
  },
});
```

**Key Rules**:

- ✅ Use `connect: { uid }` for existing entities
- ✅ Use `create` for nested creations
- ✅ Always use UID, never internal id
- ❌ Never use `connect: { id }` (internal id)
- ❌ Don't mix `id` and `uid` in connect operations

## Delete + Insert Publishing Pattern

**For republishing schedules to shows table**:

```typescript
// Use transaction for atomicity
await this.prisma.$transaction(async (tx) => {
  // 1. Delete all existing shows from previous publish
  await tx.show.deleteMany({
    where: { scheduleId: scheduleId },
  });

  // 2. Bulk insert new shows from plan_document
  const planItems = schedule.planDocument.shows;
  await tx.show.createMany({
    data: planItems.map((item) => ({
      uid: this.utilityService.generateBrandedId('show'),
      name: item.name,
      startTime: item.startTime,
      endTime: item.endTime,
      clientId: clientId,  // From plan metadata
      scheduleId: scheduleId,
      // ... other fields
    })),
  });

  // 3. Bulk insert show relationships
  await tx.showMC.createMany({
    data: planItems.flatMap((show, showIndex) =>
      (show.mcs || []).map((mcUid) => ({
        uid: this.utilityService.generateBrandedId('show_mc'),
        showId: showIdMap[showIndex],  // Map from inserted shows
        mcId: mcIdMap[mcUid],          // From id lookup
      })),
    ),
  });

  // 4. Update schedule status
  await tx.schedule.update({
    where: { id: scheduleId },
    data: { status: 'published', publishedAt: new Date() },
  });
});
```

## Count Queries

**Get data and count in parallel**:

```typescript
// ❌ WRONG: Sequential queries
const users = await prisma.user.findMany({ where: { deletedAt: null } });
const count = await prisma.user.count({ where: { deletedAt: null } });

// ✅ CORRECT: Parallel queries with Promise.all
const [users, count] = await Promise.all([
  prisma.user.findMany({
    where: { deletedAt: null },
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.user.count({ where: { deletedAt: null } }),
]);
```

## Related Skills

- **eridu-repository-pattern.md** - Repository layer implementation
- **eridu-service-pattern.md** - Services using database operations
- **eridu-performance-optimization.md** - Query optimization strategies

## Best Practices Checklist

- [ ] Always include `deletedAt: null` in WHERE clauses
- [ ] Use soft delete instead of hard delete
- [ ] Use transactions for multi-entity operations
- [ ] Use `include` to prevent N+1 queries
- [ ] Use bulk operations instead of loops
- [ ] Use `connect: { uid }` for relationships
- [ ] Use `Promise.all()` for parallel queries
- [ ] Use delete + insert for publishing
- [ ] Return meaningful results from transactions
- [ ] Never use internal id in connect operations
