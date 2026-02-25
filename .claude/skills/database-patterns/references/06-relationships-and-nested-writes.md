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

Prefer explicit nullable foreign keys over polymorphic `entity_id + entity_type` columns.

```typescript
// ✅ CORRECT: Explicit Nullable FKs ("Exclusive Arc" Pattern)
// Strong FK constraints, native Prisma include support, full type safety
model Task {
  id       BigInt  @id
  showId   BigInt?
  show     Show?   @relation(fields: [showId], references: [id])
  clientId BigInt?
  client   Client? @relation(fields: [clientId], references: [id])
}

// ❌ WRONG: Polymorphic — no FK constraint, no native include, manual type narrowing
model Task {
  id           BigInt @id
  taskableId   BigInt // No FK! Orphan data risk
  taskableType String // "show" | "client"
}
```

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
