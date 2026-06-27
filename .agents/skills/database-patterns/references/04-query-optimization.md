# Query Optimization — Code Examples

## N+1 Prevention (Eager Loading)

Fetch related data in a single query using `include`.

```typescript
// ✅ CORRECT: 1 query
const shows = await prisma.show.findMany({
  include: { client: true },
});

// ❌ WRONG: 1 + N queries
const shows = await prisma.show.findMany();
for (const show of shows) {
  await prisma.client.findUnique({ where: { id: show.clientId } });
}
```

## Parallel Execution

Run independent queries concurrently with `Promise.all`.

```typescript
// ✅ CORRECT: Runs in parallel (~same DB round-trip cost as one query)
const [users, count] = await Promise.all([
  prisma.user.findMany({ where }),
  prisma.user.count({ where }),
]);

// ❌ WRONG: Runs sequentially (2x latency)
const users = await prisma.user.findMany({ where });
const count = await prisma.user.count({ where });
```

## Paginated Query Pattern (Standard)

```typescript
async findPaginated(query: PaginationQuery) {
  const { skip, take } = query;
  const where = { deletedAt: null };

  const [items, total] = await Promise.all([
    this.prisma.show.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    this.prisma.show.count({ where }),
  ]);

  return { items, total };
}
```
