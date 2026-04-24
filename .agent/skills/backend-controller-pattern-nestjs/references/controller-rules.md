# Controller Rules

Use this reference for controller-layer decisions that are too detailed for `SKILL.md`.

## Responsibilities

Controllers are responsible for:

1. accepting HTTP requests,
2. validating params, query, and body,
3. translating external DTOs into internal service payloads,
4. calling services or orchestration services,
5. serializing responses,
6. converting missing resources to the established HTTP response helpers.

They should not contain Prisma queries, cross-domain workflows, or HTTP-coupled service contracts.

## Response Serialization

Every endpoint must serialize through Zod decorators so internal data cannot leak.

| Endpoint shape | Decorator |
| --- | --- |
| Standard response | `@ZodResponse(schema, status?)` |
| Paginated list | `@ZodPaginatedResponse(schema)` |
| Admin response | `@AdminResponse(schema, status?, description?)` |
| Admin paginated list | `@AdminPaginatedResponse(schema, description?)` |
| No-content delete | `@ZodResponse(undefined, HttpStatus.NO_CONTENT)` |

Use response schemas that exclude internal database IDs and sensitive fields. Prefer schemas from `@eridu/api-types` or local model schemas that already implement the API snake_case to service/domain camelCase boundary.

## OpenAPI Documentation Sync

Controller OpenAPI text is part of the public API contract. When changing route behavior, side effects, validation, status transitions, throttling, or response shape, update the adjacent documentation decorators in the same change:

- `@ApiOperation({ summary, description })`
- `@ApiZodResponse(...)`
- `@AdminResponse(...)` and `@AdminPaginatedResponse(...)`
- `@ZodResponse(...)` and `@ZodPaginatedResponse(...)`

Cross-check those descriptions against the canonical feature/app docs before finishing. Do not leave stale behavior claims such as delete/recreate when the service now performs diff/upsert, soft delete, restore, or status transition workflows.

## UID Validation

Validate UID route params with `UidValidationPipe` and the service UID prefix:

```typescript
@Param('id', new UidValidationPipe(TaskService.UID_PREFIX, 'Task'))
id: string
```

Validate every UID-like param independently, including `studioId` and nested resource IDs.

## HTTP Status Codes

| Method | Success code | Typical decorator |
| --- | --- | --- |
| `GET` | 200 OK | `@ZodResponse(schema)` |
| `POST` create | 201 Created | `@ZodResponse(schema, HttpStatus.CREATED)` |
| `POST` action | 200 OK or domain-specific | `@ZodResponse(schema, HttpStatus.OK)` |
| `PATCH` | 200 OK | `@ZodResponse(schema)` |
| `DELETE` | 204 No Content | `@ZodResponse(undefined, HttpStatus.NO_CONTENT)` |

## Action Endpoints

Use a dedicated action endpoint instead of generic `PATCH` when a transition has domain semantics beyond simple field mutation.

Use an action endpoint when any of these apply:

- strict from-status/to-status rules,
- policy checks such as task counts, lock windows, or approval conditions,
- required action context such as reason, actor, or audit metadata,
- deterministic domain error contract for frontend workflows.

Example route style:

```text
POST /studios/:studioId/shows/:id/resolve-cancellation
```

## Admin Audit Actor vs Payload User IDs

Admin mutations often need two different identities:

1. the authenticated admin who performed the action, used for audit attribution;
2. a target user selected by the client as part of the create/update/restore payload.

Do not conflate these. Infer the audit actor from auth context, usually `@CurrentUser()`, when recording who performed an admin action. Keep and validate payload `user_id`, `created_by`, or similar fields when they represent target/change data selected by the client.

## DTO Translation

Controllers must adapt external DTOs to internal service payloads. Extract only the service-contract fields.

```typescript
@Post()
async create(@Param('studioId') studioId: string, @Body() dto: CreateShowDto) {
  const { name, scheduledAt, platformUid } = dto;

  return this.showService.createShow({
    name,
    scheduledAt,
    platformUid,
    studio: { connect: { uid: studioId } },
  });
}
```

Avoid:

- passing an entire DTO to a service,
- spreading an entire DTO into a service payload,
- deleting fields from a DTO before passing it along,
- making a service understand pagination, UI state, route params, or request context it does not own.

For complex DTOs, destructure the fields needed by the service and keep HTTP-only decisions in the controller.

## Layer Boundaries

```text
[ HTTP Controller ]  -> requests, responses, status codes
[ Business Service ] -> business logic, transactions, domain errors
[ Repository ]       -> database access and ORM details
```

Anti-patterns:

- controller queries Prisma directly,
- controller contains workflow/business logic,
- service returns HTTP responses or throws Nest exceptions as its normal public contract,
- controller chooses database include/select shapes for domain behavior.

## Pagination

List endpoints should use shared pagination DTOs and `createPaginatedResponse()`.

Expected response shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150
  }
}
```

Pass only query fields the service supports, and preserve real total metadata from the service/repository.

## Studio Controllers

Studio routes must treat the route `studioId` as the authority.

Common patterns:

| Need | Pattern |
| --- | --- |
| List by studio | pass `studioUid: studioId` or equivalent service payload |
| Find/update/delete resource | predicate includes `studio: { uid: studioId }` or service-owned equivalent |
| Create resource | connect studio relation from route param |
| Client also sends `studio_id` | discard or reject it; never let it override the route |

When a query/body includes a studio identifier for legacy or shared schema reasons:

```typescript
const { studioId: _ignoredStudioId, ...scopedQuery } = query;
return this.service.list({ ...scopedQuery, studioId });
```

## Studio Lookup Controllers

Use studio-scoped lookup controllers for globally managed reference data that should only be reachable by studio members through a studio context.

Rules:

- Use `@StudioProtected()` with no role list when any member may read the lookup.
- Keep route shape under `studios/:studioId`.
- Prefix the route param with `_studioId` when the guard validates membership but the lookup service itself is global.
- Add `@ApiTags()` explicitly if there is no inherited resource tag.
- Do not export the lookup module from `StudiosModule` unless another module injects its providers.

## Me Controllers

Me routes must use `@CurrentUser()` and never accept user identity from params or body.

Use a dedicated `Me{Domain}Service` when the endpoint needs internal user resolution or ownership predicates. The me service should:

1. resolve JWT `ext_id` to the internal user record through `UserService`,
2. enforce ownership at query level,
3. delegate business behavior to the underlying model service.

Ownership must be part of the query predicate:

```typescript
const task = await this.taskService.findOne({
  uid: taskUid,
  assigneeId: user.id,
  deletedAt: null,
});
```

Do not fetch by UID first and then check ownership afterward.

## Throttle Profiles

The app uses named throttle profiles. Do not skip throttling entirely.

| Profile | Purpose |
| --- | --- |
| `default` | Strict global protection for normal routes |
| `readBurst` | Lenient profile for high-frequency read endpoints |

Use `@ReadBurstThrottle()` for:

- infinite-scroll lists,
- search/autocomplete endpoints called on keystrokes,
- rapid pagination,
- read endpoints that mount together and cause expected bursts.

Keep the default throttle for:

- mutations,
- auth endpoints,
- single-resource detail reads,
- rarely hit settings reads.

If a 429 spike appears in `erify_studios`, prefer:

1. reducing frontend remount/refetch churn,
2. forwarding `AbortSignal` so abandoned reads are canceled,
3. opting the high-frequency read endpoint into `readBurst`.

Do not bypass throttling based on browser `Origin`; that header is not trusted server-side identity in this stack.
