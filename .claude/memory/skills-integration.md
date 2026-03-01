# Skills Integration Guide

This document clarifies how `.agent/skills/` project skills relate to Claude Code memory files.

> **Canonical skill location**: `.agent/skills/`. Claude Code reads skills directly from this path via the `Read` tool — there is no `.claude/skills/` copy.

## Authority Hierarchy

```
1. .agent/skills/           ← PRIMARY (single source of truth)
2. .claude/memory/*.md      ← SECONDARY (quick reference, known issues)
3. Codebase examples        ← VALIDATION (task.service.ts, etc.)
```

## Workflow Trigger (Feature/Refactor)

For feature delivery, behavior changes, and refactors, run:

1. `.agent/workflows/verification.md`
2. `.agent/workflows/knowledge-sync.md`

This keeps docs, skills, workflows/rules, and memory references aligned with shipped behavior.

## Critical Skills Clarifications

### service-pattern-nestjs (PRIMARY)

**Key Rules** (from skill):
1. ✅ Schemas MAY import `Prisma` types to DEFINE payload types
2. ✅ Services MUST import payload types, NOT Prisma types
3. ✅ Use `Parameters<Repository['method']>` for pass-through methods
4. ✅ Repository owns where-clause building (not service)

**Example (CORRECT)**:
```typescript
// schemas/task.schema.ts
import type { Prisma } from '@prisma/client';

// ✅ Schema defines payload FROM Prisma type
export type CreateTaskPayload = Omit<Prisma.TaskCreateInput, 'uid'> & {
  uid?: string;
};

// task.service.ts
import type { CreateTaskPayload } from './schemas';  // ✅ Import payload, NOT Prisma

async create(payload: CreateTaskPayload): Promise<Task> {
  return this.repository.create({ ...payload, uid: this.generateUid() });
}
```

**This clarifies**: My earlier analysis saying "services shouldn't use Prisma types" is correct for SERVICE layer, but SCHEMA layer CAN derive payloads from Prisma types. The key is the **abstraction boundary**.

### repository-pattern-nestjs (PRIMARY)

**Key Rules**:
1. ✅ ALL repositories MUST extend `BaseRepository<T, C, U, W>`
2. ✅ Create ModelWrapper implementing `IBaseModel`
3. ✅ Use `findFirst` for soft-delete filtering (not `findUnique`)
4. ✅ Implement `findPaginated` accepting domain parameters
5. ✅ Repository builds Prisma where clauses internally

**Pattern**:
```typescript
// Repository accepts domain params
async findPaginated(params: {
  name?: string;
  uid?: string;
  includeDeleted?: boolean;
}): Promise<{ data: T[]; total: number }> {
  // Repository builds Prisma where clause
  const where: Prisma.TaskWhereInput = {};
  if (!params.includeDeleted) where.deletedAt = null;
  if (params.name) where.name = { contains: params.name };
  // ...
}
```

### shared-api-types (PRIMARY)

**Key Rules**:
1. ✅ API types are snake_case (wire format)
2. ✅ Always use subpath imports: `@eridu/api-types/domain`
3. ✅ Infer types from Zod schemas (never duplicate)
4. ✅ Backend AND frontend use same schemas

**Pattern**:
```typescript
// In @eridu/api-types/tasks/schemas.ts
export const taskApiResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string(),
});

export type TaskApiResponse = z.infer<typeof taskApiResponseSchema>;

// Backend usage
import { taskApiResponseSchema } from '@eridu/api-types/tasks';
// Transform and validate
return taskApiResponseSchema.parse(transformedTask);

// Frontend usage
import { type TaskApiResponse } from '@eridu/api-types/tasks';
const tasks: TaskApiResponse[] = await fetchTasks();
```

### erify-authorization (PRIMARY)

**Key Rules**:
1. ✅ Use `@AdminProtected(['permission:read'])` for admin endpoints
2. ✅ Use `@StudioProtected([ADMIN, MANAGER])` for studio-scoped
3. ✅ Permissions stored in JSONB: `roles` + `permissions`
4. ✅ Effective permissions = role permissions + custom permissions
5. ✅ System admin (`isSystemAdmin`) bypasses all checks

**Pattern**:
```typescript
@Controller('admin/tasks')
export class AdminTaskController {
  @Get()
  @AdminProtected('tasks:read')
  list() { ... }

  @Post()
  @AdminProtected('tasks:write')
  create() { ... }
}

@Controller('studios/:studioId/tasks')
export class StudioTaskController {
  @Post()
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER])
  create(@StudioParam() studioUid: string) { ... }
}
```

## Reconciliation with Known Issues

### Issue: "14/18 models expose Prisma types"

**Clarification from skills**:
- ❌ Services MUST NOT import `Prisma` namespace in method signatures
- ✅ Schemas CAN import `Prisma` types to DEFINE payloads
- ❌ Services MUST NOT build Prisma where clauses

**Refined rule**:
```typescript
// ❌ WRONG (service exposes Prisma type)
async getUsers(where: Prisma.UserWhereInput): Promise<User[]>

// ✅ CORRECT (service uses Parameters)
async getUsers(...args: Parameters<UserRepository['findPaginated']>): Promise<User[]>

// ✅ ALSO CORRECT (service uses custom payload)
async getUsers(filters: UserFilters): Promise<User[]>
```

### Issue: "Missing payload abstractions"

**Clarification from skills**:
- ✅ Define payloads in schemas using `Omit<Prisma.XCreateInput, ...>`
- ✅ Services import payload types, NOT Prisma types
- ✅ Use `Parameters<>` for repository pass-through methods

**Valid patterns from skills**:
1. **Custom payload type**: `CreateTaskPayload` (defined in schema)
2. **Parameters spread**: `Parameters<TaskRepository['findOne']>` (for pass-through)
3. **Domain filters**: `UserFilters` interface (for complex queries)

## Updated Ideal Pattern

Based on skills, the CORRECTED ideal pattern:

### Schema Layer
```typescript
// ✅ ALLOWED: Import Prisma to DEFINE payloads
import type { Prisma } from '@prisma/client';

export type CreateTaskPayload = Omit<Prisma.TaskCreateInput, 'uid'> & {
  uid?: string;
};

export type TaskFilters = {
  name?: string;
  studioUid?: string;
  includeDeleted?: boolean;
};
```

### Service Layer
```typescript
// ✅ ONLY import payload types and entity type
import { Task } from '@prisma/client';
import type { CreateTaskPayload, TaskFilters } from './schemas';

// ✅ Use payload type
async create(payload: CreateTaskPayload): Promise<Task>

// ✅ Use Parameters for pass-through
async findOne(...args: Parameters<TaskRepository['findOne']>): Promise<Task | null>

// ✅ Use domain filters
async findAll(filters: TaskFilters): Promise<Task[]>
```

### Repository Layer
```typescript
// ✅ Accept domain parameters, build Prisma queries internally
async findPaginated(params: {
  name?: string;
  uid?: string;
  includeDeleted?: boolean;
}): Promise<{ data: Task[]; total: number }> {
  const where: Prisma.TaskWhereInput = {};
  // Build query here
}
```

## Skills vs Memory Files

### When to Use Skills
- ✅ **Creating new models** → `service-pattern-nestjs`, `repository-pattern-nestjs`
- ✅ **Adding guards** → `erify-authorization`
- ✅ **Frontend API** → `frontend-api-layer`, `frontend-state-management`
- ✅ **Shared types** → `shared-api-types`

### When to Use Memory Files
- ✅ **Quick templates** → `quick-reference.md`
- ✅ **Pre-commit check** → `code-review-checklist.md`
- ✅ **Understanding debt** → `known-issues.md`
- ✅ **Stack questions** → `tech-stack.md`

## Skill Categories

### Backend (NestJS)
1. **service-pattern-nestjs** - Service patterns, payload types
2. **repository-pattern-nestjs** - Repository, BaseRepository
3. **backend-controller-pattern-nestjs** - Controllers, DTOs
4. **authentication-authorization-nestjs** - General auth patterns
5. **erify-authorization** - erify_api-specific auth
6. **database-patterns** - Transactions, soft delete, locking
7. **data-validation** - Zod validation patterns
8. **orchestration-service-nestjs** - Multi-service coordination, bulk ops
9. **jsonb-analytics-snapshot** - Analytics aggregation with JSONB snapshots

### Frontend (React)
10. **frontend-api-layer** - TanStack Query, API client
11. **frontend-state-management** - State patterns
12. **frontend-ui-components** - Component patterns
13. **frontend-testing-patterns** - Testing patterns
14. **frontend-error-handling** - Error boundaries
15. **frontend-performance** - Optimization patterns
16. **frontend-i18n** - Paraglide usage
17. **frontend-code-quality** - Quality standards
18. **frontend-tech-stack** - Stack overview

### Shared
19. **shared-api-types** - @eridu/api-types patterns
20. **design-patterns** - General patterns
21. **solid-principles** - SOLID principles for backend & frontend
22. **engineering-best-practices-enforcer** - Repo-aligned best practices audit & refactor

### Domain-Specific
23. **admin-list-pattern** - Admin list pages
24. **studio-list-pattern** - Studio list pages
25. **task-template-builder** - Task template UI
26. **schedule-continuity-workflow** - Schedule update/validate/publish workflow

### Meta
27. **skill-creator** - Creating new skills
28. **code-quality** - General quality rules

## Key Takeaways

1. **Skills are authoritative** - Trust `.agent/skills/` over memory files
2. **Schemas CAN use Prisma** - To define payload types (abstraction layer)
3. **Services CANNOT use Prisma** - In method signatures or logic
4. **Use Parameters<>** - For repository pass-through methods
5. **Repository builds queries** - Services pass domain filters
