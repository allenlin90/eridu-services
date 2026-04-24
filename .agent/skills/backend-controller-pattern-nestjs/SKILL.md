---
name: backend-controller-pattern-nestjs
description: Comprehensive NestJS Controller patterns for all controller types. This skill should be used when implementing any controller in NestJS to ensure consistency and use of shared utilities.
---

# NestJS Controller Patterns

This skill covers **all controller patterns** in `erify_api`, from general principles to module-specific implementations.

## Canonical Examples

Study these real implementations as the source of truth:
- **Admin**: [admin-client.controller.ts](../../../apps/erify_api/src/admin/clients/admin-client.controller.ts)
- **Studio**: [studio-task-template.controller.ts](../../../apps/erify_api/src/studios/studio-task-template/studio-task-template.controller.ts)
- **Me (User-scoped)**: [me-task.controller.ts](../../../apps/erify_api/src/me/me-task/me-task.controller.ts), [me-task.service.ts](../../../apps/erify_api/src/me/me-task/me-task.service.ts)
- **Base Controllers**: [base-admin.controller.ts](../../../apps/erify_api/src/admin/base-admin.controller.ts), [base-studio.controller.ts](../../../apps/erify_api/src/studios/base-studio.controller.ts), [base.controller.ts](../../../apps/erify_api/src/lib/controllers/base.controller.ts)

**Detailed code examples**: See [references/controller-examples.md](references/controller-examples.md)

---

## Core Responsibilities

ALL controllers share these responsibilities:

1. **Accept HTTP requests** (Method, Body, Query, Headers)
2. **Validate input** (Check format, required fields)
3. **Translate DTOs** (Convert external format → internal service payloads)
4. **Call Service Layer** (Delegate business logic)
5. **Serialize Response** (Transform/Filter data)
6. **Handle Errors** (Map exceptions to HTTP Status codes)

---

## Shared Principles

### 1. Response Serialization

🔴 **Critical**: ALL endpoints must use Zod for response serialization to ensure no internal data (like database IDs) leaks.

- Use `@ZodResponse(Schema, Status)` for standard responses
- Use `@ZodPaginatedResponse(Schema)` for list endpoints

```typescript
@Get(':id')
@ZodResponse(UserDto)
async getUser(...) { ... }
```

### 2. Validation Pipes

🟡 **Recommended**: Always use `UidValidationPipe` for validating `uid` parameters.

```typescript
@Param('id', new UidValidationPipe(UserService.UID_PREFIX, 'User'))
id: string
```

### 3. DTO Standards

- **Request DTOs**: Define validation rules using `zod`
- **Response DTOs**: Define output shape, excluding sensitive fields
- **Pagination**: Use `PaginationQueryDto` from `@/lib/pagination/pagination.schema`

### 4. HTTP Status Codes

| Method   | Success Code   | Decorator Implementation                         |
| :------- | :------------- | :----------------------------------------------- |
| `GET`    | 200 OK         | Default / `@ZodResponse(S, HttpStatus.OK)`       |
| `POST`   | 201 Created    | `@ZodResponse(S, HttpStatus.CREATED)`            |
| `PATCH`  | 200 OK         | `@ZodResponse(S, HttpStatus.OK)`                 |
| `DELETE` | 204 No Content | `@ZodResponse(undefined, HttpStatus.NO_CONTENT)` |

### 4.1 Action Endpoint vs Generic PATCH

When a transition has domain semantics beyond simple field mutation, use a dedicated action endpoint (for example `POST .../resolve-cancellation`) instead of generic `PATCH`.

Use an action endpoint when any of these apply:

1. strict from-status/to-status rules,
2. policy checks (task counts, lock windows, approval conditions),
3. required action context (reason/actor/audit),
4. deterministic domain error contract for FE workflows.

### 5. Payload Translation & Property Filtering

🔴 **Critical**: Controllers MUST adapt external DTOs to internal Service Payloads and filter unnecessary properties.

**Why:**
1. Services should be decoupled from HTTP layer and context-agnostic
2. Services define clean contracts for exactly what they need
3. DTOs may contain extra fields (pagination, UI state, metadata) that services don't need
4. Passing entire DTOs couples services to API structure changes

**Rule**: ALWAYS extract only the properties the service contract requires. NEVER pass entire DTO objects.

```typescript
@Post()
async create(@Param('orgId') orgId: string, @Body() dto: CreateUserDto) {
  // ✅ GOOD: Extract ONLY what service needs
  const { name, email } = dto;
  // Filtered out: dto.pageSize, dto.sortOrder, etc.
  return this.userService.create({
    name,
    email,
    org: { connect: { uid: orgId } }
  });
}

// ❌ BAD: Pass entire DTO
async create(@Body() dto: CreateUserDto) {
  return this.userService.create(dto); // Service now knows about ALL DTO fields
}

// ❌ BAD: Spread operator without explicit filtering
async create(@Body() dto: CreateUserDto) {
  return this.userService.create({ ...dto }); // Same problem
}

// ❌ BAD: Deleting properties
async create(@Body() dto: CreateUserDto) {
  delete dto.pageSize; // Mutating DTO, not explicit about what service needs
  return this.userService.create(dto);
}
```

**Pattern for complex DTOs**:

```typescript
// DTO may have many fields for validation/UI purposes
interface CreateTaskDto {
  name: string;
  description: string;
  assigneeId?: string;
  // Extra fields controllers use but services don't need:
  returnUrl?: string;      // UI navigation
  skipNotification?: boolean; // HTTP-specific flag
}

@Post()
async create(@Body() dto: CreateTaskDto) {
  // ✅ Extract only service contract fields
  const { name, description, assigneeId } = dto;

  const task = await this.taskService.create({
    name,
    description,
    assigneeId,
  });

  // Controller handles HTTP-specific logic
  if (dto.skipNotification) {
    // Controller decision, not service concern
  }

  return task;
}
```

### 6. Layer Boundaries

🟡 **Recommended**: Maintain strict separation of concerns.

```
[ HTTP Controller ]  <-- Knows about Requests, Responses, Status Codes
        |
        v
[ Business Service ] <-- Knows about Logic, Transactions, Domain Errors
        |
        v
[ Data Repository ]  <-- Knows about Database, SQL, ORM
```

**Anti-Patterns:**
- ❌ Controller running SQL queries (Leaky abstraction)
- ❌ Controller containing complex logic (Fat controller)
- ❌ Service returning HTTP objects (Service coupled to transport)

### 7. Pagination

🟡 **Recommended**: Always limit lists to prevent DoS and performance issues.

**Standard Response Format:**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150
  }
}
```

---

## Admin Controllers

**Use Case:** System admin endpoints for managing resources across the entire system.

### Core Principles

1. 🔴 **Critical**: All admin controllers MUST extend `BaseAdminController`
2. 🔴 **Critical**: Automatically protected by `@AdminProtected()` via the base class
3. 🟡 **Recommended**: Use `@AdminResponse()` and `@AdminPaginatedResponse()` instead of generic Zod decorators
4. 🟡 **Recommended**: All routes must start with `admin/`

### Base Controller Features

`BaseAdminController` provides:
- `@AdminProtected()` decorator application
- `createPaginatedResponse()` helper
- `ensureResourceExists()` and `ensureFieldExists()` helpers

### Checklist

- [ ] Controller extends `BaseAdminController`
- [ ] Route prefix is `admin/<resource>`
- [ ] Uses `@AdminResponse` / `@AdminPaginatedResponse`
- [ ] Uses `UidValidationPipe` for ID parameters
- [ ] Uses `ensureResourceExists` for 404 checks

---

## Studio Controllers

**Use Case:** Studio-scoped endpoints for resources that belong to a specific studio.

### Core Principles

1. 🔴 **Critical**: Extend `BaseStudioController`
2. 🔴 **Critical**: Path structure must be `studios/:studioId/resource`
3. 🔴 **Critical**: All queries must filter by studio context
4. 🟡 **Recommended**: Use `@ZodResponse()` and `@ZodPaginatedResponse()`

### Authorization

`BaseStudioController` automatically requires studio membership via `@StudioProtected()`.

**Add role restrictions** at class or method level:

```typescript
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';

// All endpoints require ADMIN
@StudioProtected([STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/task-templates')
export class StudioTaskTemplateController extends BaseStudioController { }

// Mixed: default membership, admin for delete
@Controller('studios/:studioId/resource')
export class ResourceController extends BaseStudioController {
  @Get() list() { } // Any member
  
  @StudioProtected([STUDIO_ROLE.ADMIN])
  @Delete(':id') delete() { } // Admin only
}
```

**Available roles**: `STUDIO_ROLE.ADMIN`, `STUDIO_ROLE.MEMBER`

### Quick Reference

| Pattern | Code |
|---------|------|
| **Studio scoping** | `studioUid: studioId` (list), `studio: { uid: studioId }` (findOne/update/delete) |
| **UID validation** | `@Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio'))` |
| **Studio relation** | `studio: { connect: { uid: studioId } }` (create) |
| **DTO extraction** | `const { name, description } = dto;` then pass to service |

### Checklist

- [ ] Extends `BaseStudioController`
- [ ] Route: `studios/:studioId/resource`
- [ ] Authorization: `@StudioProtected([roles])` if role restrictions needed
- [ ] UID validation on `studioId` and resource `id`
- [ ] Studio scoping in all queries
- [ ] Create operations connect studio relation

### Studio-Scoped Lookup Controllers

**Use Case:** Expose globally-managed reference data (ShowTypes, Platforms, etc.) through a studio-auth guard so that studio members can only reach them via their studio context.

Unlike standard studio controllers, lookup controllers call **unscoped** global model services — the guard handles IDOR protection, not the service call.

```typescript
@ApiTags('Studio Lookup')
@StudioProtected()                          // No roles — any member can read lookups
@Controller('studios/:studioId')
export class StudioLookupController extends BaseStudioController {
  @Get('show-types')
  @ZodPaginatedResponse(showTypeDto)
  async getShowTypes(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) _studioId: string,
    @Query() query: ListShowTypesQueryDto,
  ) {
    // _studioId prefix: validated by guard but not passed to service (service is unscoped)
    const { data, total } = await this.showTypeService.listShowTypes({
      skip: query.skip,
      take: query.take,
      name: query.name,
    });
    return this.createPaginatedResponse(data, total, query);
  }
}
```

**Key rules:**
- Prefix unused route param with `_` (e.g., `_studioId`) — guard already validated it
- Add `@ApiTags` explicitly (no inherited tag from a resource-specific controller)
- Do NOT export `StudioLookupModule` from `StudiosModule` unless another module injects its services

**IDOR protection when client can also supply `studio_id` in query/body:** Discard the client value and use the route param exclusively:

```typescript
@Get()
async index(
  @Param('studioId', new UidValidationPipe(...)) studioId: string,
  @Query() query: ListStudioMembershipsQueryDto,
) {
  const { studioId: _ignoredStudioId, ...scopedQuery } = query;   // ← discard client value
  return this.service.list({ ...scopedQuery, studioId });           // ← route param is authoritative
}
```

---

## User (Me) Controllers

**Use Case:** Authenticated users interacting with their own resources (e.g., an operator managing their assigned tasks).

**Canonical Example**: [me-task.controller.ts](../../../apps/erify_api/src/me/me-task/me-task.controller.ts)

### Core Principles

1. 🟡 **Recommended**: Extend `BaseController` (not a me-specific base class)
2. 🔴 **Critical**: ALWAYS use `@CurrentUser()` to scope operations — NEVER trust a user ID from body/params
3. 🟡 **Recommended**: Routes start with `me/`
4. 🟡 **Recommended**: Use a dedicated `Me{Domain}Service` to resolve `user.ext_id` → internal DB user

### The Me Service Pattern

Me controllers delegate to a `Me{Domain}Service` that:
1. Resolves `ext_id` (JWT claim) → internal user record via `UserService`
2. Enforces ownership at the **query level** (e.g., `assigneeId: user.id`)
3. Delegates actual business logic to the underlying Model Service

```typescript
// me-task.controller.ts
@Controller('me/tasks')
export class MeTaskController extends BaseController {
  constructor(private readonly meTaskService: MeTaskService) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(taskWithRelationsDto)
  async listTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMyTasksQueryDto,
  ) {
    const { items, total } = await this.meTaskService.listMyTasks(user.ext_id, query);
    return this.createPaginatedResponse(items, total, query);
  }

  @Get(':id')
  @ZodResponse(taskWithRelationsDto)
  async getTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
  ) {
    const task = await this.meTaskService.getMyTask(user.ext_id, id);
    this.ensureResourceExists(task, 'Task', id);
    return task;
  }

  @Patch(':id')
  @ZodResponse(taskDto)
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task')) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.meTaskService.updateMyTask(user.ext_id, id, dto.version, {
      content: dto.content,
      status: dto.status,
    });
    this.ensureResourceExists(task, 'Task', id);
    return task;
  }
}
```

```typescript
// me-task.service.ts
@Injectable()
export class MeTaskService {
  constructor(
    private readonly taskService: TaskService,
    private readonly userService: UserService,
  ) {}

  async listMyTasks(userExtId: string, query: ListMyTasksQueryTransformed) {
    // 1. Resolve ext_id → internal user
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) throw HttpError.unauthorized('User not found');

    // 2. Delegate with ownership filter
    return this.taskService.findTasksByAssignee(user.id, query);
  }

  async getMyTask(userExtId: string, taskUid: string) {
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) throw HttpError.unauthorized('User not found');

    // Enforce ownership at query level — not a post-query check
    const task = await this.taskService.findOne(
      { uid: taskUid, assigneeId: user.id, deletedAt: null },
      { template: true, assignee: true },
    );

    if (!task) throw HttpError.notFound('Task not found or not assigned to you');
    return task;
  }
}
```

### Me Module Setup

```typescript
@Module({
  imports: [TaskModule, UserModule],
  controllers: [MeTaskController],
  providers: [MeTaskService],
  exports: [MeTaskService],
})
export class MeTaskModule {}
```

### Checklist

- [ ] Extends `BaseController`
- [ ] Route starts with `me/`
- [ ] Uses `@CurrentUser()` to get `user.ext_id`
- [ ] 🔴 **Critical**: Resolves `ext_id` → internal user in the Me Service (not the controller)
- [ ] 🔴 **Critical**: Ownership enforced at **query level** (`assigneeId: user.id`), not post-query
- [ ] Uses `@ZodResponse` or `@ZodPaginatedResponse`
- [ ] 404 handling via `ensureResourceExists` in controller
- [ ] Dedicated `Me{Domain}Service` — no direct Model Service injection in controller

---

## Backdoor Controllers

**Use Case:** Service-to-service communication or internal tools using API Key authentication.

### Core Principles

1. 🔴 **Critical**: All backdoor controllers MUST extend `BaseBackdoorController`
2. 🔴 **Critical**: Automatically authenticated via API Key using the `@Backdoor()` decorator (from base class)
3. 🟡 **Recommended**: All routes must start with `backdoor/`

### Checklist

- [ ] Controller extends `BaseBackdoorController`
- [ ] Route prefix is `backdoor/<resource>`
- [ ] Uses `@ZodResponse` for serialization
- [ ] NO `@CurrentUser` decorator (concept doesn't exist for API keys)

---

## Integration Controllers

**Use Case:** External integrations like Google Sheets extensions or webhooks.

### Core Principles

1. 🟡 **Recommended**: Integration controllers should extend their specific base class (e.g., `BaseGoogleSheetsController`)
2. 🟡 **Recommended**: Use specific decorators for the integration type (e.g., `@GoogleSheets()`)
3. 🟡 **Recommended**: Response format often requires specific serialization compatibility (e.g., snake_case for external tools)

### Checklist

- [ ] Controller extends appropriate base (e.g., `BaseGoogleSheetsController`)
- [ ] Uses specific auth decorator (e.g., `@GoogleSheets`)
- [ ] Uses `@ZodSerializerDto` for strict output serialization

---

## Best Practices Summary

- [ ] Choose the correct controller type (Admin/Studio/Me/Backdoor/Integration)
- [ ] Extend the appropriate base controller
- [ ] Use Zod serialization for ALL outputs with `@ZodResponse`
- [ ] Use `UidValidationPipe` for all UIDs
- [ ] 🔴 **Critical**: Translate DTOs into typed Service Payloads (never pass DTOs directly)
- [ ] Apply proper authorization decorators
- [ ] Scope queries appropriately (studio/user context)
- [ ] Document all endpoints via decorators
- [ ] Use correct HTTP status codes
- [ ] Implement pagination for list endpoints

---

## Rate Limiting & Throttle Profiles

### Named Throttle Profiles

The app configures multiple named throttle profiles in `ThrottlerModule.forRoot()`:

| Profile | Purpose |
|---------|---------|
| `default` | Strict — applied globally to all routes |
| `readBurst` | Lenient — for read-heavy endpoints that experience burst traffic |

The `readBurst` profile uses a `skipIf` callback that checks for `READ_BURST_THROTTLE_KEY` metadata on the handler. This means opting in is explicit and safe — undecorated routes always fall under the `default` profile.

### @ReadBurstThrottle() Decorator

A custom `@ReadBurstThrottle()` decorator opts a specific route into the `readBurst` profile while simultaneously skipping the `default` profile:

```typescript
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

export const READ_BURST_THROTTLE_KEY = 'readBurstThrottle';

/**
 * Opts a route into the lenient readBurst throttle profile and skips the strict default profile.
 * Apply to list endpoints with infinite scroll, search, or rapid pagination.
 */
export const ReadBurstThrottle = () =>
  applyDecorators(
    SetMetadata(READ_BURST_THROTTLE_KEY, true),
    SkipThrottle({ default: true }),
  );
```

Usage:

```typescript
@Get()
@ReadBurstThrottle()  // ← lenient for paginated list with infinite scroll
@ZodPaginatedResponse(taskTemplateDto)
async list(
  @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
  @Query() query: ListTaskTemplatesQueryDto,
) { ... }
```

### When to Use

| Apply `@ReadBurstThrottle()` | Keep default throttle |
|-----------------------------|----------------------|
| List/index with infinite scroll | Any mutation (POST, PATCH, DELETE) |
| Search / autocomplete on keystroke | Auth endpoints (login, refresh) |
| Rapid pagination (prev/next) | Single-resource GET by ID |
| Internal-tool read endpoints that mount together on the same route (list + scope counts + lookups) | Rarely-hit settings/detail reads |

**Never skip throttling entirely** — always opt into a named profile. `@SkipThrottle()` without a profile replacement removes all rate limiting and should not appear in production code.

For `erify_studios`, this means a 429 spike should usually be solved by:
1. reducing frontend remount/refetch churn,
2. forwarding `AbortSignal` so abandoned reads are canceled,
3. opting high-frequency read endpoints into `readBurst`.

Do not bypass throttling based on browser `Origin`; that header is not a trusted server-side identity signal in this stack.

---

## Related Skills

- **[Service Pattern NestJS](../service-pattern-nestjs/SKILL.md)** - Service layer patterns
- **[Orchestration Service NestJS](../orchestration-service-nestjs/SKILL.md)** - Multi-service coordination patterns
- **[Data Validation](../data-validation/SKILL.md)** - Input validation and serialization
- **[Shared API Types](../shared-api-types/SKILL.md)** - API contracts and schemas
- **[Database Patterns](../database-patterns/SKILL.md)** - Soft delete, transactions
- **[Secure Coding Practices](../secure-coding-practices/SKILL.md)** - AppThrottlerGuard, trust proxy hardening
