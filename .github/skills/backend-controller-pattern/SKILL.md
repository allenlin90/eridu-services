---
name: backend-controller-pattern
description: Provides general guidelines for designing backend controller layers across any framework. Use when implementing REST endpoints, handling HTTP status codes, managing pagination, or structuring API request/response handling. Framework-agnostic principles applicable to NestJS, Express, FastAPI, and other frameworks.
---

# Backend Controller Pattern Skill

Provides general guidelines for designing controller layers in backend services.

## Core Responsibilities

Controllers act as the API boundary layer. They should:

1. **Accept HTTP requests** - Receive data from clients
2. **Validate input** - Ensure requests are well-formed
3. **Call services** - Delegate business logic to service layer
4. **Serialize responses** - Transform data to API format
5. **Handle errors** - Return appropriate HTTP status codes
6. **Manage authorization** - Enforce access control (at decorator/middleware level)

## HTTP Status Codes

**Standard REST conventions**:

| Operation | Method | Status | Use Case |
|-----------|--------|--------|----------|
| Create    | POST   | 201    | Successfully created new resource |
| Read      | GET    | 200    | Successfully returned data |
| Update    | PATCH  | 200    | Successfully updated resource |
| Delete    | DELETE | 204    | Successfully deleted (no content response) |
| Not Found | ANY    | 404    | Resource doesn't exist |
| Bad Request | ANY  | 400    | Invalid request format/validation |
| Unauthorized | ANY | 401    | Authentication required/failed |
| Forbidden | ANY   | 403    | Authenticated but not authorized |

**Key Rules**:
- ✅ Use 201 for creation endpoints
- ✅ Use 204 for delete endpoints (no response body)
- ✅ Use 200 for reads and updates
- ❌ Never use 200 for creation (use 201)
- ❌ Never use 404 for validation errors (use 400)

## Input Validation

**Pattern**: Validate before calling service

```
Client Request (raw)
    ↓
Controller receives
    ↓
Validate input (type, format, required fields)
    ↓
If invalid → Return 400 with error details
If valid → Transform to internal format
    ↓
Call Service
```

**Best Practices**:
- ✅ Validate all client input at controller boundary
- ✅ Use schema validation (Zod, Joi, Pydantic, etc.)
- ✅ Transform snake_case (API) → camelCase (internal) on input
- ✅ Return detailed error messages for validation failures
- ❌ Never pass raw client data directly to services
- ❌ Never trust input format (validate even from "trusted" clients)

## Response Serialization

**Pattern**: Transform service response to API format

```
Service returns (camelCase)
    ↓
Controller receives
    ↓
Serialize to API format (snake_case, uid→id)
    ↓
Client receives (snake_case)
```

**Best Practices**:
- ✅ Map internal UIDs to external `id` field
- ✅ Transform camelCase → snake_case for API
- ✅ Hide internal database IDs
- ✅ Use schema-based serialization (automatic transformation)
- ❌ Never expose internal UID format patterns
- ❌ Never expose database primary key IDs
- ❌ Never return raw objects without transformation

## Pagination

**Pattern**: Always paginate list endpoints

```typescript
GET /admin/users?page=1&limit=10

Response:
{
  "data": [...],  // Array of items
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150   // Total count
  }
}
```

**Implementation**:
1. Accept `page` and `limit` from query parameters
2. Provide sensible defaults (page: 1, limit: 10)
3. Calculate skip: `(page - 1) * limit`
4. Query data and count in parallel
5. Return both data and metadata

**Best Practices**:
- ✅ Provide default page and limit
- ✅ Query data and count simultaneously (not sequentially)
- ✅ Include total count in response
- ✅ Validate page/limit are positive integers
- ❌ Never return unbounded lists (always paginate)
- ❌ Never query count separately after data

## Error Handling

**Error responses should**:
- ✅ Include appropriate HTTP status code
- ✅ Provide error message (user-friendly)
- ✅ Include error code (for programmatic handling)
- ✅ Log details server-side for debugging
- ❌ Never expose stack traces to clients
- ❌ Never reveal internal system details
- ❌ Never expose database structure

**Standardized Error Response**:

```json
{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "BadRequest"
}
```

**Examples**:

```json
// 401 Unauthorized
{
  "statusCode": 401,
  "message": "Authentication required",
  "error": "Unauthorized"
}

// 403 Forbidden
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "User not found",
  "error": "NotFound"
}

// 400 Bad Request
{
  "statusCode": 400,
  "message": "Invalid request format",
  "error": "BadRequest"
}
```

## Authorization Patterns

**Authentication vs Authorization**:

| Aspect | Authentication | Authorization |
|--------|---|---|
| Checks | Is user who they claim? | Can user do this? |
| HTTP Status | 401 Unauthorized | 403 Forbidden |
| Happens | Request arrives | After authentication |
| Where | Middleware/Guard | Controller/Service |

**Implementation**:
1. **Middleware/Guard** validates credentials (authentication)
2. **Decorator or Guard** checks permissions (authorization)
3. **Service** enforces business logic constraints
4. Errors at each stage return appropriate status codes

## Endpoint Organization

**Public Endpoints** (no authentication):
- Health checks
- Login/Registration pages
- API documentation
- Public resources

**Authenticated Endpoints** (user must be logged in):
- User profile (`/me`)
- Personal dashboard
- User-specific resources

**Authorized Endpoints** (specific roles/permissions):
- Admin operations (`/admin/*`)
- Moderation tools
- Financial reports

## Service-to-Service Communication

**Pattern**: Separate endpoints for internal services

```
User-facing API:
  /api/users
  /api/shows
  /api/schedules

Service-to-Service API:
  /backdoor/users          (API key auth)
  /google-sheets/schedules (API key auth)
```

**Best Practices**:
- ✅ Use separate endpoint prefixes for internal APIs
- ✅ Use API key or different auth for service-to-service
- ✅ Log all service-to-service requests
- ❌ Never mix service-to-service and user endpoints
- ❌ Never use same auth mechanism for all endpoints

## Related Skills

- **backend-controller-pattern-nestjs/SKILL.md** - NestJS-specific implementation
- **service-pattern/SKILL.md** - Service layer design
- **data-validation/SKILL.md** - Validation strategies
- **authentication-authorization/SKILL.md** - Auth patterns

## Decision Tree

**Building with NestJS?**
→ See **backend-controller-pattern-nestjs/SKILL.md**
- Decorators, guards, pipes
- TypeScript patterns
- Zod serialization

**Building with other framework?**
→ Follow general principles here, adapt to framework conventions
- Use framework's routing mechanisms
- Apply same validation patterns
- Follow same status code conventions
- Implement same pagination approach

**Unsure about general principles?**
→ Stay here and read through
- Learn HTTP status codes
- Understand validation flow
- Study error handling patterns
- Review authorization concepts
