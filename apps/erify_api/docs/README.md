# Eridu Services API Documentation

This directory contains comprehensive documentation for the Eridu Services API (`erify_api`).

## Core Documentation

### Architecture & Design

- **[Architecture Overview](./ARCHITECTURE.md)** - Module architecture, dependencies, and design patterns
- **[Business Domain](./BUSINESS.md)** - Business domain information and entity relationships

### Authentication & Security

- **[Authentication & Authorization Guide](./AUTHENTICATION_GUIDE.md)** - JWT validation, authorization patterns, and SDK implementation strategy
- **[Server-to-Server Authentication Guide](./SERVER_TO_SERVER_AUTH.md)** - API key guard usage for service-to-service communication

### Features & Roadmap

- **[Phase 1 Roadmap](./roadmap/PHASE_1.md)** - Core Functions with Simplified Auth (current phase)
- **[Phase 2 Roadmap](./roadmap/PHASE_2.md)** - Material Management System (planned)
- **[Phase 3 Roadmap](./roadmap/PHASE_3.md)** - Advanced Authorization & Tracking (planned)
- **[Schedule Upload API Design](./SCHEDULE_UPLOAD_API_DESIGN.md)** - Schedule upload system design with JSON-based planning and snapshot versioning

### API Reference

- **[Postman Collection](./erify-api.postman_collection.json)** - Complete API endpoint collection for testing

## External Documentation

### SDK Documentation

- **[Auth SDK](../../../packages/auth-sdk/README.md)** - Complete SDK documentation for JWT/JWKS integration with Better Auth

### Shared Packages

- **[API Types](../../../packages/api-types/README.md)** - Shared API types and schemas package (`@eridu/api-types`)
  - Zod schemas for runtime validation
  - TypeScript types inferred from schemas
  - Constants (UID prefixes, etc.)
  - Reusable pagination schemas

## Quick Start

1. **Read the Architecture Overview** to understand the system design
2. **Review the Authentication Guide** to understand how JWT validation works
3. **Check Phase 1 Roadmap** to see what's implemented and what's pending
4. **Use the Postman Collection** to test API endpoints

## Documentation Structure

```
docs/
├── ARCHITECTURE.md              # System architecture and module design
├── AUTHENTICATION_GUIDE.md      # Authentication, authorization, and SDK implementation
├── BUSINESS.md                  # Business domain concepts and entity relationships
├── SERVER_TO_SERVER_AUTH.md     # API key authentication guide
├── SCHEDULE_UPLOAD_API_DESIGN.md # Schedule planning system design
├── README.md                    # This file
├── roadmap/
│   ├── PHASE_1.md              # Phase 1 implementation roadmap
│   ├── PHASE_2.md              # Phase 2 implementation roadmap
│   └── PHASE_3.md              # Phase 3 implementation roadmap
└── erify-api.postman_collection.json # API testing collection
```

## Key Concepts

### Authentication

- **JWT Validation**: Uses `@eridu/auth-sdk` SDK to validate tokens from `eridu_auth` service
  - Automatic JWKS caching on startup
  - Edge/worker runtime support with on-demand JWKS fetching
  - Automatic key rotation handling
  - `@CurrentUser()` decorator for accessing authenticated user information
- **JWKS**: JSON Web Key Sets fetched from Better Auth's JWKS endpoint
- **Admin Verification**: StudioMembership model determines admin permissions

### Authorization

- **Admin Users**: Full CRUD access via admin endpoints (verified via StudioMembership in ANY studio)
- **Other Users**: Access user-scoped endpoints (`/me/*`) with JWT authentication for their own data
- **Service Integration**: API key authentication for internal operations
  - Google Sheets API key for schedule operations
  - Backdoor API key for user/membership management

### Architecture

- **Modular Design**: Separated into Admin, Me, Backdoor, and Common modules
- **Service Pattern**: Consistent service patterns across all entities
- **Repository Pattern**: Base repository with soft delete support
- **Schedule Planning System**: JSON-based planning with snapshot versioning and optimistic locking
- **Bulk Operations**: Bulk create and update schedules with partial success handling
- **Validation & Publishing**: Pre-publish validation and sync to normalized Show tables

## Contributing

When updating documentation:

1. Keep architecture diagrams up to date
2. Update roadmap checklists as features are implemented
3. Add examples for new patterns or features
4. Cross-reference related documentation

## Related Services

- **eridu_auth**: Authentication service using Better Auth (provides JWT tokens and JWKS endpoint)
- **auth-sdk**: Shared SDK for JWT/JWKS validation (`@eridu/auth-sdk` package)
- **api-types**: Shared API types and schemas (`@eridu/api-types` package) - Centralized Zod schemas and TypeScript types for API contracts
