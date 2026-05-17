---
name: admin-list-pattern
description: Provides full-stack patterns for implementing searchable, paginated lists in the Erify Admin section. This skill should be used when adding or updating admin tables that require server-side filtering and debounced search.
---

# Admin List Integration Pattern

Standard pattern for searchable, paginated lists in admin sections across `erify_studios` (frontend) and `erify_api` (backend).

## Canonical Examples

- **Controller**: [admin-client.controller.ts](../../../apps/erify_api/src/admin/clients/admin-client.controller.ts)
- **Repository**: [client.repository.ts](../../../apps/erify_api/src/models/client/client.repository.ts)

## Integration Overview

```
Frontend (useTableUrlState → URL params) → API (QueryDto) → Service (pass-through) → Repository (Prisma where)
```

## Backend Pattern

### 1. Query DTO
Extend base pagination with filters. Transform to `take`/`skip`:
```typescript
export const listResourceQuerySchema = z
  .object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).default(10) })
  .and(listResourceFilterSchema)
  .transform((d) => ({ ...d, take: d.limit, skip: (d.page - 1) * d.limit }));
```

### 2. Repository
Build `where` clause with `contains` + `insensitive`. Use `Promise.all` for data + count.

### 3. Service
Thin pass-through to `repository.findPaginated()`.

### 4. Controller
Use `@AdminPaginatedResponse` decorator, pass query DTO to service.

## Frontend Pattern

- **Route search schema**: Use `limit` (not `pageSize`) as URL param
- **`useTableUrlState`**: Owns URL synchronization, bridges `limit` → TanStack Table's `pageSize`
- **DataTable + DataTableToolbar**: Pass `searchColumn`, debounced input (500ms)

## Checklist

- [ ] Backend: QueryDto extends pagination with filters
- [ ] Backend: Repository builds `where` with `contains`/`insensitive`
- [ ] Backend: Service delegates to `repository.findPaginated()`
- [ ] Frontend: `useTableUrlState` for URL sync
- [ ] Frontend: `searchColumn` passed to `DataTableToolbar`
- [ ] Frontend: Debounced search behavior verified

## Related Skills

- [table-view-pattern](../table-view-pattern/SKILL.md) — Table view patterns
- [studio-list-pattern](../studio-list-pattern/SKILL.md) — Studio infinite scroll
