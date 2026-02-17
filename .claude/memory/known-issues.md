# Known Issues & Technical Debt

## ⚠️ Critical: Architectural Inconsistencies in erify_api

**Context**: Previous code agents had hallucinations and didn't follow the desired patterns consistently. While `task-template` was mentioned as the ideal, analysis shows **task model** actually comes closest to best practices.

⚠️ **Important**: Even the "best" examples (task, task-template) still need refactoring to achieve full compliance with strict patterns:
- **Controllers** must filter unnecessary DTO properties (not pass entire DTOs to services)
- **Services** must be strictly forbidden from ANY Prisma type imports (currently some use `Parameters<>` which indirectly includes Prisma)
- **Services** must be fully context-agnostic (callable from HTTP, CLI, jobs without changes)

The skills have been updated (2026-02-15) to reflect these stricter requirements.

## Issue 1: Direct Prisma Type Exposure in Service Layer 🔴

**Affected**: 14/18 models (user, studio, show, client, schedule, studio-membership, mc, platform, show-mc, show-platform, show-standard, show-status, show-type, studio-room)

**Problem**: Services expose Prisma types directly in method signatures instead of using domain payload types.

**Examples**:
```typescript
// ❌ BAD - user.service.ts
async getUsers(params: {
  where?: Prisma.UserWhereInput;  // Direct Prisma type
}): Promise<User[]>

// ❌ BAD - studio.service.ts
async updateStudio(uid: string, data: Prisma.StudioUpdateInput): Promise<Studio>

// ✅ GOOD - task.service.ts
async create(payload: CreateTaskPayload): Promise<Task>
```

**Why it matters**:
- Tight coupling to Prisma
- Harder to test
- Difficult to change ORM later
- Breaks separation of concerns

## Issue 2: Missing Payload Type Abstractions 🔴

**Affected**: 15/18 models

**Problem**: Most models don't define service-layer payload types. Only `task`, `task-template`, and partially `schedule-snapshot` have them.

**What's missing**:
```typescript
// Should exist in every model's schema file:
export type CreateModelPayload = Omit<Prisma.ModelCreateInput, 'uid'> & { uid?: string };
export type UpdateModelPayload = Prisma.ModelUpdateInput;
```

**Impact**: Services directly use DTOs or Prisma types, mixing concerns.

## Issue 3: Service Layer Building Prisma Queries 🔴

**Affected**: show, schedule, user, client (10/18 models)

**Problem**: Services contain Prisma-specific query building logic that belongs in repository layer.

**Example**:
```typescript
// ❌ BAD - show.service.ts (lines 175-258)
private buildShowWhereClause(filters: {...}): Prisma.ShowWhereInput {
  const where: Prisma.ShowWhereInput = {};

  if (filters.client_id) {
    where.client = {  // Prisma-specific structure
      uid: { in: clientIds },
      deletedAt: null,
    };
  }
  // ... more Prisma query building in service
  return where;
}
```

**Should be**: Query building logic in repository layer, service uses domain filters.

## Issue 4: Inconsistent DTO Transformation Strategies 🟡

**Problem**: Three different patterns in use:

1. **Service-level payload builders** (show, schedule, studio-membership)
   - Private `buildCreatePayload()` methods
   - Transform DTOs within service

2. **Schema-level transformation** (user, studio)
   - `.transform()` in Zod schema
   - DTO emerges already transformed

3. **Direct pass-through** (task, task-template)
   - Minimal transformation
   - Payload types used directly

**Impact**: Inconsistent codebase, harder to onboard new developers.

## Issue 5: Missing Internal vs External Schema Separation 🟡

**Affected**: 15/18 models

**Problem**: Only `studio-membership` properly separates internal schemas from API schemas.

**What studio-membership has** (that others lack):
- Internal schemas separate from API schemas
- Assert helper functions for runtime validation
- Multiple DTO variants for different use cases
- Comprehensive typing exports

**Example structure**:
```typescript
// studio-membership.schema.ts ✅
// Internal schemas
export const studioMembershipSchema = z.object({ ... });

// API DTOs (transformation)
export const studioMembershipDto = studioMembershipSchema
  .transform(...)
  .pipe(membershipApiResponseSchema);

// Assert helpers
export function assertStudioMembershipSchema(data: unknown) { ... }
```

## Issue 6: Inconsistent Method Naming 🟢

**Problem**: Different naming patterns across services:
- `create()` vs `createX()` vs `createFromDto()`
- `update()` vs `updateX()`
- `findOne()` vs `findByUid()` vs `getByUid()`

**Impact**: Unpredictable API, harder to navigate codebase.

## The True "Ideal Pattern"

Analysis shows **task model** comes closest to best practices:

### ✅ Task Model Strengths:
```typescript
// task.service.ts
import { Task } from '@prisma/client';  // ONLY entity type
import type { CreateTaskPayload, UpdateTaskPayload } from './schemas/task.schema';

// Minimal Prisma exposure
async create(payload: CreateTaskPayload): Promise<Task>
async update(uid: string, payload: UpdateTaskPayload): Promise<Task>
```

### ✅ Recommended Pattern (Best of task + studio-membership):

```typescript
// 1. Schema (schemas/model.schema.ts)
import type { Prisma } from '@prisma/client';

// Payload types (service layer abstraction)
export type CreateModelPayload = Omit<Prisma.ModelCreateInput, 'uid'> & { uid?: string };
export type UpdateModelPayload = Prisma.ModelUpdateInput;
export type ModelFilters = { /* domain filters */ };

// API DTOs
export class CreateModelDto extends createZodDto(createModelSchema) {}

// Assert helpers
export function assertModelSchema(data: unknown): asserts data is Model { ... }

// 2. Service (model.service.ts)
import { Model } from '@prisma/client';  // Only entity type
import type { CreateModelPayload, UpdateModelPayload } from './schemas';

export class ModelService {
  async create(payload: CreateModelPayload): Promise<Model> {
    return this.repository.create(payload);
  }

  async createFromDto(dto: CreateModelDto): Promise<Model> {
    const payload: CreateModelPayload = {
      ...dto,
      uid: this.generateUid(),
    };
    return this.create(payload);
  }
}
```

## Files Requiring Refactoring

### 🔴 High Priority (Direct Prisma Exposure):

1. **user.service.ts** - Add payload types, remove `Prisma.UserWhereInput` from signatures
2. **studio.service.ts** - Add payload types, remove `Prisma.StudioUpdateInput`
3. **show.service.ts** - Add payload types, move `buildShowWhereClause` to repository
4. **client.service.ts** - Add payload types, move query building to repository
5. **schedule.service.ts** - Add payload types, move query building to repository
6. **studio-membership.service.ts** - Add payload types

### 🟡 Medium Priority (Schema Consistency):

7-17. **All model schema files** - Add payload type definitions:
   - mc, platform, show-mc, show-platform, show-standard
   - show-status, show-type, studio-room, schedule-snapshot

### 🟢 Low Priority (Quality Improvements):

- Add assert helper functions to all schemas
- Standardize method naming conventions
- Add comprehensive JSDoc comments

## TODO: Refactoring Plan

### Phase 1: Define Standards
- [ ] Document the official ideal pattern (combine task + studio-membership)
- [ ] Create model template/generator
- [ ] Update architecture documentation

### Phase 2: Schema Layer
- [ ] Add payload types to all model schemas
- [ ] Add assert helpers to all schemas
- [ ] Separate internal vs external schemas

### Phase 3: Service Layer Refactor
- [ ] Update user service (remove Prisma types from signatures)
- [ ] Update studio service
- [ ] Update show service (move query building to repository)
- [ ] Update client service
- [ ] Update schedule service
- [ ] Update studio-membership service
- [ ] Update remaining 12 models

### Phase 4: Repository Layer Enhancement
- [ ] Move query building logic from services to repositories
- [ ] Add domain filter types to repositories
- [ ] Standardize repository method signatures

### Phase 5: Testing & Validation
- [ ] Add unit tests for all services (with mocked repositories)
- [ ] Integration tests for repository layer
- [ ] E2E tests for critical flows

## ⚠️ IMPORTANT: Working with Current Codebase

**Until refactoring is complete, be aware**:

1. **When reading existing code**: Many services expose Prisma types - this is WRONG but currently exists
2. **When writing new code**: Follow the task model pattern (minimal Prisma exposure)
3. **When modifying existing code**: If touching a service, consider adding payload types incrementally
4. **Never assume patterns are correct**: Always check against task model or this document

## Known Good Patterns to Reference

When in doubt, refer to these files:

✅ **Best service example**: `/apps/erify_api/src/models/task/task.service.ts`
✅ **Best schema example**: `/apps/erify_api/src/models/membership/schemas/studio-membership.schema.ts`
✅ **Best repository example**: Any repository (all follow pattern correctly)

## Related Documentation

- [Schema Patterns](./schema-patterns.md) - Three-tier schema architecture
- [Tech Stack](./tech-stack.md) - Module organization standards
