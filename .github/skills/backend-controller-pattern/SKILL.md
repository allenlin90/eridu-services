---
name: backend-controller-pattern
description: This skill provides general guidelines for designing backend controller layers across any framework. It should be used when implementing REST endpoints, handling HTTP status codes, managing pagination, or structuring API request/response handling.
---

# Backend Controller Pattern Skill

**General guidelines for API Boundaries.**

for framework-specifics, see:
- **[NestJS Controllers](backend-controller-pattern-nestjs/SKILL.md)**

For validation/serialization rules, see:
- **[Data Validation](data-validation/SKILL.md)**

## Core Responsibilities

1. **Accept HTTP requests** (Method, Body, Query, Headers)
2. **Validate input** (Check format, required fields)
3. **Call Service Layer** (Delegate business logic)
4. **Serialize Response** (Transform/Filter data)
5. **Handle Errors** (Map exceptions to HTTP Status codes)
6. **Payload Translation** (Convert DTO -> Service/Prisma Payload)

## Payload Translation

**Principle: Controllers adapt External to Internal.**

The Service layer should define its input as a generic payload (defaulting to Prisma inputs). The Controller is responsible for reshaping the request DTO into that payload structure.

```typescript
  @Post()
  async create(@Body() dto: CreateUserDto, @Param('orgId') orgId: string) {
    // Controller knows how to combine params + body into Service Payload
    return this.userService.create({
      ...dto,
      org: { connect: { id: orgId } } // Connect relations here
    });
  }
```

## HTTP Status Codes

**Use standard REST conventions**:

| Operation | Status | Meaning |
| :--- | :--- | :--- |
| **Create** | `201` | Created successfully |
| **Read** | `200` | Found and returned |
| **Update** | `200` | Updated successfully |
| **Delete** | `204` | Deleted (No Content) |
| **Error** | `4xx` | Client Error (Bad input, Auth) |
| **Error** | `5xx` | Server Error (Bug, Downtime) |

## Input Validation

**Principle: Validate at the Gate.**

- **Never** let invalid data reach business logic.
- **Never** trust client input (even from your own frontend).
- **Transform** API format (`snake_case`) to Internal format (`camelCase`).

See **[Data Validation Skill](data-validation/SKILL.md)** for detailed Schema definitions.

## Response Serialization

**Principle: Filter at the Exit.**

- **Always** return consistent JSON structures.
- **Never** expose Database IDs (`BigInt`), use UIDs (`string`).
- **Never** expose internal fields (`password`, `deletedAt`).
- **Transform** Internal format (`camelCase`) to API format (`snake_case`).

## Pagination

**Principle: Always Limit Lists.**

Unbounded queries are a DoS vector and performance killer.

**Standard Response Format**:
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

## Authorized vs Authenticated

**Understand the difference**:

- **Authentication (401)**: "Who are you?" (Login check)
- **Authorization (403)**: "Are you allowed?" (Permission check)

## Layer Boundaries

**Strict separation of concerns**:

```
[ HTTP Controller ]  <-- Knows about Requests, Responses, Status Codes
        |
        v
[ Business Service ] <-- Knows about Logic, Transactions, Domain Errors
        |
        v
[ Data Repository ]  <-- Knows about Database, SQL, ORM
```

**Anti-Patterns**:
- ❌ **Controller running SQL queries** (Leaky abstraction)
- ❌ **Controller containing complex logic** (Fat controller)
- ❌ **Service returning HTTP objects** (Service coupled to transport)
