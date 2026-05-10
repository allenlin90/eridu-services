# Relationships & Nested Writes — Code Examples

## Nested Connect Pattern

Use `connect: { uid }` to link entities. This avoids an extra read query to resolve the `id`.

```typescript
// ✅ CORRECT: Prisma resolves the FK in one round-trip
await prisma.show.create({
  data: {
    client: { connect: { uid: 'client_123' } },
  },
});

// ❌ WRONG: Extra read query just to get the id
const client = await prisma.client.findUnique({ where: { uid: 'client_123' } });
await prisma.show.create({
  data: { clientId: client.id },
});
```

---

## Explicit FK vs Polymorphism

NEVER use a bare `entity_id + entity_type` discriminator alone — it bypasses FK constraints, prevents native Prisma `include`, and risks orphan data.

When polymorphism IS required, pick by whether the target set is open or closed.

### Anti-pattern (always wrong)

```typescript
// ❌ WRONG: bare polymorphic columns — no FK constraint, no native include
model Task {
  id           BigInt @id
  taskableId   BigInt // No FK! Orphan data risk
  taskableType String // "show" | "client"
}
```

### Closed & stable target set → Exclusive Arc on the entity

Use when the set of target types is small AND won't grow (e.g. `Comment → Post | Page`). Multiple typed nullable FKs directly on the entity, with a CHECK constraint enforcing exactly-one-populated.

```typescript
// ✅ CORRECT for closed sets: Exclusive Arc with CHECK
model Comment {
  id     BigInt  @id
  postId BigInt?
  post   Post?   @relation(fields: [postId], references: [id])
  pageId BigInt?
  page   Page?   @relation(fields: [pageId], references: [id])
  // No `target_type` discriminator — derive from "which FK is non-null"
}
```

```sql
-- Migration MUST add the CHECK constraint:
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_exactly_one_target"
  CHECK (num_nonnulls("post_id", "page_id") = 1);
```

### Open & extensible target set → Side table

Use when the set will grow (`Task → Show | Studio | Project | …`, audit-log subjects, `CompensationLineItem` targets, etc.). Polymorphism lives in a dedicated child table; the entity stays narrow.

#### 1:N (parent has many target rows)

```typescript
// ✅ CORRECT for open sets, 1:N: side table with own id
model Task {
  id      BigInt       @id
  targets TaskTarget[]
}

model TaskTarget {
  id         BigInt  @id @default(autoincrement())
  taskId     BigInt
  task       Task    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  targetType String  // discriminator
  targetId   BigInt  // polymorphic uniform key
  showId     BigInt?
  show       Show?   @relation(fields: [showId], references: [id], onDelete: Cascade)
  studioId   BigInt?
  studio     Studio? @relation(fields: [studioId], references: [id], onDelete: Cascade)
  deletedAt  DateTime?

  @@unique([taskId, targetType, targetId])
  @@index([targetType, targetId])
}
```

#### 1:1, polymorphism-only (parent has exactly one target row, immutable)

When every parent row has exactly one target AND the target is set-and-forget, the child's identity *is* the parent FK. Use the parent FK as the PK — no separate `id`, no own audit fields, lifecycle inherits.

```typescript
// ✅ CORRECT for open sets, strict 1:1: side table with parent FK as PK
model CompensationLineItem {
  id     BigInt @id @default(autoincrement())
  // ...business fields, no polymorphic columns
  target CompensationLineItemTarget? // optional only because Prisma 1:1 syntax requires it;
                                     // application creates the child in the same transaction
}

model CompensationLineItemTarget {
  // Parent FK IS the PK — row identity is the parent
  lineItemId         BigInt @id @map("line_item_id")
  lineItem           CompensationLineItem @relation(fields: [lineItemId], references: [id], onDelete: Cascade)
  targetType         CompensationLineItemTargetType
  targetId           BigInt
  showId             BigInt?
  show               Show?  @relation(fields: [showId], references: [id], onDelete: Cascade)
  showCreatorId      BigInt?
  showCreator        ShowCreator? @relation(fields: [showCreatorId], references: [id], onDelete: Cascade)
  studioShiftId      BigInt?
  studioShift        StudioShift? @relation(fields: [studioShiftId], references: [id], onDelete: Cascade)
  studioShiftBlockId BigInt?
  studioShiftBlock   StudioShiftBlock? @relation(fields: [studioShiftBlockId], references: [id], onDelete: Cascade)
  // No `id` — parent FK is the PK
  // No own `createdAt/updatedAt/deletedAt` — lifecycle follows parent

  @@index([targetType, targetId])
}
```

Why `lineItemId` as PK: makes the 1:1 nature visible at the SQL level, saves a column, no separate `@unique` needed, idiomatic for strict 1:1 child tables.

---

## Nested Writes (Atomic Parent + Child Creation)

Use Prisma's nested writes for single-parent + direct-children scenarios. No explicit transaction needed — Prisma handles it.

```typescript
async createTemplateWithSnapshot(payload: CreateTaskTemplatePayload): Promise<TaskTemplate> {
  const version = payload.version ?? 1;

  return this.repository.create({
    ...payload,
    uid: payload.uid ?? this.generateUid(),
    version,
    snapshots: {
      create: {
        version,
        schema: payload.currentSchema ?? {},
      },
    },
  });
}
```

### Nested Writes vs `@Transactional()`

| Pattern | Use When |
|---|---|
| **Nested Writes** | Single parent + direct children, simple relation |
| **`@Transactional()`** | Multiple parents, complex orchestration, conditional logic |
