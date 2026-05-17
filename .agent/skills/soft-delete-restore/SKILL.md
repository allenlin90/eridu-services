---
name: soft-delete-restore
description: Patterns for implementing restore workflows on soft-deleted records in erify_api. Use when adding restore capability to any model (task templates, show creators, shifts, etc.), designing restore permission rules, handling optimistic version conflicts on restore, or building restore endpoints and audit trails.
---

# Soft Delete Restore Pattern

Full contract for restoring soft-deleted records: repository, service, controller, authorization, and version behavior.

**Builds on**: `database-patterns` (soft delete, optimistic locking).

## What Restore Does

Sets `deletedAt = null` on a soft-deleted record. Key invariants:
- Operates on deleted records only (`deletedAt IS NOT NULL`)
- Increments `version` (signals stale clients to refresh)
- Privileged write — apply role guards at same level as delete or stricter

## Layer Pattern

### Repository
Override `BaseRepository.restore()` with `deletedAt: { not: null }` and `version: { increment: 1 }`. Scope by studio when applicable.

### Service
Convert `PrismaClientKnownRequestError` (P2025) to `HttpError.notFound` at service boundary. Check dependency/policy constraints before restoring (uniqueness conflicts, dependency state, role constraints).

### Controller
Use dedicated `POST /:id/restore` endpoint (not `PATCH` on same resource). Apply role guards matching delete permissions.

## Authorization Rules

| Model | Delete role | Restore role |
|---|---|---|
| TaskTemplate | ADMIN, MANAGER | ADMIN, MANAGER (same) |
| Future models | Define at design time | Default: same as delete |

## Version Behavior

| Operation | Version change |
|---|---|
| `softDelete` | No increment |
| `restore` | Increment by 1 |
| `update` | Increment by 1 |

## Listing Deleted Records

Add `includeDeleted` param to list endpoint. Expose `deleted_at` in API response for restore UI.

## Checklist

- [ ] Repository targets `deletedAt: { not: null }` records only
- [ ] Version incremented on restore
- [ ] `POST /:id/restore` endpoint (not PATCH)
- [ ] Role guards same as or stricter than delete
- [ ] Dependency/uniqueness conflicts checked before restore
- [ ] List endpoint supports `includeDeleted` filter

## Related Skills

- [database-patterns](../database-patterns/SKILL.md) — Soft delete, optimistic locking
- [repository-pattern-nestjs](../repository-pattern-nestjs/SKILL.md) — Repository extension
