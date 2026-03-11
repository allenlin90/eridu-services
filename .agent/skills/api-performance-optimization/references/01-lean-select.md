# Lean Select — Audit Checklist and Examples

## Audit Checklist

For each `include` in a repository method, ask:

- [ ] Is the full entity returned to the API response, or only some fields?
- [ ] Are there JSONB columns (`metadata`, `currentSchema`) in the included model?
- [ ] Is this a list query (many rows) or a single-record query?
- [ ] Does the frontend schema (Zod response schema) reference all included fields?

If any answer is "no" / "some" / "list" / "no" → convert `include: true` to `include: { select: { ... } }`.

---

## Before / After Examples

### Example 1: Assignee on Task List

```typescript
// ❌ Before — fetches all User fields (incl. password hash, metadata, etc.)
const tasks = await prisma.task.findMany({
  include: { assignee: true },
});

// ✅ After — fetches only what the response schema needs
const tasks = await prisma.task.findMany({
  include: {
    assignee: { select: { uid: true, name: true } },
  },
});
```

### Example 2: Studio on Task Template List

```typescript
// ❌ Before — fetches full Studio (rooms, membership count, metadata)
const templates = await prisma.taskTemplate.findMany({
  include: { studio: true },
});

// ✅ After
const templates = await prisma.taskTemplate.findMany({
  include: {
    studio: { select: { uid: true, name: true } },
  },
});
```

### Example 3: JSONB Exclusion from List Endpoint

```typescript
// ❌ Before — currentSchema is large JSONB, unnecessary in list
const templates = await prisma.taskTemplate.findMany({ where });

// ✅ After — exclude heavy fields from list, include in detail
const templates = await prisma.taskTemplate.findMany({
  where,
  select: {
    uid: true,
    name: true,
    description: true,
    isActive: true,
    version: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    // currentSchema: omitted
  },
});
```

---

## select vs include — Quick Decision Table

| Situation | Pattern |
|---|---|
| Need one field from relation | `include: { rel: { select: { field: true } } }` |
| Need 2-3 fields from relation | `include: { rel: { select: { a: true, b: true } } }` |
| Need full entity for internal logic | `include: { rel: true }` (acceptable, but verify) |
| List endpoint with heavy JSONB field | Use `select` at top level, omit JSONB column |
| Detail endpoint (single record) | `include: true` acceptable if full entity needed |
