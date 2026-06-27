# Restore Repository — Full Pattern

## Schema Requirements

A restorable model needs both `deletedAt` and `version`:

```prisma
model TaskTemplate {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  version   Int       @default(1)
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt])
}
```

## Repository: findDeleted Helper

Expose a way to look up deleted records so the service or admin endpoint can surface them:

```typescript
async findDeletedByUid(uid: string, studioUid?: string): Promise<TaskTemplate | null> {
  return this.prisma.taskTemplate.findFirst({
    where: {
      uid,
      deletedAt: { not: null },
      ...(studioUid && { studio: { uid: studioUid } }),
    },
  });
}
```

## Repository: restore Method

```typescript
async restore(params: {
  uid: string;
  studioUid?: string;
}): Promise<TaskTemplate> {
  const { uid, studioUid } = params;

  return this.prisma.taskTemplate.update({
    where: {
      uid,
      deletedAt: { not: null },              // Only restores if currently deleted
      ...(studioUid && { studio: { uid: studioUid } }),
    },
    data: {
      deletedAt: null,
      version: { increment: 1 },             // Signals state change to stale clients
    },
  });
}
```

**Why `deletedAt: { not: null }` in the where?**

Prisma returns `P2025 RecordNotFound` when no row matches the `where`. Scoping to deleted records means:
- If the record was never deleted → `P2025` → service converts to `HttpError.notFound`
- If the record doesn't exist → same `P2025` → same 404 response
- If the record is active → 404 (restore of active record blocked at DB level, not application level)

## Service: Full Restore with Dependency Check

```typescript
async restore(uid: string, studioUid?: string): Promise<TaskTemplate> {
  // 1. Verify the deleted record exists before checking constraints
  const deleted = await this.repository.findDeletedByUid(uid, studioUid);
  if (!deleted) {
    throw HttpError.notFound('Task template not found or not deleted');
  }

  // 2. Check for uniqueness conflict introduced while record was deleted
  const nameConflict = await this.repository.findOne({
    name: deleted.name,
    studio: { uid: studioUid },
    deletedAt: null,
  });
  if (nameConflict) {
    throw HttpError.conflict(
      'A task template with this name already exists. Rename the existing template before restoring.',
    );
  }

  // 3. Perform restore
  try {
    return await this.repository.restore({ uid, studioUid });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PRISMA_ERROR.RecordNotFound
    ) {
      throw HttpError.notFound('Task template not found or not deleted');
    }
    throw error;
  }
}
```

## Listing Deleted Records in Admin or Studio Context

Add `includeDeleted` flag to paginated queries:

```typescript
// Repository
async findPaginated(params: {
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
}): Promise<{ data: TaskTemplate[]; total: number }> {
  const where: Prisma.TaskTemplateWhereInput = params.includeDeleted
    ? {}
    : { deletedAt: null };

  const [data, total] = await Promise.all([
    this.prisma.taskTemplate.findMany({ where, skip: params.skip, take: params.take }),
    this.prisma.taskTemplate.count({ where }),
  ]);

  return { data, total };
}
```

Expose `deleted_at` in the response schema so the frontend can conditionally render restore actions.
