# Optimistic Locking — Code Examples

## Schema

Add a `version` integer to any entity requiring concurrent write protection.

```prisma
model TaskTemplate {
  id      BigInt @id @default(autoincrement())
  uid     String @unique
  version Int    @default(1)
}
```

## Repository Layer

Implement `updateWithVersionCheck`. Throw `VersionConflictError` (a domain error) — never an HTTP error directly from the repository.

```typescript
async updateWithVersionCheck(
  where: Prisma.TaskTemplateWhereUniqueInput & { version?: number },
  data: Prisma.TaskTemplateUpdateInput,
): Promise<TaskTemplate> {
  try {
    return await this.prisma.taskTemplate.update({
      where: { ...where, deletedAt: null },
      data,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === PRISMA_ERROR.RecordNotFound && where.version !== undefined) {
        const existing = await this.findOne({ uid: where.uid, deletedAt: null });

        if (!existing) throw error; // Genuinely not found

        // Version mismatch — throw domain error
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

## Service Layer

Convert the domain error to an HTTP error at the service boundary.

```typescript
async updateTemplate(uid: string, version: number, data: UpdatePayload) {
  try {
    return await this.repository.updateWithVersionCheck(
      { uid, version },
      { ...data, version: version + 1 },
    );
  } catch (error) {
    if (error instanceof VersionConflictError) {
      throw HttpError.conflict('Record is out of date. Please refresh and try again.');
    }
    throw error;
  }
}
```

## Why Domain Error (not HTTP directly from Repository)?

| Concern | Outcome |
|---|---|
| **Layer Separation** | Repository stays unaware of HTTP |
| **Testability** | Version conflicts testable without HTTP context |
| **Reusability** | Same error works across REST, GraphQL, queues |
