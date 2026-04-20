---
name: shared-api-types
description: Provides guidelines for using keys, schemas, and types from the shared @eridu/api-types package. This skill should be used when defining API contracts, ensuring type safety between frontend and backend, or implementing Zod schemas.
---

# Shared API Types & Schemas

This skill outlines the standards for using the `@eridu/api-types` package. This package is the **Single Source of Truth** for API contracts between Backend, Frontend, and external services.

## When to Use

| Use Case                   | Location               | Reason                                       |
| :------------------------- | :--------------------- | :------------------------------------------- |
| **API Responses**          | `packages/api-types`   | Ensures FE and BE agree on response shape    |
| **API Requests**           | `packages/api-types`   | Ensures inputs are validated consistently    |
| **Shared Enums**           | `packages/api-types`   | Consistency (e.g., `ShowStatus`, `UserRole`) |
| **Internal Service Logic** | `apps/erify_api/...`   | Keep implementation details private          |
| **DB Models**              | `prisma/schema.prisma` | DB layer should be separate from API layer   |

## Directory Structure

Organize by **Domain Resource**:

```
packages/api-types/src/
├── shows/        # Domain: Shows
├── users/        # Domain: Users
├── task-management/ # Domain: Task Management
│   ├── index.ts      # Exports
│   ├── task-template.schema.ts
│   └── template-definition.schema.ts
└── pagination/       # Shared utilities
```

## Import Strategy (Subpath Exports)

Always use subpath imports to keep domains separated.

```typescript
// ✅ Correct
import { TaskTemplate } from '@eridu/api-types/task-management';
import { User } from '@eridu/api-types/users';

// ❌ Avoid (if root export exists)
import { TaskTemplate } from '@eridu/api-types'; 
```

> [!NOTE]
> Default preference is to keep schema-derived exports close together, but the current `@eridu/api-types` package still has a mixed layout: several domains export both `schemas.ts` and `types.ts`. Preserve the existing layout inside a touched domain unless the task explicitly includes a domain-local consolidation/refactor.

## Implementation Pattern

### 1. Define Zod Schemas (`schemas.ts`)

Define schemas that represent the **wire format** (usually `snake_case`).

```typescript
import { z } from 'zod';

export const userApiResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  created_at: z.string(),
});

export const createUserDtoSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});
```

### 2. Infer TypeScript Types (`types.ts`)

ALWAYS infer types from the Zod schemas. Never manually duplicate interfaces.

```typescript
import type { z } from 'zod';
import { userApiResponseSchema, createUserDtoSchema } from './schemas.js';

export type UserApiResponse = z.infer<typeof userApiResponseSchema>;
export type CreateUserDto = z.infer<typeof createUserDtoSchema>;
```

### 3. Usage in Backend (`erify_api`)

Import schemas for validation decortors and types for strongly-typed services.

```typescript
// Controller
import { createUserDtoSchema, CreateUserDto } from '@eridu/api-types/users';

@Post()
// Validate input body with shared schema
@UsePipes(new ZodValidationPipe(createUserDtoSchema))
create(@Body() body: CreateUserDto) { ... }
```

### 4. Usage in Frontend (`erify_creators`)

Import types for API clients and schemas for form validation.

```typescript
import { type CreateUserDto, createUserDtoSchema } from '@eridu/api-types/users';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Use shared schema for form validation
const form = useForm<CreateUserDto>({
  resolver: zodResolver(createUserDtoSchema)
});
```

## Schema Composition Rule

When a shared Zod schema needs downstream composition with `.omit()`, `.pick()`, `.partial()`, or `.extend()`, export an unrefined object schema alongside the refined contract schema.

```typescript
export const createStudioShowInputObjectSchema = z.object({
  // fields
});

export const createStudioShowInputSchema = createStudioShowInputObjectSchema.refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  },
);
```

Use the refined schema at API boundaries and the base object schema when feature code needs to derive form-specific variants. This avoids Zod runtime errors from calling object helpers on schemas that already contain refinements.

## Transform Pattern for Prisma → DTO

### When a transform is required

A Zod schema needs a `.transform()` whenever the raw Prisma output **does not match** the wire-format directly. This happens when:

- **Fields need renaming**: `createdAt` → `created_at`, `dueDate` → `due_date`
- **Types need converting**: `Date` → ISO string, `bigint` → string
- **`uid` maps to `id`**: Prisma exposes both a bigint `id` and a string `uid`; the API always exposes `uid` as `id`
- **Relations are nested differently**: Polymorphic joins (see below)

### Standard DTO transform

```typescript
// Entity schema (matches Prisma output exactly — camelCase, bigint ids, Date objects)
export const taskSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith('task_'),
  createdAt: z.date(),
  // ...
});

// Base DTO schema (wire format — snake_case, string ids, ISO strings)
export const baseTaskDtoSchema = z.object({
  id: z.string(),          // maps from uid
  created_at: z.string(),  // maps from createdAt.toISOString()
  // ...
});

// DTO with transform
export const taskDto = taskSchema.transform((obj): z.infer<typeof baseTaskDtoSchema> => ({
  id: obj.uid,
  created_at: obj.createdAt.toISOString(),
  // ...
}));
```

### Polymorphic relation DTO transform

When a Prisma model uses a **polymorphic join table** (e.g., `TaskTarget` that links tasks to shows, studios, etc.), Prisma cannot use a simple `include: { show: true }` — you must include the join table and then include the relation from there.

The join table field name in the Prisma model (e.g., `targets`) is **not** the same as the target resource name (`show`). The schema transform must explicitly flatten this.

```typescript
// ❌ WRONG — no transform, mismatch at runtime
export const taskWithRelationsDto = baseTaskDtoSchema.extend({
  show: z.object({ ... }).nullable(),  // Prisma doesn't return a flat `show`
});

// ✅ CORRECT — include task.targets[0].show, then flatten in transform

// Step 1: Entity schema that mirrors the Prisma include shape
export const taskWithRelationsSchema = taskSchema.extend({
  assignee: z.object({ uid: z.string(), name: z.string() }).nullable().optional(),
  template: z.object({ uid: z.string(), name: z.string() }).nullable().optional(),
  // Prisma field is `targets` (TaskTarget[]), NOT `shows`
  targets: z.array(z.object({
    show: z.object({
      uid: z.string(),
      name: z.string(),
      startTime: z.date(),   // Prisma camelCase of start_time
      endTime: z.date(),
    }).nullable(),
  })).optional(),
});

// Step 2: DTO schema (output wire format)
export const baseTaskWithRelationsDtoSchema = baseTaskDtoSchema.extend({
  assignee: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  template: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  show: z.object({ id: z.string(), name: z.string(), start_time: z.string(), end_time: z.string() }).nullable().optional(),
});

// Step 3: Transform — flatten targets[0].show into a top-level show field
export const taskWithRelationsDto = taskWithRelationsSchema.transform(
  (obj): z.infer<typeof baseTaskWithRelationsDtoSchema> => {
    let show = null;
    const s = obj.targets?.[0]?.show;
    if (s) {
      show = { id: s.uid, name: s.name, start_time: s.startTime.toISOString(), end_time: s.endTime.toISOString() };
    }
    return {
      id: obj.uid,
      // ... other mapped fields
      assignee: obj.assignee ? { id: obj.assignee.uid, name: obj.assignee.name } : obj.assignee,
      template: obj.template ? { id: obj.template.uid, name: obj.template.name } : obj.template,
      show,
    };
  }
);
```

> [!IMPORTANT]
> When the Prisma query includes a join table (e.g., `targets: { include: { show: true } }`), the repository **MUST filter** the join table to the correct `targetType` to ensure `targets[0]` is always a show. Use: `targets: { where: { targetType: 'SHOW', deletedAt: null }, include: { show: true } }`.

> [!NOTE]
> Always use `uid` (not `id`) when mapping relation `id` fields in the transform. Prisma `id` columns are `bigint` and cannot be serialized to JSON; `uid` is the public string identifier.

---

## Package API Discipline

Always use the API recommended by the **installed version** of each package. Do not use deprecated APIs even if they still work — and do not copy patterns from older files in the codebase without verifying they are current. If autocomplete or docs mark an API as `@deprecated`, find the replacement first.

## Checklist

- [ ] New API contract? Add to `@eridu/api-types` first.
- [ ] Group by domain folder (`src/my-domain/`).
- [ ] Export `schemas` (runtime) and `types` (static).
- [ ] Use `snake_case` for wire formats.
- [ ] Infer types using `z.infer`.
- [ ] Use only non-deprecated APIs for the installed package version.
- [ ] All consumers (service, schema, controller, specs) import from subpath, never barrel root.
