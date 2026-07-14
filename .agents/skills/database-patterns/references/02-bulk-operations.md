# Bulk Operations — Code Examples

## Batch Insert

```typescript
// ✅ CORRECT: Single query, no loop
await prisma.show.createMany({
  data: shows.map(s => ({ ...s, uid: generateUid() })),
  skipDuplicates: true, // Optional resilience
});

// ❌ WRONG: N queries (one per show)
for (const show of shows) {
  await prisma.show.create({ data: show });
}
```

## Batch Update

```typescript
// ✅ CORRECT: One query
await prisma.show.updateMany({
  where: { clientId: 1, deletedAt: null },
  data: { status: 'PUBLISHED' },
});

// ❌ WRONG: N queries
for (const show of shows) {
  await prisma.show.update({ where: { id: show.id }, data: { status: 'PUBLISHED' } });
}
```

## Bulk Assignee Update (Real Example)

```typescript
// Repository
async updateAssigneeByTaskIds(taskIds: bigint[], assigneeId: bigint) {
  return this.prisma.task.updateMany({
    where: { id: { in: taskIds }, deletedAt: null },
    data: { assigneeId },
  });
}
```
