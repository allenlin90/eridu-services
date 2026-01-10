# Phase 1: Core Functions with Simplified Auth

## Overview

Phase 1 establishes the core production functions with simplified authentication where admin users have full CRUD access via admin endpoints and other users access their own data via user-scoped endpoints (`/me/*`). This phase includes essential entities, basic show management, and the Schedule Planning Management System using JSON-based planning documents with snapshot-based versioning.

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE.md)** - Module architecture, dependencies, and design patterns
- **[Business Domain](../BUSINESS.md)** - Business domain information and entity relationships
- **[Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md)** - Schedule upload system design with JSON-based planning and snapshot versioning
- **[Authentication & Authorization Guide](../AUTHENTICATION_GUIDE.md)** - JWT validation, authorization patterns, and SDK implementation
- **[Server-to-Server Authentication Guide](../SERVER_TO_SERVER_AUTH.md)** - API key guard usage
- **[Auth SDK](../../../packages/auth-sdk/README.md)** - Complete SDK documentation and API reference

## Core Features

### 1. Application Infrastructure

- **Configuration Management**: Environment validation, logging, security headers
- **Validation & Serialization**: Zod-based input validation and response serialization
- **Database Integration**: Prisma ORM with PostgreSQL, base repository patterns
- **API Foundation**: RESTful endpoints with consistent error handling and pagination
- **Simplified Authentication**: System Admin users access admin endpoints for CRUD operations, other users access user-scoped endpoints (`/me/*`) for their own data

### 2. Core Entity Management

- **User Management**: User accounts with SSO integration support
- **Client Management**: Client organizations and contact information
- **MC Management**: Master of Ceremonies profiles and aliases
- **Platform Management**: Streaming platform configurations and API settings
- **Studio Management**: Studio locations and room configurations
- **Studio Membership Management**: User-studio relationships for admin authentication (Client/Platform memberships deferred to Phase 3)

### 3. Basic Show Management

- **Show Creation**: Direct show creation with CONFIRMED status, or via Schedule publishing
- **Show Relationships**: Basic MC assignments and platform integrations
- **Show Types**: Categorization (BAU, campaign, other)
- **Show Status**: Lifecycle management (draft, confirmed, live, completed, cancelled)
- **Show Standards**: Quality tiers (standard, premium) for production levels
- **Show-Schedule Integration**: Shows can be linked to schedules for planning workflows
- **Show Orchestration**: Simplified orchestration for atomic show creation with MC/platform assignments (see [Architecture Overview](../ARCHITECTURE.md#showorchestrationmodule-))
  - Atomic show creation with assignments using Prisma nested creates
  - Single show operations (add/remove/replace MCs and platforms)
  - One operation per API call (no bulk operations for shows in Phase 1; schedule bulk operations are implemented)
  - UI-driven sync loop for Google Sheets import
- **Show Query Support**: Read-only queries optimized for MCs and Google Sheets integration
  - Query shows by client ID and date range (sorted by start time)
  - Monthly show listings for client calendars
- **Note**: Material associations implemented in Phase 2

### 4. Schedule Planning Management System

- **JSON-Based Planning**: Flexible spreadsheet-like editing during draft phase
- **Plan Documents**: Complete schedule data stored as JSON with metadata and show items
- **Snapshot Versioning**: Automatic version history with immutable snapshots for audit trail
- **Optimistic Locking**: Version column prevents concurrent update conflicts
- **Status Workflow**: Draft → Review → Published status transitions
- **Publishing**: Sync published schedules to normalized Show tables (delete + insert strategy)
- **Validation**: Pre-publish validation for room conflicts, MC double-booking, and data integrity
- **Version History**: Restore from any snapshot for rollback capabilities
- **Bulk Operations**: Bulk create and update schedules with partial success handling
- **Monthly Overview**: Get schedules grouped by client and status within a date range
- **Client-by-Client Schedule Upload**: Simple upload workflow for typical monthly planning ✅ (Implemented)
  - **Strategy**: One schedule per client (~50 shows each), then publish schedules individually
  - **No Chunking Needed**: Typical client schedules fit within payload limits (~1-2MB per schedule)
  - **Bulk Create**: `POST /admin/schedules/bulk` to create multiple schedules in one API call
  - **Individual Publishing**: Publish each schedule via `POST /admin/schedules/:id/publish` (one at a time)
  - **Use Case**: Monthly planning with ~50 clients, ~50 shows per client
  - **Note**: Bulk publish operations (publish multiple schedules in single API call) are deferred to Phase 2
  - **Design**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md#phase-1-client-by-client-upload--implemented) for workflow and rationale
- **Schedule Query Support**: Flexible queries for planning workflows
  - Query schedules by client ID and date range (for planning stage)
  - Support Google Sheets integration with sorted date-based listings
- **Implementation Details**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md) for complete design

### 5. Authentication & Authorization

- **JWT Validation**: JWK-based validation from `eridu_auth` service using Better Auth's JWKS endpoint
  - Cached JWKS on startup for efficient local token verification
  - Automatic cache recovery: SDK automatically refetches JWKS if cache is missing (handles edge/worker runtimes seamlessly)
  - Automatic key rotation handling
  - `JwtAuthGuard` integrated using `@eridu/auth-sdk` SDK
- **Authorization**:
  - **System Admin**: Users with `isSystemAdmin=true` have full CRUD access via `/admin/*` endpoints.
  - **Studio Admin**: StudioMembership model handles studio-specific roles (Phase 1).
  - **AdminGuard**: Global guard enforces System Admin check for `@AdminProtected()` endpoints.
  - Non-admin users access user-scoped endpoints (`/me/*`) with JWT authentication
- **Service-to-Service Auth**: API key guards for privileged operations
  - Google Sheets API key for schedule operations
  - Backdoor API key for user/membership management (`/backdoor/*` endpoints)
  - Backdoor JWKS refresh endpoint (`POST /backdoor/auth/jwks/refresh`)
- **Deferred to Phase 3**: Complex role hierarchy, Client/Platform memberships

## Implementation Scope

### App Configuration

- [x] Logger
- [x] Pretty print logger in development mode
- [x] Graceful shutdown
- [ ] SSO integration
- [x] Basic Helmet
- [x] Basic CORS
- [x] OpenAPI (Scalar UI with Zod integration)
- [x] ENV validation
- Zod validator and serializer
  - [x] Global pipe (input validation)
  - [x] Global interceptor (serializer)
  - [x] http-exception filter (catching zod errors)
  - [x] base repository class
  - [x] Pagination params and response

- Common utils
  - [x] Branded ID generator

- Authentication & Authorization (Hybrid Approach)
  - [x] JWK-based JWT token validation using `@eridu/auth-sdk` SDK
    - [x] Create `@eridu/auth-sdk` SDK package structure
    - [x] Implement `JwksService` in SDK (framework-agnostic, fetch and cache JWKS on startup)
    - [x] Implement `JwtVerifier` in SDK (framework-agnostic, JWT validation using Better Auth JWKS endpoint)
    - [x] Implement `JwtAuthGuard` NestJS adapter in SDK
    - [x] Edge/worker runtime support (on-demand JWKS fetching)
    - [x] Automatic key rotation handling
    - [x] Add `@eridu/auth-sdk` dependency to erify_api
    - [x] Add `ERIDU_AUTH_URL` to environment schema
    - [x] Register SDK services and guards in AuthModule
    - [x] Implement `JwtAuthGuard` in erify_api (extends SDK guard, adds ext_id mapping)
    - [x] Register `JwtAuthGuard` as global guard in `app.module.ts`
    - [x] Implement `@Public()` decorator for public endpoints
    - [x] User-scoped endpoints with JWT authentication (`/me/*` endpoints)
      - [x] `GET /me` - User profile endpoint (JWT guard protected via global guard)
      - [x] `GET /me/shows` - List shows assigned to authenticated MC user (JWT guard protected via global guard)
      - [x] `GET /me/shows/:show_id` - Get show details for authenticated MC user (JWT guard protected via global guard)
      - [x] `@CurrentUser()` decorator integration for accessing authenticated user
    - [x] Implement `AdminGuard` in erify_api (service-specific, depends on StudioMembership)
    - [x] Register `AdminGuard` as global guard in `app.module.ts`
    - [x] Implement `@AdminProtected()` decorator for admin-only endpoints
    - [x] Admin guard checks `@AdminProtected()` decorator (opt-in admin authorization)
    - [ ] Admin JWKS management endpoints (`GET /admin/jwks/status`, `POST /admin/jwks/refresh`) - uses SDK's `JwksService`
    - [x] Backdoor JWKS management endpoints (`POST /backdoor/auth/jwks/refresh`) - uses SDK's `JwksService`
  - [x] Simple StudioMembership model for admin verification (basic CRUD)
  - [x] Admin studio membership lookup (check if user is admin in ANY studio) - `StudioMembershipService.findAdminMembershipByExtId()`
  - [x] Admin guard implementation (JWT + StudioMembership verification) ✅ (Implemented as global guard)
  - [x] API key authentication for service-to-service communication
    - [x] Google Sheets API key guard (`GoogleSheetsApiKeyGuard`) for schedule operations
    - [x] Backdoor API key guard (`BackdoorApiKeyGuard`) for privileged operations
      - [x] Backdoor controllers separate from admin controllers (`/backdoor/*` vs `/admin/*`)
      - [x] `POST /backdoor/users` - Create user (API key required)
      - [x] `PATCH /backdoor/users/:id` - Update user (API key required)
      - [x] `POST /backdoor/studio-memberships` - Create membership (API key required)
      - [x] `POST /backdoor/auth/jwks/refresh` - Refresh JWKS (API key required)
      - [x] Guard extensible for future IP whitelisting
  - [x] Backdoor endpoint protection (API key guards at controller level, separate from admin endpoints)

- User-scoped endpoints (JWT authentication required)
  - [x] User profile endpoint (`GET /me`) - Returns authenticated user information from JWT payload
  - [x] MC show query endpoints (`GET /me/shows`, `GET /me/shows/:show_id`) - Query shows assigned to authenticated MC user
    - [x] ShowsController with JWT guard protection
    - [x] ShowsService for MC-scoped show queries
    - [x] User identifier extraction from JWT payload (ext_id mapping)

- CRUD entities by admin user
  - [x] User
  - [x] Client
  - [x] MC
  - [x] Platform
  - [x] ShowType
  - [x] ShowStatus
  - [x] ShowStandard
  - [x] Show (Direct show creation with full CRUD operations)
  - [x] ShowMC (Show-MC relationships)
  - [x] ShowPlatform (Show-platform integrations)
  - [x] Studio
  - [x] StudioRoom
  - [x] StudioMembership (Essential for admin verification - studio-specific only)
  - [x] ShowOrchestrationModule (Simplified orchestration for atomic show creation with assignments)
  - [x] Atomic show creation with MC/platform assignments
  - [x] Update show with assignments (updateShowWithAssignments)
  - [x] Single show relationship operations (add/remove/replace MCs and platforms)
  - [x] Relationship management endpoints (remove, replace operations)
  - [x] Schedule bulk operations (bulk create and bulk update with partial success handling)
  - [x] Schedule (Schedule Planning Management System with JSON documents)
    - [x] Database schema complete
    - [x] ScheduleService with basic CRUD operations including duplicate and optimistic locking
    - [x] Bulk operations (bulk create and bulk update with partial success handling)
    - [x] Monthly overview feature (schedules grouped by client and status)
    - [x] AdminScheduleController with full REST API endpoints at `/admin/schedules`
    - [x] ValidationService for pre-publish validation
    - [x] PublishingService for syncing JSON to normalized Show tables
  - [x] ScheduleSnapshot (Immutable version history snapshots)
    - [x] Database schema complete
    - [x] ScheduleSnapshotService with basic CRUD operations
    - [x] AdminSnapshotController for version history operations at `/admin/snapshots`
      - [x] `GET /admin/snapshots/:id` - Get snapshot details
      - [x] `POST /admin/snapshots/:id/restore` - Restore schedule from snapshot
    - [x] Auto-snapshot on update functionality
    - [x] Restore from snapshot functionality (via SchedulePlanningService)

- Seed data (Required for Show management)
  - [x] ShowType (bau, campaign, other)
  - [x] ShowStatus (draft, confirmed, live, completed, cancelled)
  - [x] ShowStandard (standard, premium)

- Schedule Planning Management System
  - [x] Schedule and ScheduleSnapshot entities with JSON plan documents
  - [x] Services: ScheduleService (CRUD, bulk ops, monthly overview), ScheduleSnapshotService, ValidationService, PublishingService
  - [x] Controllers: AdminScheduleController (`/admin/schedules`), AdminSnapshotController (`/admin/snapshots`)
  - [x] Client-by-client upload workflow (bulk create/update, individual publishing)
  - [x] Query support for client-scoped data (Google Sheets integration)
  - [x] Database indexes for performance
  - [x] MC-scoped show query endpoints (`GET /me/shows`, `GET /me/shows/:show_id`) with JWT authentication
  - ⚠️ Chunked upload service method exists but deferred to Phase 2 (no controller endpoint)

- Documentation
  - [x] Architecture Overview, Business Domain, Schedule Upload API Design, Authentication Guide

## Technical Considerations

### Database Design

- UID-based external identifiers (never expose internal database IDs)
- ID mapping: Generic `id` parameters in URLs map to internal UIDs
- Soft delete pattern, proper indexing, foreign key constraints
- See [Business Domain](../BUSINESS.md) for entity relationships and business rules

### API Design

- RESTful endpoints with ID mapping (UIDs for external communication)
- Zod-based validation, NestJS error handling, pagination
- Snake_case input/output with field mapping
- See [Architecture Overview](../ARCHITECTURE.md) for module dependencies and endpoint patterns

### Security

- JWK-based JWT validation with cached JWKS (see Core Features for details)
- Admin authorization via StudioMembership (admin users access admin endpoints, non-admin users access `/me/*` endpoints)
- Service-to-service API key authentication (Google Sheets, Backdoor)
- Input validation, SQL injection prevention (Prisma), CORS, security headers
- See [Authentication Guide](../AUTHENTICATION_GUIDE.md) and [Server-to-Server Authentication Guide](../SERVER_TO_SERVER_AUTH.md) for implementation details

### Performance

- Indexed queries for common operations
- Efficient relationship loading with Prisma includes
- Pagination for large result sets
- Soft delete filtering at repository level

## Success Criteria

### Core Entity Management

- [x] Complete CRUD operations for all core entities
- [x] Show orchestration with atomic creation and relationship management
- [x] Admin interface for entity management

### Schedule Planning Management System

- [x] JSON-based planning with snapshot versioning
- [x] Client-by-client upload workflow (bulk create/update, individual publishing)
- [x] Pre-publish validation and conflict detection
- [x] Query support for Google Sheets integration

### Authentication & Authorization

- [x] JWK-based JWT validation (SDK implemented, JwtAuthGuard integrated as global guard)
- [x] Global guards configuration (JwtAuthGuard and AdminGuard registered in app.module.ts)
- [x] Decorator-based protection (`@Public()`, `@AdminProtected()`, `@CurrentUser()`)
- [x] User-scoped endpoints with JWT authentication (`/me/*` endpoints protected via global guard)
  - [x] User profile endpoint (`GET /me`) with JWT guard (automatic via global guard)
  - [x] MC show query endpoints (`GET /me/shows`, `GET /me/shows/:show_id`) with JWT guard (automatic via global guard)
  - [x] `@CurrentUser()` decorator for accessing authenticated user information
- [x] StudioMembership model (database complete, service methods implemented)
- [x] AdminGuard implementation ✅ (Implemented as global guard with `@AdminProtected()` decorator)
- [x] Service-to-service API key authentication

### Quality & Performance

- [x] Testing coverage, security best practices, performance optimizations, seed data

## Dependencies

- [x] Infrastructure: PostgreSQL, Prisma ORM, NestJS framework, environment configuration
- [x] External services: `eridu_auth` service accessible
- [x] Database models: StudioMembership model complete
- [x] Service-to-service authentication: API key guards implemented
- [x] Dependencies: `jose` package available (provided by SDK)
- [x] Authentication integration: `@eridu/auth-sdk` SDK package, JWK-based JWT validation (JwtAuthGuard implemented)
- [x] Global guards registration: JwtAuthGuard and AdminGuard registered in app.module.ts
- [x] Decorator system: `@Public()`, `@AdminProtected()`, `@CurrentUser()` decorators implemented
- [x] Admin guard implementation ✅ (AdminGuard implemented and registered as global guard)

## Workflows

### User Access Strategy

- **System Admin Users**: Full CRUD access via admin endpoints (verified via `isSystemAdmin=true`)
- **Studio Admin Users**: Studio-specific access via StudioMembership (Phase 1)
- **Other Users**: Access user-scoped endpoints (`/me/*`) with JWT authentication for their own data
- **Service Integration**: API key authentication for internal operations
- **Future**: Client/Platform memberships in Phase 3

### Show Management Workflows

#### Direct Show Creation Workflow

1. **Individual Creation**: Operators create shows one-by-one through admin UI
2. **Atomic Creation**: Each show created with MC/platform assignments in single transaction
3. **Relationship Management**: Add/remove/replace MCs and platforms for individual shows as needed

#### Schedule Planning Workflow (Client-by-Client Approach)

1. **Google Sheets Preparation**: Operators maintain monthly planning data in Google Sheets (sorted by client)
2. **Group by Client**: AppsScript groups shows by client (one schedule per client)
3. **Bulk Create Schedules**: Create all schedules at once via `POST /admin/schedules/bulk` (~50 schedules, ~50 shows each)
4. **Individual Publishing**: Publish each schedule via `POST /admin/schedules/:id/publish` (one at a time)
   - Validate before publish: `POST /admin/schedules/:id/validate`
   - Publish schedule: `POST /admin/schedules/:id/publish`
5. **Handle Errors**: Review failed schedules, fix in Google Sheets, retry
6. **Monthly Overview**: Use `GET /admin/schedules/overview/monthly` to view all client schedules together
7. **Version History**: Every change creates immutable snapshot for audit trail and rollback capability

**Note**: Bulk publish operations (publish multiple schedules in single API call with async job tracking) are deferred to Phase 2.

#### Google Sheets Integration

For complete workflow, API call sequence, error handling, and AppsScript integration details, see **[Google Sheets Workflow](../manual-test/schedule-planning/GOOGLE_SHEETS_WORKFLOW.md)**.

#### Phase 1 Capabilities & Limitations

**Capabilities:**

- Direct show creation (one-by-one), schedule planning with JSON documents, snapshot versioning
- Pre-publish validation, optimistic locking, bulk schedule operations, individual publishing
- Client-by-client upload workflow (one schedule per client, ~50 shows each)

**Limitations:**

- One show operation per API call (no bulk show operations)
- No material management, CSV import/export, or chunked upload for large clients (>200 shows)

**Deferred to Phase 2+:** Bulk publish operations, chunked upload, material management, CSV import/export, enhanced query features, idempotency handling

## Implementation Details

### Service Patterns

**Show Service Pattern**: Consistent DTO-to-Prisma transformation with builder methods (`buildCreatePayload`, `buildUpdatePayload`), type-safe relation loading, time range validation, and comprehensive test coverage. For complex operations with multiple MCs/platforms, see [Architecture Overview](../ARCHITECTURE.md#showorchestrationmodule-).

**ShowPlatform Service Pattern**: Follows same pattern as ShowMC for managing show-platform relationships. Includes specialized queries (by show, by platform, composite key lookup), soft delete support, and relationship-specific metadata (live stream links, platform show IDs, viewer counts).

## Database Schema

> **Note**: This section shows the Phase 1 database schema. For comprehensive business domain information, entity relationships, and detailed business rules, see the [Business Domain](../BUSINESS.md) documentation.

### User Management

#### User

```prisma
model User {
  id                 BigInt             @id @default(autoincrement())
  uid                String             @unique
  extId              String?            @unique @map("ext_id") // For SSO integration
  email              String             @unique
  name               String
  isBanned           Boolean            @default(false) @map("is_banned")
  profileUrl         String?            @map("profile_url")
  metadata           Json               @default("{}")
  mc                 MC? // Optional MC profile linkage
  studioMemberships  StudioMembership[]
  schedules          Schedule[]         @relation("ScheduleCreator")
  publishedSchedules Schedule[]         @relation("SchedulePublisher")
  scheduleSnapshots  ScheduleSnapshot[]
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")
  deletedAt          DateTime?          @map("deleted_at")

  @@index([uid])
  @@index([email])
  @@index([name])
  @@index([extId])
  @@index([isBanned])
  @@index([deletedAt])
  @@map("users")
}
```

**Note**: Relations to `Comment`, `Task`, `Audit` (Phase 3) will be added in that phase. Relations to `Material` (Phase 2) will be added in that phase.

#### MC

```prisma
model MC {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  userId    BigInt?   @unique @map("user_id")
  name      String
  aliasName String    @map("alias_name")
  isBanned  Boolean   @default(false) @map("is_banned")
  metadata  Json      @default("{}")
  showMCs   ShowMC[]
  user      User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@index([uid])
  @@index([userId])
  @@index([name])
  @@index([aliasName])
  @@index([isBanned])
  @@index([deletedAt])
  @@map("mcs")
}
```

### Client & Platform Management

#### Client

```prisma
model Client {
  id            BigInt     @id @default(autoincrement())
  uid           String     @unique
  name          String     @unique
  contactPerson String     @map("contact_person")
  contactEmail  String     @map("contact_email")
  metadata      Json       @default("{}")
  shows         Show[]
  schedules     Schedule[]
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")
  deletedAt     DateTime?  @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@index([contactPerson])
  @@index([contactEmail])
  @@index([deletedAt])
  @@map("clients")
}
```

**Note**: Relations to `Material` (Phase 2) will be added in that phase. The `schedules` relation links clients to their schedule planning documents.

#### Platform

```prisma
model Platform {
  id            BigInt         @id @default(autoincrement())
  uid           String         @unique
  name          String
  apiConfig     Json           @map("api_config")
  metadata      Json           @default("{}")
  showPlatforms ShowPlatform[]
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  deletedAt     DateTime?      @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@index([deletedAt])
  @@map("platforms")
}
```

**Note**: Relations to `Material` (Phase 2) will be added in that phase.

### Show Management

#### Show

```prisma
model Show {
  id             BigInt         @id @default(autoincrement())
  uid            String         @unique
  name           String
  startTime      DateTime       @map("start_time")
  endTime        DateTime       @map("end_time")
  metadata       Json           @default("{}")
  clientId       BigInt         @map("client_id")
  client         Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  studioRoomId   BigInt?        @map("studio_room_id")
  studioRoom     StudioRoom?    @relation(fields: [studioRoomId], references: [id], onDelete: SetNull)
  showTypeId     BigInt         @map("show_type_id")
  showType       ShowType       @relation(fields: [showTypeId], references: [id])
  showStatusId   BigInt         @map("show_status_id")
  showStatus     ShowStatus     @relation(fields: [showStatusId], references: [id])
  showStandardId BigInt         @map("show_standard_id")
  showStandard   ShowStandard   @relation(fields: [showStandardId], references: [id])
  scheduleId     BigInt?        @map("schedule_id")
  Schedule       Schedule?      @relation(fields: [scheduleId], references: [id])
  showMCs        ShowMC[]
  showPlatforms  ShowPlatform[]
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")
  deletedAt      DateTime?      @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@index([clientId])
  @@index([studioRoomId])
  @@index([showTypeId])
  @@index([showStatusId])
  @@index([showStandardId])
  @@index([scheduleId])
  @@index([startTime, endTime])
  @@index([startTime])
  @@index([endTime])
  @@index([deletedAt])
  @@index([clientId, deletedAt])
  @@index([studioRoomId, deletedAt])
  @@index([scheduleId, deletedAt])
  @@index([showStatusId, deletedAt])
  @@index([startTime, deletedAt])
  @@map("shows")
}
```

**Note**: The `scheduleId` field and `Schedule` relation link shows to schedules for planning workflows. The `showMaterials` relation (Phase 2) will be added in that phase.

#### ShowMC

```prisma
model ShowMC {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  showId    BigInt    @map("show_id")
  mcId      BigInt    @map("mc_id")
  note      String?
  metadata  Json      @default("{}")
  show      Show      @relation(fields: [showId], references: [id], onDelete: Cascade)
  mc        MC        @relation(fields: [mcId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@unique([showId, mcId])
  @@index([uid])
  @@index([showId])
  @@index([mcId])
  @@index([deletedAt])
  @@index([showId, deletedAt])
  @@index([mcId, deletedAt])
  @@map("show_mcs")
}
```

#### ShowPlatform

```prisma
model ShowPlatform {
  id             BigInt    @id @default(autoincrement())
  uid            String    @unique
  liveStreamLink String    @map("live_stream_link")
  platformShowId String    @map("platform_show_id") // external id of the platform e.g., tiktok
  viewerCount    Int       @default(0) @map("viewer_count")
  metadata       Json      @default("{}")
  showId         BigInt    @map("show_id")
  show           Show      @relation(fields: [showId], references: [id], onDelete: Cascade)
  platformId     BigInt    @map("platform_id")
  platform       Platform  @relation(fields: [platformId], references: [id], onDelete: Cascade)
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  @@unique([showId, platformId])
  @@index([uid])
  @@index([showId])
  @@index([platformId])
  @@index([platformShowId])
  @@index([deletedAt])
  @@index([showId, deletedAt])
  @@index([platformId, deletedAt])
  @@map("show_platforms")
}
```

#### ShowType

```prisma
model ShowType {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  name      String    @unique // bau, campaign, other
  metadata  Json      @default("{}")
  shows     Show[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@index([uid])
  @@index([deletedAt])
  @@map("show_types")
}
```

#### ShowStatus

```prisma
model ShowStatus {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  name      String    @unique // draft, confirmed, live, completed, cancelled
  metadata  Json      @default("{}")
  shows     Show[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@index([uid])
  @@index([deletedAt])
  @@map("show_status")
}
```

#### ShowStandard

```prisma
model ShowStandard {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  name      String    @unique // standard, premium
  metadata  Json      @default("{}")
  shows     Show[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@index([uid])
  @@index([deletedAt])
  @@map("show_standards")
}
```

### Studio Management

#### Studio

```prisma
model Studio {
  id                BigInt             @id @default(autoincrement())
  uid               String             @unique
  name              String             @unique
  address           String
  metadata          Json               @default("{}")
  studioRooms       StudioRoom[]
  studioMemberships StudioMembership[]
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  deletedAt         DateTime?          @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@index([deletedAt])
  @@map("studios")
}
```

**Note**: Relations to `Tag` and `TaskTemplate` (Phase 3) will be added in that phase. The `materials` relation (Phase 2) will be added in that phase.

#### StudioRoom

```prisma
model StudioRoom {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  studioId  BigInt    @map("studio_id")
  name      String
  capacity  Int?
  metadata  Json      @default("{}")
  studio    Studio    @relation(fields: [studioId], references: [id])
  shows     Show[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@unique([studioId, name])
  @@index([uid])
  @@index([studioId])
  @@index([name])
  @@index([studioId, name])
  @@index([deletedAt])
  @@index([studioId, deletedAt])
  @@map("studio_rooms")
}
```

### Authorization (Basic)

#### StudioMembership

```prisma
model StudioMembership {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  role      String // admin, manager, member
  metadata  Json      @default("{}")
  userId    BigInt    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  studioId  BigInt    @map("studio_id")
  studio    Studio    @relation(fields: [studioId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@unique([userId, studioId])
  @@index([uid])
  @@index([userId])
  @@index([studioId])
  @@index([role])
  @@index([userId, role])
  @@index([deletedAt])
  @@index([userId, deletedAt])
  @@index([studioId, deletedAt])
  @@map("studio_memberships")
}
```

**Note on Phase 1 StudioMembership**: This model implements studio-specific user relationships for simple admin verification (checking if user has admin role in ANY studio). The direct foreign key relationship to Studio simplifies Prisma implementation. Client and Platform membership models will be added separately in Phase 3 when advanced role-based access control is implemented.

### Schedule Planning Management System

#### Schedule

```prisma
model Schedule {
  id              BigInt             @id @default(autoincrement())
  uid             String             @unique
  name            String // e.g., "January 2025 Planning"
  startDate       DateTime           @map("start_date")
  endDate         DateTime           @map("end_date")
  status          String             @default("draft") // draft, review, published
  publishedAt     DateTime?          @map("published_at")
  planDocument    Json               @map("plan_document")
  version         Int                @default(1)
  metadata        Json               @default("{}")
  clientId        BigInt?             @map("client_id")
  client          Client?             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdBy       BigInt?             @map("created_by")
  createdByUser   User?              @relation("ScheduleCreator", fields: [createdBy], references: [id], onDelete: SetNull)
  publishedBy     BigInt?             @map("published_by")
  publishedByUser User?              @relation("SchedulePublisher", fields: [publishedBy], references: [id], onDelete: SetNull)
  shows           Show[] // Shows created from this schedule
  snapshots       ScheduleSnapshot[] // Version history
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")
  deletedAt       DateTime?          @map("deleted_at")

  @@index([uid])
  @@index([clientId])
  @@index([status])
  @@index([publishedAt])
  @@index([startDate, endDate])
  @@index([clientId, startDate, endDate])
  @@index([createdBy])
  @@index([deletedAt])
  @@index([status, deletedAt])
  @@index([clientId, deletedAt])
  @@index([createdBy, deletedAt])
  @@index([publishedBy, deletedAt])
  @@map("schedules")
}
```

#### ScheduleSnapshot

```prisma
model ScheduleSnapshot {
  id             BigInt   @id @default(autoincrement())
  uid            String   @unique
  planDocument   Json     @map("plan_document")
  version        Int // Which version this snapshot represents
  status         String // Status at time of snapshot
  snapshotReason String   @map("snapshot_reason") // auto_save, before_publish, manual, before_restore
  metadata       Json     @default("{}")
  createdBy      BigInt?  @map("created_by")
  user           User?    @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  scheduleId     BigInt   @map("schedule_id")
  schedule       Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([uid])
  @@index([scheduleId, version])
  @@index([scheduleId, createdAt])
  @@index([createdBy])
  @@index([createdBy, createdAt])
  @@map("schedule_snapshots")
}
```

**Note on Schedule Planning**: The Schedule Planning Management System uses JSON documents for flexible planning during draft phase, with automatic snapshots for version history. Only published schedules sync their JSON data to normalized Show tables. See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md) for complete design and implementation details.
