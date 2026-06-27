# Data Validation Examples

Detailed code examples for input validation, serialization, and ID management.

## ID Management

### External API Contract
```
URL:  GET /admin/users/:id     // id = uid (user_abc123)
Response: { "id": "user_abc123", "email": "user@example.com" }
// NO "uid" field, NO database "id" (bigint primary key)
```

### Never Compare Database IDs with UIDs
```typescript
// ❌ BAD: BigInt.toString() gives "12345", never equals "std_abc123"
if (entity.studioId?.toString() !== studioId) { ... }

// ✅ GOOD: Query-based scoping
const entity = await this.service.findOne({
  uid: entityUid,
  studio: { uid: studioId },
  deletedAt: null,
});

// ✅ ACCEPTABLE: Resolve UID first
const studio = await this.studioService.findByUid(studioUid);
if (entity.studioId !== studio.id) { ... }  // BigInt === BigInt
```

## Input Validation Flow

```
Client Request (snake_case) → Validation → Transform (snake_case → camelCase) → Service Layer
```

## Response Serialization Flow

```
Service (camelCase) → Serialization (uid → id, camelCase → snake_case, dates → ISO) → Client Response
```

## Type Mapping

| Database | Service | API Response |
|---|---|---|
| bigint | bigint | string (UID) |
| string (uid) | string (uid) | string (id) |
| boolean | boolean | boolean |
| timestamp | Date | ISO string |

## Pagination Validation

```typescript
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
```

## Error Messages

```
✅ GOOD: { "statusCode": 404, "message": "User not found" }
❌ BAD:  { "message": "User uid_123 not found" }  // Reveals UID pattern
❌ BAD:  { "message": "No row with id 12345" }     // Reveals database ID
```
