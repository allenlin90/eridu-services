# Soft Delete — Code Examples

## Schema Support

```prisma
model User {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt]) // Mandatory — ensures filter is fast
}
```

## Querying

Always filter `deletedAt: null`. Forgetting this returns "zombie" records.

```typescript
// ✅ CORRECT
const activeUsers = await prisma.user.findMany({
  where: { deletedAt: null }
});

// ❌ WRONG — returns deleted records too
const users = await prisma.user.findMany();
```

## Implementing Soft Delete

```typescript
// ✅ CORRECT: Update timestamp instead of deleting
await prisma.user.update({
  where: { uid: 'u_1' },
  data: { deletedAt: new Date() },
});
```

## BaseRepository Helper

The `BaseRepository` already provides `softDelete()` — use it instead of writing raw Prisma calls.

```typescript
// In a repository extending BaseRepository:
async softDeleteUser(uid: string) {
  return this.softDelete({ uid }); // sets deletedAt = now
}
```
