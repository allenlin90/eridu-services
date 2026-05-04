---
name: task-template-builder
description: Provides guidelines for the Task Template Builder architecture, including Schema alignment, Draft storage, Drag-and-Drop, and Validation logic.
---

# Task Template Builder Pattern

This skill documents the architecture of the Task Template Builder in `erify_studios`.

> **Documentation sync requirement**: any change to template schema shape, builder behavior, shared-field insertion semantics, or content-key strategy must update every artifact listed in the [Task Templates feature doc — Maintenance: Documentation Sync](../../../docs/features/task-templates.md#maintenance-documentation-sync) section in the same PR. Do not split doc updates into a follow-up. Run [.agent/workflows/knowledge-sync.md](../../workflows/knowledge-sync.md) for the general mechanism.

## Core Architecture

### 1. Schema Alignment (Single Source of Truth)

The Task Template Builder uses a **Shared Zod Schema** to ensure frontend and backend are always in sync.

- **Source**: `packages/api-types/src/task-management/template-definition.schema.ts`
- **Frontend Usage**: `import { FieldItemSchema } from '@eridu/api-types/task-management'`
- **Backend Usage**: `import { TemplateSchemaValidator } from '@eridu/api-types/task-management'`

> **Crucial Rule**: Never duplicate validation logic. If you need a new field or rule, update `api-types` first.

### 2. Draft Storage (IndexedDB)

> **Note**: IndexedDB draft persistence is **not yet implemented** in the template builder. The builder currently holds state in React only (lost on unmount). This section documents the intended pattern for future implementation.
>
> `idb-keyval` IS used elsewhere in the codebase — for task execution and action sheet drafts (`task-execution-sheet.tsx`, `studio-task-action-sheet.tsx`) — so the pattern is established and proven.

**Why IndexedDB over localStorage (when implemented)?**
- **Capacity**: Task templates can be large (HTML descriptions, many fields). localStorage (5MB) runs out quickly.
- **Async**: Prevents blocking the main thread during auto-save of large objects.

**Intended Implementation**:
```typescript
const DRAFT_KEY = 'task_template_draft';

// Load
useEffect(() => {
  get(DRAFT_KEY).then(saved => setTemplate(saved || defaultTemplate));
}, []);

// Save (Debounced)
const debouncedSave = useDebounceCallback((data) => {
  set(DRAFT_KEY, data);
}, 1000);
```

### 3. Drag and Drop (@dnd-kit)

We use `@dnd-kit/core` and `@dnd-kit/sortable` for the field list.

**Key Components**:
- `DndContext`: Wraps the list.
- `SortableContext`: Wraps the items.
- `SortableFieldItem`: Individual item component using `useSortable`.

**Constraint**:
- `dnd-kit` requires a stable `id` for every item.
- We generate a frontend-only `id` (`crypto.randomUUID()`) for every field.
- **IMPORTANT**: This `id` must be **stripped** before sending to the backend!

### 4. Advanced Validation Logic (`require_reason`)

The builder supports complex conditional validation based on field type.

**Structure**:
```typescript
require_reason: z.union([
  z.enum(['always', 'on-true', 'on-false']), // Primitive (checkbox)
  z.array(z.object({                         // Complex (number, date, select)
    op: z.enum(['lt', 'eq', 'in', ...]),
    value: z.any()
  }))
])
```

**Supported Operators per Type**:
- **Number**: `lt`, `lte`, `gt`, `gte`, `eq`, `neq`
- **Date/Datetime**: `lt` (Before), `gt` (After), `eq` (On)
- **Select**: `eq` (Is), `neq` (Is Not)
- **Multiselect**: `in` (Is One Of), `not_in` (Is Not One Of)

When `require_reason` is triggered during task execution, `JsonForm` stores the explanation in a flat sidecar key: `<fieldKey>__reason`. Optional structured metadata for the same field uses `<fieldKey>__extra`. Report exports append these sidecars to the selected field's cell instead of creating extra columns or rows.

### 5. Payload Transformation

Before submitting to the API, the frontend payload must be transformed:

1. **Include IDs**: Keep the stable `id` fields as they are part of the shared schema.
2. **Nest Items**: specific API structure requires `{ schema: { items: [...] } }`.
3. **Filter Empty**: Remove empty options or invalid rules.

```typescript
const payload = {
  name: data.name,
  schema: {
    items: data.items.map((item) => ({
      ...item,
      options: item.options?.filter(o => o.value)
    }))
  }
};
```

### 6. Shared Fields Insertion (Studio Settings Integration)

Task template authors can insert studio-managed shared fields directly from the builder.

- Source endpoint: `GET /studios/:studioId/settings/shared-fields`
- Admin shortcut route in `erify_studios`: `/studios/$studioId/shared-fields`
- Read access: `ADMIN` and `MANAGER` can load the shared-field catalog for template authoring.
- Canonical shared-field insertion uses exact shared key/type and sets `standard: true`.
- Repeated insertions (for loop-specific moderation data collection) should generate unique keys and be treated as loop-scoped template fields unless the key is exactly the canonical shared key.
- UI must lock shared-field `key`/`type` editing (label/description remain editable).
- Only active shared fields (`is_active: true`) should appear in the insertion picker.
- Template create/edit pages must revalidate shared fields on mount (`refetchOnMount: 'always'`) to avoid stale picker options after settings updates.
- Shared-field settings mutations must invalidate shared-field query keys so downstream routes immediately observe updates.
- If shared fields fail to load, template pages must show a visible warning that shared-field insertion is temporarily unavailable.
- Admin-only settings shortcuts must not be shown to manager users; non-admin authors should see guidance to ask a studio admin to create shared fields when the catalog is empty.

This keeps template payloads compatible with backend validation that enforces:
- `standard: true` key must exist in studio shared fields
- shared-field type must match studio shared-field type exactly

## Checklist

- [ ] Field validation uses shared Zod schema from `@eridu/api-types/task-management`
- [ ] Drafts are persisted to IndexedDB (not localStorage) — **not yet implemented in builder, see §2**
- [ ] Auto-save uses debounced writes (1s)
- [ ] `@dnd-kit` items have stable `id` from `crypto.randomUUID()`
- [ ] Payload is transformed before API submission (empty options filtered)
- [ ] `require_reason` operators match field type (number/date/select/multiselect)
- [ ] Task execution reason sidecars (`<fieldKey>__reason`, `<fieldKey>__extra`) remain flat and report into the same selected field column
- [ ] Shared-field insertions use `standard: true` with locked key/type semantics
- [ ] Shared-field queries are revalidated on template page mount and invalidated after settings mutations
- [ ] Shared-field load failures are explicitly surfaced in template create/edit UI
- [ ] No duplicate validation logic between frontend and backend
