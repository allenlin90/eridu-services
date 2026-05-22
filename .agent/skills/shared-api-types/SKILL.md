---
name: shared-api-types
description: Provides guidelines for using keys, schemas, and types from the shared @eridu/api-types package. This skill should be used when defining API contracts, ensuring type safety between frontend and backend, or implementing Zod schemas.
---

# Shared API Types & Schemas

`@eridu/api-types` is the **Single Source of Truth** for API contracts between backend, frontend, and external services.

> See [references/api-types-details.md](references/api-types-details.md) for extended code examples, Prisma-to-DTO transforms, and finance contracts.

## Directory Structure

Organized by domain: `src/shows/`, `src/users/`, `src/task-management/`, `src/pagination/`.

## Import Strategy (Subpath Exports)

```typescript
// ✅ Correct
import { TaskTemplate } from '@eridu/api-types/task-management';
// ❌ Avoid barrel root
import { TaskTemplate } from '@eridu/api-types';
```

## Task Template Schema Engine Helpers

Never infer storage/report keys directly from a field object. Use shared helpers from `@eridu/api-types/task-management`:

| Helper | Use |
|---|---|
| `getSchemaEngine(schema)` | Distinguish v1 vs v2 schemas |
| `getFieldContentKey(schema, field)` | Read/write `task.content` key |
| `getFieldSharedKey(schema, field)` | Resolve canonical shared-field identity |
| `getFieldReportDescriptor(schema, templateUid, field)` | Build reportable column keys |

## Task Template System Facts

PR 12 system fact bindings are defined in `packages/api-types/src/task-management/template-definition.schema.ts` and exported from `@eridu/api-types/task-management`:

| Export | Use |
|---|---|
| `SystemFactKeyEnum` | Closed wire enum for `FieldItemV2.system_fact_key` |
| `SYSTEM_FACT_KEY_DEFINITIONS` | Label, backing column, target scope, and compatible field type catalog |
| `getSystemFactKeyDefinition()` | Read one catalog entry by key |

Do not duplicate the fact-key list in frontend or backend code. Use the existing `require_reason` sidecar flow for creator attendance explanations instead of adding a separate reason fact key. Analytical platform metrics such as GMV and viewer count stay out of this catalog until the 12.5 analytics storage decision lands.

## Key Rules

1. **Schemas define wire format** — `snake_case` for API JSON
2. **Types inferred from Zod** — never manually duplicate interfaces (`z.infer<typeof schema>`)
3. **Schema composition** — export unrefined object schema alongside refined schema for downstream `.omit()`/`.extend()`
4. **Prisma → DTO transforms** — use `.transform()` when raw Prisma output doesn't match wire format
5. **Subpath imports** — always import from domain subpath, never barrel root
6. **Non-deprecated APIs** — verify installed package version before using any API
7. **Doc sync** — changes to `template-definition.schema.ts` must update all artifacts in task-templates feature doc

## Checklist

- [ ] New API contract added to `@eridu/api-types` first
- [ ] Grouped by domain folder (`src/my-domain/`)
- [ ] Exports: `schemas` (runtime) + `types` (static)
- [ ] Wire format uses `snake_case`
- [ ] Types inferred via `z.infer`
- [ ] Consumers import from subpath, never barrel root
- [ ] Only non-deprecated APIs used
- [ ] Task-template `system_fact_key` consumers use the shared fact catalog, not local string arrays
