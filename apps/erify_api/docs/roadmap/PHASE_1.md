
# Phase 1: Core Functions with Simplified Auth

## Overview
Phase 1 establishes the core production functions with simplified authentication where admin users have full CRUD access and other users have read-only access. This phase includes essential entities, basic show management, and the Schedule Planning Management System using JSON-based planning documents with snapshot-based versioning.

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE.md)** - Complete module architecture, dependencies, and design patterns (including Show Orchestration)
- **[Business Domain](../BUSINESS.md)** - Comprehensive business domain information and entity relationships
- **[Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md)** - Complete schedule upload system design with JSON-based planning, snapshot versioning, and publishing workflow
- **[Authentication Guide](../AUTHENTICATION_GUIDE.md)** - JWT validation and authorization patterns

## Core Features

### 1. Application Infrastructure
- **Configuration Management**: Environment validation, logging, security headers
- **Validation & Serialization**: Zod-based input validation and response serialization
- **Database Integration**: Prisma ORM with PostgreSQL, base repository patterns
- **API Foundation**: RESTful endpoints with consistent error handling and pagination
- **Simplified Authentication**: Admin write access, others read-only

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
- **Client-by-Client Schedule Upload**: Simple upload workflow for typical monthly planning
  - **Strategy**: One schedule per client (~50 shows each), then publish schedules individually
  - **No Chunking Needed**: Typical client schedules fit within payload limits (~1-2MB per schedule)
  - **Individual Publishing**: Publish each schedule via `POST /admin/schedules/:id/publish` (one at a time)
  - **Use Case**: Monthly planning with ~50 clients, ~50 shows per client
  - **Note**: Bulk publish operations (publish multiple schedules in single API call) are deferred to Phase 2
  - **Design**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md#phase-1-client-by-client-upload--implemented) for workflow and rationale
  - **Status**: Recommended approach for Phase 1 implementation
- **Schedule Query Support**: Flexible queries for planning workflows
  - Query schedules by client ID and date range (for planning stage)
  - Support Google Sheets integration with sorted date-based listings
- **Implementation Details**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md) for complete design

### 5. Authentication & Authorization (Hybrid Approach)
- **JWT Token Validation**: Validate JWT tokens from `erify_auth` service for user identification only
- **Simple Authorization**: Use StudioMembership model to distinguish admin vs non-admin users
- **Admin Verification**: Check if user has admin studio membership in ANY studio (simplified check)
- **Admin Guard**: Verify JWT + check admin studio membership existence for write operations
- **Read-Only Access**: Non-admin users get read-only access to all resources
- **Service-to-Service Auth**: API key authentication for internal service communication
- **Deferred to Phase 3**: Complex role hierarchy, context-specific permissions, Client and Platform memberships
- **Implementation Details**: See [Authentication Guide](../AUTHENTICATION_GUIDE.md) for JWT validation patterns and authorization implementation

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
  - [ ] JWT token validation from `erify_auth` service for user identification
  - [x] Simple StudioMembership model for admin verification (basic CRUD) 
  - [ ] Admin studio membership lookup (check if user is admin in ANY studio)
  - [ ] Admin guard implementation (JWT + StudioMembership verification)
  - [ ] Read-only access for non-admin users
  - [ ] API key authentication for service-to-service communication
  - [ ] Admin endpoint protection

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
  - [x] Schedule entity with JSON plan document storage
  - [x] ScheduleSnapshot entity for version history
  - [x] ScheduleService (basic CRUD operations including duplicate, optimistic locking)
  - [x] ScheduleService bulk operations (bulk create and bulk update)
  - [x] ScheduleService monthly overview (schedules grouped by client and status)
  - [x] ScheduleSnapshotService (basic CRUD operations with auto-snapshot on update)
  - [x] ValidationService (pre-publish validation with conflict detection)
  - [x] PublishingService (sync JSON documents to normalized Show tables)
  - [x] AdminScheduleController with REST API endpoints at `/admin/schedules`
    - [x] Bulk create endpoint (`POST /admin/schedules/bulk`)
    - [x] Bulk update endpoint (`PATCH /admin/schedules/bulk`)
    - [x] Monthly overview endpoint (`GET /admin/schedules/overview/monthly`)
    - [x] Individual schedule publish endpoint (`POST /admin/schedules/:id/publish`)
    - [x] Individual schedule validate endpoint (`POST /admin/schedules/:id/validate`)
  - [x] AdminSnapshotController for version history operations at `/admin/snapshots`
    - [x] `GET /admin/snapshots/:id` - Get snapshot details
    - [x] `POST /admin/snapshots/:id/restore` - Restore schedule from snapshot
  - [x] Schedule restore from snapshot functionality (via SchedulePlanningService)
    - [x] `GET /admin/schedules/:id/snapshots` - List snapshots for a schedule
    - [x] Restore workflow with `before_restore` snapshot creation
  - [x] Update Show model to include `scheduleId` field
  - [x] **Client-by-Client Schedule Upload** ⭐ (Phase 1 Primary Approach)
    - [x] **Bulk Create/Update Operations**
      - [x] `POST /admin/schedules/bulk` - Bulk create schedules (one per client)
      - [x] `PATCH /admin/schedules/bulk` - Bulk update schedules
      - [x] Partial success handling (failures isolated per client)
      - [x] Detailed per-schedule results with error reporting
    - [x] **Individual Schedule Publishing**
      - [x] `POST /admin/schedules/:id/publish` - Publish single schedule
      - [x] `POST /admin/schedules/:id/validate` - Validate before publish
      - [x] Per-client validation (room conflicts, MC double-booking)
    - [x] **Monthly Overview**
      - [x] Use existing `GET /admin/schedules/overview/monthly` endpoint
      - [x] Groups schedules by client and status
      - [ ] Test with 50+ clients (documentation/testing pending)
    - [ ] **Google Sheets Integration**
      - [ ] Group shows by client before uploading
      - [ ] Create one schedule per client (~50 shows each)
      - [ ] Simple AppsScript code using bulk create + individual publish
    - [ ] **Testing**
      - [x] Unit tests: bulk create/update
      - [x] Integration tests: 50 clients, ~50 shows each
      - [x] Individual publish integration tests
      - [ ] Google Sheets simulation with AppsScript
    - [x] **Documentation**
      - [x] Updated test-payloads/README.md with client-by-client workflow
      - [x] Google Sheets integration examples
      - [x] API usage guide in SCHEDULE_UPLOAD_API_DESIGN.md
      - [x] Google Sheets API calling workflow flowchart with complete lifecycle (create → individual publish)
    - [x] See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md#phase-1-client-by-client-upload--implemented) for complete workflow
  - ⚠️ **Note**: Chunked upload `appendShows` service method exists (service layer only, no controller endpoint) but is **deferred to Phase 2** as there's no current demand for large single-client schedules
  - [x] **Enhanced Query Support for Client-Scoped Data (Google Sheets Integration)**
    - [x] Add query parameters to `GET /admin/schedules` endpoint (client_id, start_date, end_date, order_by) for planning stage queries
    - [x] Add `include_plan_document` query parameter to `GET /admin/schedules` endpoint (default: `false`) to exclude large `plan_document` from list responses
    - [x] Add query parameters to `GET /admin/shows` endpoint (client_id, start_date, end_date, order_by)
    - [x] Add database indexes for performance: `[clientId, startTime]` and `[clientId, startTime, deletedAt]` on Show model 
    - [x] Add database index for performance: `[clientId, startDate, endDate, deletedAt]` on Schedule model 
    - [x] Update ScheduleService to support flexible date range queries by client ID (getMonthlyOverview supports clientIds, but regular GET endpoint needs query params)
    - [x] Update ShowService/ShowOrchestrationService to support flexible date range queries by client ID (getShowsByClient, getShowsByDateRange exist, but need to be exposed via query params)
    - [x] Verify monthly overview endpoints support proper client filtering and sorting for Google Sheets use case  (Monthly overview supports clientIds filtering)

- Documentation
  - [x] [Architecture Overview](../ARCHITECTURE.md) - Complete module architecture and design patterns
  - [x] [Business Domain](../BUSINESS.md) - Comprehensive business domain information
  - [x] [Architecture Overview](../ARCHITECTURE.md) - Cross-module coordination patterns including Show Orchestration
  - [x] [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md) - Complete schedule upload system design with JSON-based planning and snapshot versioning
  - [x] [Authentication Guide](../AUTHENTICATION_GUIDE.md) - JWT validation and authorization patterns

## Technical Considerations

### Database Design
- Consistent UID-based external identifiers (never expose internal database IDs)
- ID mapping pattern: Generic `id` parameters in URLs map to internal UIDs for external communication
- Hides number-based primary keys from external stakeholders
- Soft delete pattern for data preservation
- Proper indexing for performance
- Foreign key constraints for data integrity
- Polymorphic relationships for flexible associations
- **Entity Relationships**: See [Business Domain](../BUSINESS.md) for comprehensive entity relationship diagrams and business rules

### API Design
- RESTful endpoints following established patterns with ID mapping
- Generic `id` parameters in URLs that map to internal UIDs for external communication
- Hides internal database structure (number-based primary keys) from external stakeholders
- Consistent validation with Zod schemas
- Proper error handling with NestJS exceptions
- Pagination support for large datasets
- Snake_case input/output with proper field mapping
- **Module Architecture**: See [Architecture Overview](../ARCHITECTURE.md) for detailed module dependencies and API endpoint patterns

### Security
- **Hybrid Authentication**: JWT validation for user identification + StudioMembership model for admin verification
- **Admin Write, Non-Admin Read-Only**: Simple authorization pattern
- **Input validation and sanitization**
- **SQL injection prevention via Prisma**
- **CORS and security headers**
- **JWT token validation from erify_auth service**
- **Basic admin verification via StudioMembership lookup**
- **Implementation Guide**: See [Authentication Guide](../AUTHENTICATION_GUIDE.md) for detailed JWT validation and authorization implementation patterns

### Performance
- Indexed queries for common operations
- Efficient relationship loading with Prisma includes
- Pagination for large result sets
- Soft delete filtering at repository level

## Success Criteria

### Core Entity Management
- [x] Complete CRUD operations for core entities (Users, Clients, MCs, Platforms, Studios, StudioRooms, ShowType, ShowStatus, ShowStandard)
- [x] Functional direct show creation with full CRUD operations
- [x] Working show-MC relationships (ShowMC entity)
- [x] Working show-platform relationships (ShowPlatform entity)
- [x] ShowOrchestrationModule implementation:
  - [x] Atomic show creation with MC/platform assignments
  - [x] Single show relationship operations (add/remove/replace MCs and platforms)
  - [x] Relationship management endpoints
- [x] Admin interface for managing all implemented entities

### Schedule Planning Management System (Individual Publishing)
- [x] Schedule entity with JSON plan document storage
- [x] ScheduleSnapshot for version history
- [x] Schedule publishing workflow (JSON → normalized Show tables)
- [x] Per-client validation with conflict detection (room conflicts, MC double-booking)
- [x] Snapshot restore functionality (via SchedulePlanningService)
- [x] Bulk operations:
  - [x] Bulk create schedules with partial success handling
  - [x] Bulk update schedules with partial success handling
  - [x] Individual schedule publishing (one schedule at a time)
- [x] Monthly overview endpoint (schedules grouped by client and status within date range)
- [x] Client-by-client upload strategy documented and implemented
- [x] Individual schedule publishing (validate and publish one schedule at a time)
- ⚠️ Chunked upload service method implemented (Phase 2 feature, no controller endpoint)

### Authentication & Authorization ⚠️ **PARTIAL**
- [ ] JWT token validation from `erify_auth` service for user identification
- [x] Simple StudioMembership model (database model complete, auth integration pending)
- [ ] Admin guard implementation (JWT + StudioMembership verification)
- [ ] Hybrid authentication with admin write, others read-only

### Quality & Performance
- [x] Comprehensive testing coverage for core services (unit tests)
- [x] Security best practices implemented (input validation, SQL injection prevention, CORS, headers)
- [x] Performance optimizations in place (indexed queries, pagination, efficient loading)
- [x] Seed data for reference tables (ShowType, ShowStatus, ShowStandard)

## Dependencies
- [x] PostgreSQL database setup
- [x] Prisma ORM configuration
- [x] NestJS framework setup
- [x] Environment configuration
- [x] `erify_auth` service running and accessible
- [ ] JWT token validation setup
- [x] Simple StudioMembership model for admin verification (database model complete)
- [ ] Admin guard implementation using JWT + StudioMembership
- [ ] Hybrid authentication system (admin vs read-only)
- [ ] Service-to-service authentication setup
- **Architecture Reference**: See [Architecture Overview](../ARCHITECTURE.md) for complete module dependencies and implementation patterns

## Timeline & Rollout Strategy

### Phase 1 Implementation
This phase delivers the core production functions with hybrid authentication approach. The implementation focuses on:

1. **Core Entities**: Complete CRUD operations for essential entities
2. **Direct Show Management**: Show creation with CONFIRMED status
3. **Resource Assignment**: Direct assignment of MCs and platforms
4. **JWT Validation**: Token validation for user identification
5. **Simple Authorization**: StudioMembership model for admin verification
6. **Service Integration**: Integration with `erify_auth` service for authentication

### User Access Strategy
- **Admin Users**: Full CRUD access to all resources (verified via simple StudioMembership lookup)
- **Other Users**: Read-only access to all resources (authenticated via JWT validation)
- **Authentication**: JWT tokens from `erify_auth` service for user identification
- **Authorization**: Simple StudioMembership model determines admin permissions
- **Service Integration**: API key authentication for internal service communication
- **Future Enhancement**: Advanced authorization control with Client/Platform memberships in Phase 3
- **Flexible Rollout**: Features can be enabled/disabled per user type as needed

### Show Management Workflows (Phase 1)

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

**Note**: Bulk publish operations (publish multiple schedules in single API call with async job tracking) are deferred to Phase 2. See Phase 2 roadmap for bulk publish endpoint and job status tracking.

#### Google Sheets Integration

For complete Google Sheets integration workflow, API call sequence, error handling, and AppsScript integration details, see **[Google Sheets Workflow](../test-payloads/GOOGLE_SHEETS_WORKFLOW.md)**.

#### Migration from Google Sheets (Deferred to Phase 2)
1. **CSV Export**: Export historical data from Google Sheets (planned for Phase 2)
2. **CSV Import**: Import CSV file into Schedule as JSON plan document (planned for Phase 2)
3. **Review & Edit**: Operators review and edit schedule in planning UI
4. **Publish**: Publish schedule to create normalized Show records

**Phase 1 Capabilities:**
- ✅ Direct show creation (one-by-one)
- ✅ Schedule planning with JSON documents
- ✅ Snapshot-based version history
- ✅ Pre-publish validation with conflict detection (per-client)
- ✅ Optimistic locking for concurrent edits
- ✅ Schedule bulk operations (bulk create and bulk update)
- ✅ Individual schedule publishing (validate and publish one schedule at a time)
- ✅ Monthly overview (schedules grouped by client and status)
- ✅ **Client-by-Client Schedule Upload** (Primary approach for Phase 1)
  - ✅ One schedule per client (~50 shows each)
  - ✅ No chunking needed for typical clients
  - ✅ Bulk create/update operations implemented
  - ✅ Individual schedule publishing (one at a time)
  - ⚠️ Google Sheets integration examples (documentation pending)

**Phase 1 Limitations:**
- One direct show operation per API call (no bulk operations for shows)
- No material management capabilities
- No CSV import/export for Google Sheets migration
- **No chunked upload** (large clients with 200+ shows not supported)

**Future Enhancements (Phase 2+):**
- **Bulk Publish Operations** ⭐ - Validate and publish multiple schedules in single API call with async job tracking (Phase 2)
- **Chunked Upload for Large Clients** (>200 shows per client) - Edge cases only (Phase 2)
- **Cross-client validation endpoint** - Validate conflicts across multiple schedules (Phase 2)
- **Enhanced error reporting** - Row numbers and detailed validation errors (Phase 2)
- **Email notifications** - Notify users when bulk publish jobs complete (Phase 2)
- Show bulk operations (bulk create and bulk update with partial success handling) (Phase 2)
- Material Management System (material versioning, platform targeting, show-material associations) (Phase 2)
- CSV import/export service for migration from Google Sheets (Phase 2)
- API query features (expand parameter, search and search_term parameters) (Phase 2)
- Idempotency handling for show and schedule creation requests (Phase 2)

This approach provides a solid foundation with core functions while maintaining simplicity in the authentication layer and preparing for advanced features in later phases.

## Implementation Details

### Show Service Pattern (✅ Implemented)

The Show service follows a consistent pattern for DTO-to-Prisma payload transformation. For complex show operations involving multiple MCs and platforms, see the [Architecture Overview](../ARCHITECTURE.md#showorchestrationmodule-) for cross-module coordination patterns.

#### Service Methods
- **`createShowFromDto(dto, include?)`**: Accepts `CreateShowDto` and uses `buildCreatePayload()` to transform to Prisma input
- **`createShow(data, include?)`**: Accepts `Omit<Prisma.ShowCreateInput, 'uid'>` directly for advanced use cases
- **`getShowById(uid, include?)`**: Retrieves show with optional relations using generic includes
- **`getShows(params, include?)`**: Lists shows with pagination and filtering
- **`updateShowFromDto(uid, dto, include?)`**: Accepts `UpdateShowDto` and uses `buildUpdatePayload()` to transform
- **`updateShow(uid, data, include?)`**: Accepts `Prisma.ShowUpdateInput` directly
- **`deleteShow(uid)`**: Soft deletes a show

#### Builder Methods
- **`buildCreatePayload(dto)`**: Transforms `CreateShowDto` to Prisma create input
  - Validates time range (endTime must be after startTime)
  - Handles all foreign key connections via UID
  - Sets default metadata to empty object
  
- **`buildUpdatePayload(dto)`**: Transforms `UpdateShowDto` to Prisma update input
  - Uses explicit `undefined` checks for optional fields
  - Validates time range when both times are updated
  - Handles foreign key updates

#### Type Safety
- **`ShowWithIncludes<T>`**: Generic type for show results with relations
- All methods support generic include parameters for type-safe relation loading
- Return types are properly typed as `Show | ShowWithIncludes<T>`

#### Validation
- Time range validation: `endTime` must be after `startTime`
- Validation occurs in `buildCreatePayload()` and `buildUpdatePayload()`
- Prisma unique constraint violations mapped to 409 Conflict errors

#### Testing
- Comprehensive test coverage in `show.service.spec.ts`
- Tests cover create, read, update, delete operations
- Tests include validation, error handling, and edge cases
- 15 test cases covering all major service methods

This pattern provides:
- Clear separation between DTO handling and direct Prisma operations
- Flexibility for both API endpoints and internal service usage
- Type-safe relation loading with generic includes
- Consistent transformation logic in builder methods
- Easy to test individual components

### ShowPlatform Service Pattern (✅ Implemented)

The ShowPlatform service follows the same consistent pattern as ShowMC for managing show-platform relationships:

#### Service Methods
- **`createShowPlatformFromDto(dto, include?)`**: Accepts `CreateShowPlatformDto` and uses `buildCreatePayload()` to transform to Prisma input
- **`createShowPlatform(data, include?)`**: Accepts `Omit<Prisma.ShowPlatformCreateInput, 'uid'>` directly for advanced use cases
- **`getShowPlatformById(uid, include?)`**: Retrieves show-platform with optional relations using generic includes
- **`getShowPlatforms(params, include?)`**: Lists show-platforms with pagination and filtering
- **`getActiveShowPlatforms(params)`**: Lists only non-deleted show-platforms
- **`getShowPlatformsByShow(showId, params?)`**: Lists all platforms for a specific show
- **`getShowPlatformsByPlatform(platformId, params?)`**: Lists all shows for a specific platform
- **`findShowPlatformByShowAndPlatform(showId, platformId)`**: Finds specific show-platform relationship
- **`updateShowPlatformFromDto(uid, dto, include?)`**: Accepts `UpdateShowPlatformDto` and uses `buildUpdatePayload()` to transform
- **`updateShowPlatform(uid, data, include?)`**: Accepts `Prisma.ShowPlatformUpdateInput` directly
- **`deleteShowPlatform(uid)`**: Soft deletes a show-platform relationship
- **`countShowPlatforms(where?)`**: Counts show-platform records with optional filtering

#### Builder Methods
- **`buildCreatePayload(dto)`**: Transforms `CreateShowPlatformDto` to Prisma create input
  - Handles foreign key connections via UID (show, platform)
  - Sets default viewer count to 0 if not provided
  - Sets default metadata to empty object
  
- **`buildUpdatePayload(dto)`**: Transforms `UpdateShowPlatformDto` to Prisma update input
  - Uses explicit `undefined` checks for optional fields
  - Handles foreign key updates for show and platform
  - Allows updating live stream link, platform show ID, viewer count, and metadata

#### Repository Pattern
- **Custom Model Wrapper**: Implements `IBaseModel` interface for ShowPlatform
- **Specialized Queries**:
  - `findByUid(uid, include?)`: Find by unique identifier with optional relations
  - `findByShowAndPlatform(showId, platformId)`: Find by composite key
  - `findByShow(showId, params?)`: Query all platforms for a show
  - `findByPlatform(platformId, params?)`: Query all shows for a platform
  - `findActiveShowPlatforms(params)`: Query all non-deleted relationships
- **Soft Delete Support**: All queries filter out soft-deleted records

#### Type Safety
- **`ShowPlatformWithIncludes<T>`**: Generic type for show-platform results with relations
- All methods support generic include parameters for type-safe relation loading
- Return types are properly typed as `ShowPlatform | ShowPlatformWithIncludes<T>`

#### Schema & Validation
- **Zod Schemas**: Input validation with snake_case to camelCase transformation
- **Required Fields**: `show_id`, `platform_id`, `live_stream_link`, `platform_show_id`
- **Optional Fields**: `viewer_count` (defaults to 0), `metadata`
- **Unique Constraint**: Composite unique constraint on `[showId, platformId]`
- Prisma unique constraint violations mapped to 409 Conflict errors

#### Testing
- Comprehensive test coverage in `show-platform.service.spec.ts`
- Tests cover all CRUD operations
- Tests include validation, error handling, and edge cases
- Tests for relationship queries (by show, by platform)
- 15 test cases covering all major service methods

#### Admin API Endpoints
- **`POST /admin/show-platforms`**: Create new show-platform relationship
- **`GET /admin/show-platforms`**: List with pagination (includes show and platform relations)
- **`GET /admin/show-platforms/:uid`**: Get specific relationship by UID
- **`PATCH /admin/show-platforms/:uid`**: Update relationship
- **`DELETE /admin/show-platforms/:uid`**: Soft delete relationship

This pattern provides the same benefits as other relationship modules:
- Manages many-to-many show-platform relationships with additional metadata
- Tracks live stream links and platform-specific show IDs
- Monitors viewer counts for analytics
- Type-safe operations with proper relation loading
- Consistent with ShowMC and other entity patterns

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
