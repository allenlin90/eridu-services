# Pagination Patterns

## Standard Offset Pagination (Admin / Low-Volume Lists)

Use offset pagination for admin views where total count is needed and dataset size is bounded.

```typescript
// Schema (api-types)
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Repository
const skip = (page - 1) * limit;
const [data, total] = await Promise.all([
  prisma.model.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
  prisma.model.count({ where }),
]);
return { data, total, page, limit };
```

**Response envelope** (matches existing admin list pattern):
```json
{
  "data": [...],
  "total": 240,
  "page": 1,
  "limit": 20
}
```

---

## Cursor-Based Pagination (Studio Feeds / Infinite Scroll)

Use cursor pagination for infinite-scroll studio views where total count is not required.

```typescript
// Schema (api-types) — cursor replaces page
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),  // last seen uid
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Repository
const items = await prisma.model.findMany({
  where,
  take: limit + 1,  // fetch one extra to determine hasMore
  ...(cursor && { cursor: { uid: cursor }, skip: 1 }),
  orderBy: { createdAt: 'desc' },
});

const hasMore = items.length > limit;
const data = hasMore ? items.slice(0, limit) : items;
const nextCursor = hasMore ? data[data.length - 1].uid : null;

return { data, nextCursor };
```

**Response envelope**:
```json
{
  "data": [...],
  "next_cursor": "tmpl_abc123"
}
```

---

## Parameter Name Convention

Use `limit` (not `pageSize`) for records-per-page across all endpoints.
This is the standardized contract — see Phase 5 tech debt note in `docs/roadmap/PHASE_5.md`.

| ✅ Use | ❌ Avoid |
|--------|---------|
| `limit` | `pageSize`, `per_page`, `size` |
| `page` | `p`, `pageNumber` |
| `cursor` | `after`, `next`, `token` |

---

## Max Cap Enforcement

Never skip the `max()` validator on `limit`:

```typescript
// Without max — client can request limit=10000, causing full table scan
limit: z.coerce.number().int().min(1).default(20)  // ❌

// With max — hard cap regardless of client input
limit: z.coerce.number().int().min(1).max(100).default(20)  // ✅
```
