---
name: data-validation
description: Provides comprehensive guidance for input validation, data serialization, and ID management in backend APIs. This skill should be used when designing validation schemas, transforming request/response data, mapping database IDs to external identifiers, and ensuring type safety across API boundaries.
---

# Data Validation

Input validation, response serialization, and ID management patterns.

> See [references/validation-examples.md](references/validation-examples.md) for detailed code examples.

## Three-Layer Architecture

```
Client (snake_case) → HTTP API Boundary → Application (camelCase) → Database
```

| Layer | Responsibility |
|---|---|
| Controller | Validate input (schema), serialize output (schema) |
| Service | Business logic with internal format |
| Repository | Database access with internal format |

## ID Management

### External API Contract
- URL params and response `id` fields use UIDs (`user_abc123`)
- No `uid` field in responses — map `uid → id`
- Never expose database primary keys (`bigint`)

### UID Format
- Pattern: `{PREFIX}_{RANDOM_ID}` (e.g., `user_abc123`, `studio_ghi012`)
- Prefix has no trailing underscore
- Use cryptographically secure random

### 🔴 Never Compare Database IDs with UIDs
Database IDs (`BigInt`) and UIDs (`string`) are different types. Use query-based scoping or resolve UID to ID first.

## Input Validation

Validate at API boundary, transform format:
- snake_case → camelCase on input
- Check required fields, format, references
- Use Zod schemas and `createZodDto` at boundaries
- For date/time fields, use `z.iso.datetime()` / `z.iso.date()`, not `z.coerce.date()`

### Action Validation (Workflow Endpoints)
Validate action intent explicitly: action enum, required reason/metadata for audited transitions, deterministic error payloads.

## Response Serialization

- Map `uid → id`, hide database `id` field
- Transform camelCase → snake_case on output
- Transform dates to ISO format

## Checklist

- [ ] Validate all input at controller boundary with Zod schemas
- [ ] Transform snake_case ↔ camelCase at boundary
- [ ] Map `uid → id` in responses, hide database primary keys
- [ ] Check UID format (prefix pattern)
- [ ] Validate referenced entities exist
- [ ] Timestamps as ISO strings
- [ ] Error messages don't expose internal structure
- [ ] Pagination validated with defaults and max caps

## Related Skills

- [Controller Pattern](../backend-controller-pattern-nestjs/SKILL.md) — Validation at HTTP boundary
- [Service Pattern](../service-pattern-nestjs/SKILL.md) — Business logic validation
- [Repository Pattern](../repository-pattern-nestjs/SKILL.md) — Data access layer
