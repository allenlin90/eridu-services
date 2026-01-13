# Eridu Services - Data Validation & Serialization Skill

Provides guidance for Zod schemas, DTOs, and ID mapping in Eridu Services.

## ID Management Pattern

### External API Contract

```typescript
// URL
GET /admin/users/:id  // id = user_abc123 (UID)

// Response
{
  "id": "user_abc123",      // UID mapped as id
  "email": "user@example.com",
  "name": "John Doe",
  // No "uid" field
  // No database "id" field
}
```

### Internal Implementation

```typescript
// Database
{
  id: 12345,                // bigint primary key (NEVER exposed)
  uid: "user_abc123",       // Branded UID
  email: "user@example.com",
  name: "John Doe",
}

// Prisma operations use uid
await prisma.user.findUnique({ where: { uid: "user_abc123" } });

// Create with nested relations using uid
await prisma.studio.create({
  data: {
    user: { connect: { uid: "user_abc123" } }, // NOT id!
  }
});
```

**Key Rules**:

- ✅ Map `uid` to `id` in API responses
- ✅ Hide database `id` field completely
- ✅ Use UIDs in Prisma `connect` operations
- ❌ Never expose database ID in APIs
- ❌ Never use database ID in URLs

## Zod Schema Pattern

### Internal Entity Schema

**Matches Prisma model exactly**:

```typescript
export const userSchema = z.object({
  id: z.bigint(),                        // Internal only
  uid: z.string().startsWith('user_'),
  email: z.string().email(),
  name: z.string(),
  isSystemAdmin: z.boolean().default(false),
  isBanned: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
```

### Input Request Schema

**Transform snake_case → camelCase**:

```typescript
export const createUserSchema = z.object({
  email: z.string().email().min(1),
  name: z.string().min(1),
}).transform((data) => ({
  email: data.email,
  name: data.name,
}));

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
}).transform((data) => ({
  ...(data.email && { email: data.email }),
  ...(data.name && { name: data.name }),
}));
```

### Output Response DTO Schema

**Transform camelCase → snake_case, map uid → id**:

```typescript
// ✅ CORRECT: Maps uid to external id, hides database id
export const userDto = userSchema.transform((obj) => ({
  id: obj.uid,                    // Map UID to external 'id'
  email: obj.email,
  name: obj.name,
  is_system_admin: obj.isSystemAdmin,
  is_banned: obj.isBanned,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
  deleted_at: obj.deletedAt,
  // Database id NOT included
}));

export class UserDto extends createZodDto(userDto) {}
```

### Pagination Response

```typescript
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
});

export const createPaginatedResponseSchema = <T extends z.ZodType>(
  dataSchema: T,
) => {
  return z.object({
    data: z.array(dataSchema),
    meta: paginationMetaSchema,
  });
};

// Usage
@ZodSerializerDto(createPaginatedResponseSchema(UserDto))
async listUsers() { ... }
```

## Input DTO Classes

**Created from Zod schemas**:

```typescript
export class CreateUserDto extends createZodDto(createUserSchema) {}

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
```

## Field Name Transformation

### Input (Request Body)

Client sends snake_case:

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "is_system_admin": false
}
```

Schema transforms to camelCase:

```typescript
{ email: 'user@example.com', name: 'John Doe', isSystemAdmin: false }
```

### Output (Response Body)

Service returns camelCase:

```typescript
{ uid: 'user_123', email: 'user@example.com', name: 'John Doe', isSystemAdmin: false }
```

Schema transforms to snake_case and maps uid → id:

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "is_system_admin": false
}
```

## Shared Schemas

**Use `@eridu/api-types` for shared schemas**:

```typescript
// Import shared schemas from package
import {
  userApiResponseSchema,
  createUserInputSchema,
} from '@eridu/api-types/users';
import { UID_PREFIXES } from '@eridu/api-types/constants';

// Use in local DTO transformations
export const userDto = userApiResponseSchema;
```

**Rationale**:

- ✅ Single source of truth for API contracts
- ✅ Frontend and backend share same schemas
- ✅ Consistency across services
- ❌ No duplicate schema definitions

## DTO Transformation Pattern

```typescript
// 1. Define input schema (request body)
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
}).transform((data) => ({ ...data }));

// 2. Define entity schema (internal/database)
export const userSchema = z.object({
  id: z.bigint(),
  uid: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// 3. Define output schema (response body)
export const userDto = userSchema.transform((obj) => ({
  id: obj.uid,                    // UID → id mapping
  email: obj.email,
  name: obj.name,
  created_at: obj.createdAt,      // camelCase → snake_case
  updated_at: obj.updatedAt,
  deleted_at: obj.deletedAt,
  // id field NOT included
}));

// 4. Create DTO classes
export class CreateUserDto extends createZodDto(createUserSchema) {}
export class UserDto extends createZodDto(userDto) {}
```

## Arrays with Relations

**For endpoints returning related entities**:

```typescript
// User with studio memberships
export const userWithMembershipsSchema = userSchema.extend({
  studioMemberships: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      studioId: z.string(),
    }),
  ),
});

export const userWithMembershipsDto = userWithMembershipsSchema.transform(
  (obj) => ({
    id: obj.uid,
    // ... other fields
    studio_memberships: obj.studioMemberships.map((m) => ({
      id: m.id,
      role: m.role,
      studio_id: m.studioId,
    })),
  }),
);
```

## Related Skills

- **eridu-controller-pattern.md** - Using DTOs in controllers
- **eridu-authentication-authorization.md** - Request validation
- **eridu-id-management.md** - Branded UID details

## Best Practices Checklist

- [ ] Map `uid` to `id` in response DTOs
- [ ] Hide database `id` field completely
- [ ] Transform input: snake_case → camelCase
- [ ] Transform output: camelCase → snake_case
- [ ] Use Zod schemas for all validation
- [ ] Export both schema and DTO class
- [ ] Use `@eridu/api-types` for shared schemas
- [ ] Never expose database ID in responses
- [ ] Always include transformation logic
- [ ] Test schema transformations
