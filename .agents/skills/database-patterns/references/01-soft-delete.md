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

## Exception: Historical Snapshot Label Reads

Resolving a uid to the display name an already-written immutable record was captured
under (audit snapshots, held-back conflict diffs) deliberately omits the filter — an
entity soft-deleted after the snapshot was taken must still resolve, or history goes
blank. Keep it a label-only projection, and make the deviation impossible to "fix"
back: an inline justification plus a test asserting the absent filter.

```typescript
// ✅ CORRECT for a historical snapshot label read
// Engineering decision: intentionally omits `deletedAt: null` — this snapshot is an
// immutable record, so a creator soft-deleted after it was written must still resolve
// to the name the diff was recorded under.
const creators = await this.txHost.tx.creator.findMany({
  where: { uid: { in: creatorUids } },
  select: { uid: true, name: true }, // label-only — never revive a row into live logic
});
```

```typescript
// The guarding test — asserts the exact `where`, so adding `deletedAt: null` fails here
expect(mockTx.creator.findMany).toHaveBeenCalledWith(
  expect.objectContaining({ where: { uid: { in: ['creator_1'] } } }),
);
```

Reference: `ScheduleConflictService.resolveHeldBackLabels` / `.resolveFieldRecord`.

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
