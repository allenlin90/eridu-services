# Eridu Services API Documentation

This directory contains documentation for the Eridu Services API (`erify_api`).

## Core Documentation

### Architecture & Design

- **[Architecture Overview](./ARCHITECTURE_OVERVIEW.md)** — High-level system architecture, tech stack, and module design
- **[Business Domain](./BUSINESS.md)** — Entity relationships and domain concepts

### Authorization

- **[Authorization Guide (Design Proposal)](./AUTHORIZATION_GUIDE.md)** — Planned JSONB-based roles/permissions system (NOT YET IMPLEMENTED)

### Features

- **[Schedule Upload API Design](./SCHEDULE_UPLOAD_API_DESIGN.md)** — Schedule planning with JSON docs, snapshots, and optimistic locking
- **[Task Management Summary](./TASK_MANAGEMENT_SUMMARY.md)** — Task management quick-reference: architecture, API, and workflows

### Roadmap

- **[Phase 1](./roadmap/PHASE_1.md)** — Core Functions with Simplified Auth
- **[Phase 2](./roadmap/PHASE_2.md)** — Task Management & Assignments
- **[Phase 3](./roadmap/PHASE_3.md)** — Material Management & File Uploads
- **[Phase 4](./roadmap/PHASE_4.md)** — Review Quality & Controlled Bulk Actions

### API Reference

- **[Postman Collection](./erify-api.postman_collection.json)** — Complete API endpoint collection for testing

## Implementation Patterns (Skills)

For implementation patterns, see `.agent/skills/`. These are the **canonical references** for how to write code in this codebase:

| Skill | Covers |
|---|---|
| `backend-controller-pattern-nestjs` | Controller types, base classes, response serialization |
| `service-pattern-nestjs` | Model services, ORM decoupling, error handling |
| `repository-pattern-nestjs` | BaseRepository, filtering, optimistic locking |
| `orchestration-service-nestjs` | Multi-service coordination, `@Transactional` |
| `authentication-authorization-nestjs` | JWT validation, token storage, protected routes |
| `erify-authorization` | AdminGuard, StudioProtected, role-based access |
| `database-patterns` | Soft delete, bulk ops, transactions, nested writes |
| `data-validation` | ID mapping, input validation, response serialization |
| `shared-api-types` | Zod schemas, DTO transforms, subpath imports |

## Documentation Structure

```
docs/
├── ARCHITECTURE_OVERVIEW.md         # System architecture (links to skills)
├── AUTHORIZATION_GUIDE.md           # Authorization design proposal (not implemented)
├── BUSINESS.md                      # Business domain concepts and entity relationships
├── SCHEDULE_UPLOAD_API_DESIGN.md    # Schedule planning system design
├── TASK_MANAGEMENT_SUMMARY.md       # Task management quick-reference
├── README.md                        # This file
├── roadmap/
│   ├── PHASE_1.md                  # Phase 1 implementation roadmap
│   ├── PHASE_2.md                  # Phase 2 implementation roadmap
│   ├── PHASE_3.md                  # Phase 3 implementation roadmap
│   └── PHASE_4.md                  # Phase 4 implementation roadmap
└── erify-api.postman_collection.json
```

## Quick Start

1. Read the **[Architecture Overview](./ARCHITECTURE_OVERVIEW.md)** for system design
2. Read **[Business Domain](./BUSINESS.md)** for entity relationships
3. Check **Phase Roadmaps** to see what's implemented
4. Use the **[Postman Collection](./erify-api.postman_collection.json)** to test endpoints
5. Run manual tests: `pnpm -F erify_api manual:*`

## External Packages

- **[Auth SDK](../../../packages/auth-sdk/README.md)** — JWT/JWKS integration (`@eridu/auth-sdk`)
- **[API Types](../../../packages/api-types/README.md)** — Shared Zod schemas and types (`@eridu/api-types`)

## Related Services

- **eridu_auth** — Authentication service (JWT tokens and JWKS endpoint)
- **auth-sdk** — Shared SDK for JWT/JWKS validation (`@eridu/auth-sdk`)
- **api-types** — Shared API contracts (`@eridu/api-types`)
