# Schema Transformation Patterns

## Three-Tier Schema Architecture

### 1. API Layer (@eridu/api-types)
**Purpose:** Public API contracts, shared between frontend and backend

**Characteristics:**
- Snake_case naming (JSON/REST convention)
- Zod schemas for validation + type inference
- String UIDs for external IDs
- ISO 8601 datetime strings
- Organized by domain with subpath exports

**Example:**
```typescript
// @eridu/api-types/memberships/schemas.ts
export const membershipApiResponseSchema = z.object({
  id: z.string(),                    // UID: membership_abc123
  user_id: z.string(),               // UID: user_xyz789
  studio_id: z.string(),             // UID: studio_def456
  role: z.enum(['admin', 'manager', 'member']),
  created_at: z.string(),            // ISO: "2025-01-15T10:30:00Z"
  updated_at: z.string(),
});

export type MembershipApiResponse = z.infer<typeof membershipApiResponseSchema>;
```

### 2. Service Layer (erify_api)
**Purpose:** Internal business logic, database operations

**Characteristics:**
- camelCase naming (TypeScript convention)
- BigInt for internal IDs
- Date objects for timestamps
- Relations loaded as objects
- Transformation schemas convert between layers

**Example:**
```typescript
// erify_api/src/models/membership/schemas/studio-membership.schema.ts

// Internal DB schema (from Prisma)
export const studioMembershipSchema = z.object({
  id: z.bigint(),
  uid: z.string(),
  userId: z.bigint(),
  studioId: z.bigint(),
  role: z.enum(['admin', 'manager', 'member']),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Transformation: DB → API
export const studioMembershipDto = studioMembershipSchema
  .pick({
    uid: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    user: z.object({ uid: z.string() }),
    studio: z.object({ uid: z.string() }),
  })
  .transform((obj) => ({
    id: obj.uid,
    user_id: obj.user.uid,
    studio_id: obj.studio.uid,
    role: obj.role,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(membershipApiResponseSchema); // Validate output
```

### 3. Database Layer (Prisma)
**Purpose:** ORM schema, migrations

**Characteristics:**
- camelCase in TypeScript
- snake_case in database (via @map)
- BigInt for IDs
- Relations defined
- Indexes and constraints

**Example:**
```prisma
// prisma/schema.prisma
model StudioMembership {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  role      String

  userId    BigInt    @map("user_id")
  studioId  BigInt    @map("studio_id")

  user      User      @relation(fields: [userId], references: [id])
  studio    Studio    @relation(fields: [studioId], references: [id])

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@unique([userId, studioId])
  @@map("studio_memberships")
}
```

## Transformation Flow

### Input (Client → Server)

```typescript
// 1. Client sends snake_case JSON
POST /studios/studio_abc123/memberships
{
  "user_id": "user_xyz789",
  "studio_id": "studio_abc123",
  "role": "member"
}

// 2. Shared schema validates (from @eridu/api-types)
export const createMembershipInputSchema = z.object({
  user_id: z.string(),
  studio_id: z.string(),
  role: z.enum(['admin', 'manager', 'member']),
});

// 3. Backend transforms to internal format
export const createStudioMembershipSchema = createMembershipInputSchema
  .transform((data) => ({
    userId: data.user_id,      // snake → camel
    studioId: data.studio_id,
    role: data.role,
  }));

// 4. NestJS DTO uses transformed schema
export class CreateStudioMembershipDto extends createZodDto(
  createStudioMembershipSchema,
) {}

// 5. Service resolves UIDs to internal IDs
async create(dto: CreateStudioMembershipDto) {
  const user = await this.userRepo.findByUid(dto.userId);
  const studio = await this.studioRepo.findByUid(dto.studioId);

  // 6. Repository creates with BigInt IDs
  return this.membershipRepo.create({
    uid: this.generateUid(),  // membership_def456
    userId: user.id,          // BigInt
    studioId: studio.id,      // BigInt
    role: dto.role,
  });
}
```

### Output (Server → Client)

```typescript
// 1. Service fetches from DB (Prisma returns camelCase)
const membership = await prisma.studioMembership.findUnique({
  where: { id: 1n },
  include: { user: true, studio: true },
});
// Result: { id: 1n, uid: "membership_abc", userId: 5n, user: {...}, ... }

// 2. Transform to API format
const apiResponse = studioMembershipDto.parse(membership);
// Result: { id: "membership_abc", user_id: "user_xyz", role: "admin", ... }

// 3. Controller returns transformed data
@Get(':id')
async findOne(@Param('id') id: string) {
  const membership = await this.service.findByUid(id);
  return studioMembershipDto.parse(membership);
}

// 4. Client receives snake_case JSON
{
  "id": "membership_abc123",
  "user_id": "user_xyz789",
  "studio_id": "studio_def456",
  "role": "admin",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}

// 5. Frontend validates with same schema
const data = membershipApiResponseSchema.parse(response.data);
// TypeScript knows: data.user_id is string, data.role is 'admin'|'manager'|'member'
```

## Common Schema Patterns

### Basic Response Schema
```typescript
// API layer
export const showApiResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Service layer transformation
export const showDto = showSchema
  .pick({ uid: true, title: true, createdAt: true, updatedAt: true })
  .transform((obj) => ({
    id: obj.uid,
    title: obj.title,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(showApiResponseSchema);
```

### Response with Relations
```typescript
// Two DTOs: basic and full
export const showBasicDto = /* ... */;

export const showWithRelationsDto = showSchema
  .pick({ uid: true, title: true, /* ... */ })
  .extend({
    studio: z.object({ uid: z.string(), name: z.string() }),
    assignee: z.object({ uid: z.string(), email: z.string() }).nullable(),
  })
  .transform((obj) => ({
    id: obj.uid,
    title: obj.title,
    studio: {
      id: obj.studio.uid,
      name: obj.studio.name,
    },
    assignee: obj.assignee ? {
      id: obj.assignee.uid,
      email: obj.assignee.email,
    } : null,
    // ...
  }))
  .pipe(showApiWithRelationsResponseSchema);
```

### Input with Validation
```typescript
// API layer (shared)
export const createShowInputSchema = z.object({
  title: z.string().min(1).max(255),
  studio_id: z.string(),
  scheduled_at: z.string().datetime().optional(),
});

// Service layer
export const createShowSchema = createShowInputSchema
  .transform((data) => ({
    title: data.title,
    studioId: data.studio_id,
    scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
  }));

// NestJS DTO
export class CreateShowDto extends createZodDto(createShowSchema) {}
```

### Bulk Input with Array Validation
```typescript
// API layer
export const bulkAssignInputSchema = z.object({
  show_ids: z.array(z.string()).min(1).max(100),
  user_id: z.string(),
});

// Service layer
export const bulkAssignSchema = bulkAssignInputSchema
  .transform((data) => ({
    showUids: data.show_ids,
    userUid: data.user_id,
  }));
```

## Assert Helpers (Runtime Validation)

For cases where types aren't statically guaranteed:

```typescript
import { assertSchema } from '@/lib/zod/assert';

// In service layer
async processTasks(taskData: unknown[]) {
  // Validate array of tasks at runtime
  taskData.forEach((data) => {
    assertSchema(taskSchema, data, 'Invalid task data');
  });

  // Now TypeScript knows taskData is Task[]
}

// Assert helper implementation
export function assertSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  message?: string,
): asserts data is T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(message || 'Schema validation failed');
  }
}
```

## Pagination Response Pattern

```typescript
// API layer (shared)
export const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
  total_pages: z.number(),
});

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

// Usage
export const paginatedMembershipsResponseSchema =
  paginatedResponseSchema(membershipApiResponseSchema);

// Service layer
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
) {
  return {
    data: items,
    meta: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  };
}
```

## Key Principles

1. **Single Source of Truth**: API schemas defined once in @eridu/api-types
2. **Type Safety**: Zod schemas generate TypeScript types via z.infer
3. **Validation**: Input validated at API boundary, output validated before sending
4. **Transformation**: .transform() converts between layers
5. **Pipe Validation**: .pipe() ensures output matches API contract
6. **Never Expose Internal IDs**: Always use UIDs in API responses
7. **Consistent Casing**: snake_case for API, camelCase for internal
8. **ISO Dates**: Always serialize dates as ISO 8601 strings in API
