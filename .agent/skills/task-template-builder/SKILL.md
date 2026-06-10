---
name: task-template-builder
description: Provides guidelines for the Task Template Builder architecture, including Schema alignment, Draft storage, Drag-and-Drop, and Validation logic. Use when implementing or modifying the task template builder UI, draft persistence, or template validation flows.
---

# Task Template Builder Pattern

Architecture of the Task Template Builder in `erify_studios`.

> **Doc sync requirement**: Changes to template schema, builder behavior, shared-field semantics, or content-key strategy must update all artifacts in the [Task Templates feature doc — Maintenance: Documentation Sync](../../../docs/features/task-templates.md#maintenance-documentation-sync) section in the same PR.

## Core Architecture

### 1. Schema Alignment (Single Source of Truth)
- **Source**: `packages/api-types/src/task-management/template-definition.schema.ts`
- 🔴 Never duplicate validation logic. Update `api-types` first.
- `system_fact_key` bindings use the closed `SystemFactKeyEnum` / `SYSTEM_FACT_KEY_DEFINITIONS` catalog from `@eridu/api-types/task-management`; the builder should consume that catalog directly.

### 2. Draft Storage (IndexedDB)
Not yet implemented in builder (React-only state). Pattern established in task execution sheets via `idb-keyval`. When implemented: use `idb-keyval`, debounced 1s auto-save.

### 3. Drag and Drop (`@dnd-kit`)
- `DndContext` → `SortableContext` → `SortableFieldItem`
- v2 fields use `fld_...` IDs as persistent identity — do not strip from payloads

### 4. Validation Logic (`require_reason`)
- Checkbox: `z.enum(['always', 'on-true', 'on-false'])`
- Number: `lt`, `lte`, `gt`, `gte`, `eq`, `neq`
- Date/Datetime: `lt`, `gt`, `eq`
- Select: `eq`, `neq`; Multiselect: `in`, `not_in`
- Reason sidecar: `<fieldKey>__reason`, `<fieldKey>__extra` (flat keys)

### 5. Payload Transformation
Keep `fld_...` IDs, nest as `{ schema: { items: [...] } }`, filter empty options.

🔴 **Engine-aware round-tripping (clone / duplicate / derive).** Any helper that rebuilds a `schema` payload from an existing template (clone, duplicate, "save as", import) MUST be schema-engine aware. The backend `safeParseTemplateSchema` selects the v1 vs v2 validator solely from the top-level `schema_engine` marker — there is no inference from item shape. Two failure modes:
- **Dropping engine metadata** (`schema_engine`, `schema_version`, `content_key_strategy`, `report_projection_strategy`) silently downgrades a v2 template to the v1 validator, which then rejects v2-only keys like `shared_field_key` / `system_fact_key` with `unrecognized_keys` → HTTP 400 `Invalid template schema`.
- **Wrong field IDs**: v2 field `id`s must match `TASK_TEMPLATE_FIELD_ID_PATTERN` (`fld_…`). Regenerate v2 IDs with `createTaskTemplateFieldId()`, NOT `crypto.randomUUID()` (the v1 format). Use `getSchemaEngine(schema)` to branch.

When the schema gains a new top-level engine field, audit every transform helper (grep for `current_schema` / `schema.items`) so the new field is preserved, not silently stripped.

### 6. Shared Fields (Studio Settings)
- Source: `GET /studios/:studioId/settings/shared-fields`
- `shared_field_key` links to canonical shared key; type locked, label/description editable
- Revalidate on mount (`refetchOnMount: 'always'`), invalidate after settings mutations
- Show warning if shared fields fail to load; hide admin-only shortcuts from managers

### 7. System Fact Bindings (PR 12)
- `system_fact_key` is a v2-only field attribute for operational fact extraction.
- The builder exposes this with the user-facing label "Auto-fill record field" plus an info-icon tooltip explaining that the operator's answer updates the matching show/creator/platform record; render it as a searchable combobox and avoid showing "system fact" copy in the producer UI.
- Selecting a system fact in the builder should set the field type to the catalog's compatible `field_type`.
- `creator_attendance_missing` should use `validation.require_reason = 'on-true'` for the explanation instead of a separate reason binding field.
- Save-time validation must reject mismatched field type ↔ fact key pairs and duplicate fact-key bindings in the same template through the shared Zod schema.

## Checklist

- [ ] Field validation uses shared Zod schema from `@eridu/api-types/task-management`
- [ ] `@dnd-kit` items have stable `fld_...` ids
- [ ] Payload transformed before API submission (empty options filtered)
- [ ] Clone/duplicate/derive helpers are engine-aware: preserve `schema_engine` + version markers and regenerate v2 IDs with `createTaskTemplateFieldId()`
- [ ] `require_reason` operators match field type
- [ ] Shared-field insertions use `shared_field_key` with locked type
- [ ] System-fact insertions use `system_fact_key` with the shared catalog's compatible field type and do not duplicate a fact key in the same template
- [ ] Shared-field queries revalidated on mount, invalidated after mutations
- [ ] Shared-field load failures surfaced in UI
- [ ] No duplicate validation logic between frontend and backend
