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

## When NOT to Bump `version`

Bump `version` only on **semantic mutations the user-visible state machine cares about** (status change, content edit, assignment, snapshot transition). A bump tells every other client "your cached copy is stale — refresh before writing." So bumping inappropriately means the next legitimate write gets a 409 from a stale comparison the client had no way to know about.

Do NOT bump `version` for:

- **Pre-submission bookkeeping** — e.g. reserving an upload version number, caching a presigned URL, tracking compression progress. The user has not committed anything yet; their next write should not 409.
- **Async denormalized state** — e.g. write-side counters, cached aggregates, last-seen-at timestamps. The producer is the system, not the user.
- **Metadata the writer is the sole reader of** — self-referential bookkeeping (numbering, sequencing, dedup keys).

> Concrete example: `reserveMaterialAssetUploadVersion` writes `material_asset_upload_versions` to `task.metadata` but does NOT bump `task.version`. Reason: the file upload is pre-submission. Bumping would cause the operator's *first actual submit* to return 409 — exactly the friction reported in PR #107.

## Race Tolerance: Decide Before Designing the Lock

When a non-version-bumping writer (above) shares a JSONB column with a version-bumping writer that pre-reads metadata, the bumping writer can silently overwrite the bookkeeping writer's changes. Before building a workaround (raw SQL `jsonb ||` merge, `pg_advisory_xact_lock`, serializable transactions), answer:

| Question | If YES → | If NO → |
|---|---|---|
| Does any business workflow break if this metadata is lost? | Move it out of `metadata` into the Audit model or a dedicated table — don't bend optimistic-locking around non-critical state | Accept the race. Document the intent inline. No workaround. |

If the data turns out to be critical later, the right move is **migrate it to the Audit model**, not retrofit a lock around a metadata blob.
