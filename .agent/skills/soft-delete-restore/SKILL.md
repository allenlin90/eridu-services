---
name: soft-delete-restore
description: Patterns for implementing restore workflows on soft-deleted records in erify_api. Use when adding restore capability to any model (task templates, show creators, shifts, etc.), designing restore permission rules, handling optimistic version conflicts on restore, or building restore endpoints and audit trails.
---

# Soft Delete Restore Pattern

**Builds on**: `database-patterns` (soft delete) and `database-patterns` (optimistic locking).

The `BaseRepository` already has a `restore()` method. This skill covers the full contract: repository, service, controller, authorization, and version behavior.

---

## 1. What Restore Does

Restore sets `deletedAt = null` on a soft-deleted record. It does **not** permanently undelete anything — records remain reversible either way.

Key invariants:
- Restore operates on a **deleted** record (`deletedAt IS NOT NULL`). The `BaseRepository.restore()` currently searches with `deletedAt: null` — override this for deleted-record lookup.
- Restore **increments `version`** when the model uses optimistic locking. This signals to stale clients that the record has changed.
- Restore is a **privileged write** — apply role guards at the same level as delete or stricter.

---

## 2. Repository Layer

Override `BaseRepository.restore()` when the model uses optimistic locking, or to scope by studio.

```typescript
// In TaskTemplateRepository
async restore(
  params: { uid: string; studioUid?: string },
): Promise<TaskTemplate> {
  const where: Prisma.TaskTemplateWhereUniqueInput = {
    uid: params.uid,
    ...(params.studioUid && { studio: { uid: params.studioUid } }),
    deletedAt: { not: null },   // Target deleted records only
  };

  return this.prisma.taskTemplate.update({
    where,
    data: {
      deletedAt: null,
      version: { increment: 1 },  // Signal record changed
    },
  });
}
```

**Rule**: Always scope `where` to `deletedAt: { not: null }`. A restore targeting an active record is a no-op at best, a data hazard at worst.

> See [`references/01-restore-repository.md`](references/01-restore-repository.md) for the full pattern including the `findDeleted` helper.

---

## 3. Service Layer

Convert `PrismaClientKnownRequestError` (P2025 record not found) to `HttpError.notFound` at the service boundary — never in the repository.

```typescript
async restore(uid: string, studioUid?: string): Promise<TaskTemplate> {
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

---

## 4. Controller Layer

Use a dedicated `POST /:id/restore` endpoint — not `PATCH` on the same resource, to keep restore intent explicit.

```typescript
// Studio-scoped controller
@Post(':templateId/restore')
@ZodResponse(taskTemplateApiResponseSchema, HttpStatus.OK)
@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
async restore(
  @Param('templateId', UidValidationPipe) templateUid: string,
  @StudioParam() studioUid: string,
) {
  const result = await this.service.restore(templateUid, studioUid);
  return result;
}
```

**Do not** reuse the `PATCH /:id` endpoint to trigger restore — it conflates normal update with lifecycle transition.

---

## 5. Authorization Rules

Apply restore guards at the same level as delete, or stricter:

| Model | Delete role | Restore role |
|-------|-------------|--------------|
| TaskTemplate | ADMIN, MANAGER | ADMIN, MANAGER (same) |
| Future models | Define at design time | Default: same as delete |

If a model has dependency constraints (e.g. a template with active tasks), restore must validate those before committing. Throw `HttpError.conflict()` from the service — not from the repository.

---

## 6. Dependency / Policy Constraints

Before restoring, check whether restore is safe:

```typescript
async restore(uid: string, studioUid?: string): Promise<TaskTemplate> {
  // Optional: check if a replacement record was created while this one was deleted
  const conflict = await this.repository.findActiveByName(existingRecord.name, studioUid);
  if (conflict) {
    throw HttpError.conflict('A template with this name already exists.');
  }
  return this.repository.restore({ uid, studioUid });
}
```

Common checks:
- **Uniqueness conflict**: a replacement record with the same unique key was created while deleted.
- **Dependency state**: records that depended on this one have since been reassigned or removed.
- **Role constraints**: record belongs to a studio or scope that the caller no longer has access to.

---

## 7. Listing Deleted Records (Prerequisite for Restore UI)

Restore requires the client to know the deleted record exists. Add a `findDeleted` or include `includeDeleted` param to the list endpoint.

```typescript
// Repository
async findPaginated(params: { includeDeleted?: boolean; ... }) {
  const where = params.includeDeleted ? {} : { deletedAt: null };
  // ...
}
```

Expose `deleted_at` in the API response so the frontend can show restore actions only on deleted records.

---

## 8. Version Behavior Summary

| Operation | Version change |
|-----------|---------------|
| `softDelete` | No increment (record is being hidden) |
| `restore` | **Increment by 1** (record state changed) |
| `update` | Increment by 1 |

Clients holding a stale version after restore will receive `409 Conflict` on their next version-guarded write, prompting a refresh. This is correct behavior.

---

## Related Skills

- **[Database Patterns](../database-patterns/SKILL.md)**: Soft delete schema rules and `BaseRepository`.
- **[Database Patterns — Optimistic Locking](../database-patterns/SKILL.md#6-optimistic-locking-version-check)**: Version conflict error and service handling.
- **[Repository Pattern](../repository-pattern-nestjs/SKILL.md)**: Repository extension patterns.
- **[Backend Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md)**: Controller decorators and guards.
