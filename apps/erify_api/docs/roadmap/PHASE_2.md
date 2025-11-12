# Phase 2: Material Management & Advanced Schedule Features

## Overview
Phase 2 builds upon the core functions and Schedule Planning Management System from Phase 1 by adding:
1. **Material Management System** - Comprehensive material management with versioning and platform targeting
2. **Chunked Upload for Large Clients** - Support for clients with >200 shows per month or multi-client monthly overviews (500+ shows from 10+ clients)
3. **Advanced API Features** - Expand parameters, search capabilities, and idempotency handling

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE.md)** - Complete module architecture, dependencies, and design patterns (including Show Orchestration)
- **[Business Domain](../BUSINESS.md)** - Comprehensive business domain information and entity relationships
- **[Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md)** - Complete schedule upload system design with JSON-based planning and snapshot versioning (Phase 1 client-by-client, Phase 2 chunked upload)
- **[Authentication Guide](../AUTHENTICATION_GUIDE.md)** - JWT validation and authorization patterns

## Core Features

### 1. Material Management System
- **Material CRUD Operations**: Complete material management with client and platform associations
- **Material Versioning**: Track material versions with version strings for history management
- **Platform-Specific Materials**: Materials can be targeted to specific platforms or used across all platforms
- **Material Expiration**: Automatic handling of expired materials with expiration date tracking
- **Material Reuse**: Materials can be reused across multiple shows
- **Material Lifecycle**: Active/inactive status management for material lifecycle
- **Material Types**: Categorization system for materials (brief, mechanic, script, scene, other)

### 2. Show-Material Associations
- **Material Assignment**: Associate materials with shows for production planning
- **Multi-Material Support**: Each show can utilize multiple materials
- **Platform Targeting**: Materials can be designated for specific platforms within a show
- **Material Notes**: Optional notes for show-material associations
- **Association Management**: Complete CRUD operations for show-material relationships

### 3. Material Organization
- **Client-Scoped Materials**: Materials belong to clients for data isolation and IP protection
- **Material Search & Filtering**: Search materials by name, type, client, platform, and status
- **Material Metadata**: Flexible JSON metadata for additional material information
- **Resource URL Management**: Store and manage resource URLs for materials

### 4. API Query Features
- **Expand Parameter**: Support `expand` query parameter to optionally include associated data (e.g., when fetching a show, expand to include schedule, client, mc, platform, materials, etc.)
- **Search & Search Term**: Support `search` and `search_term` query parameters to enable searching on specific columns of an object (e.g., search materials by name, description, version)
- **Fulltext Search Support**: Extensible design to support fulltext search capabilities for enhanced search functionality

### 5. Idempotency Handling
- **Show Creation Idempotency**: Idempotency handling for show creation requests using `Idempotency-Key` header to prevent duplicate show creation from retries or concurrent requests
- **Schedule Creation Idempotency**: Idempotency handling for schedule creation requests using `Idempotency-Key` header to prevent duplicate schedule creation from retries or concurrent requests
- **Idempotency Key Management**: Track and validate idempotency keys to ensure request uniqueness and prevent accidental duplicates
- **Business Context**: Critical for show and schedule creation since there are no unique constraints on (name, clientId, startTime) or (name, clientId, startDate, endDate) - names and durations can overlap for different packages, events, and campaigns
- **Idempotency Response**: Return existing resource when same idempotency key is used, ensuring idempotent behavior

### 6. Schedule Planning Enhancements (Deferred from Phase 1)

#### 6.1 Bulk Publish Operations ⭐ **DEFERRED FROM PHASE 1**
- **Purpose**: Validate and publish multiple schedules in a single operation with async processing support
- **New Endpoint**: `POST /admin/schedules/bulk-publish` - Bulk validate and publish multiple schedules
- **Async Processing**: Support for background job queue processing to avoid timeout risks
- **Job Status Tracking**: `GET /admin/jobs/:job_id` - Track async publish job status with real-time progress
- **Use Case**: Monthly planning with ~50 clients, ~50 shows each - publish all schedules at once
- **Benefits**: 
  - 93% fewer API calls: 50 create + 1 bulk publish = 51 calls (vs 150+ individual calls)
  - 90% faster: ~45 seconds total (vs ~7 minutes)
  - No timeout risk: Well within AppsScript limits
  - Simple AppsScript: No complex state management needed
- **Features**:
  - Partial success handling (failures isolated per client)
  - Detailed per-schedule results with error reporting
  - Progress tracking (validated, published, failed, pending)
  - Real-time status updates via job status endpoint
- **Design**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md#bulk-publish-endpoint-new-) for complete API design

#### 6.2 Chunked Upload for Large Clients
- **Purpose**: Support clients with >200 shows per month or multi-client monthly overviews (500+ shows from 10+ clients)
- **New Endpoint**: `POST /admin/schedules/:id/shows/append` - Incremental show uploads
- **Sequential Tracking**: `uploadProgress` metadata in plan_document
- **Error Recovery**: Resume capabilities with helpful error messages
- **Use Case**: Very large single-client schedules that exceed payload limits, or multi-client monthly overviews
- **Design**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md#phase-2-chunked-upload--deferred)

#### 6.3 CSV Import/Export Service
- **CSV Export**: Export historical data from Google Sheets
- **CSV Import**: Import CSV file into Schedule as JSON plan document
- **Migration Support**: Facilitate transition from Google Sheets

## Implementation Scope

### CRUD Entities by Admin User
- [ ] Material (Complete material management system)
- [ ] MaterialType
- [ ] ShowMaterial (Show-material associations)

**Note**: Schedule and ScheduleSnapshot entities are implemented in Phase 1 as part of Schedule Planning Management System.

### Advanced Features

#### Material Management
- [ ] Material CRUD operations with full lifecycle management
- [ ] Material versioning and version history tracking
- [ ] Platform-specific material assignment
- [ ] Material expiration handling and notifications
- [ ] Show-material association management
- [ ] Material search and filtering capabilities
- [ ] Material reuse tracking across shows
- [ ] Material metadata management
- [ ] Resource URL validation and management
- [ ] Material expiration date notifications

#### Schedule Planning Enhancements (Deferred from Phase 1)
- [ ] **Bulk Publish Operations** ⭐ **DEFERRED FROM PHASE 1**
  - [ ] `POST /admin/schedules/bulk-publish` endpoint - Bulk validate and publish multiple schedules
  - [ ] `GET /admin/jobs/:job_id` endpoint - Track async publish job status
  - [ ] Job queue implementation for async processing
  - [ ] Background worker implementation for schedule publishing
  - [ ] Progress tracking (validated, published, failed, pending)
  - [ ] Real-time status updates
  - [ ] Partial success handling (failures isolated per client)
  - [ ] Detailed per-schedule results with error reporting
  - [ ] Integration tests for bulk publish operations
  - [ ] Job status tracking tests
- [ ] **Chunked Upload for Large Clients** (>200 shows per client) or multi-client monthly overviews (500+ shows from 10+ clients)
  - [ ] `POST /admin/schedules/:id/shows/append` endpoint (controller endpoint not implemented)
  - [x] `appendShows` service method with `uploadProgress` metadata tracking ✅ **SERVICE LAYER IMPLEMENTED**
  - [x] Sequential chunk validation ✅ **SERVICE LAYER IMPLEMENTED**
  - [x] Error recovery and resume capabilities (SEQUENTIAL_VIOLATION, UPLOAD_COMPLETE, INVALID_CHUNK_INDEX, VERSION_MISMATCH) ✅ **SERVICE LAYER IMPLEMENTED**
  - [ ] Testing with large client datasets (pending controller endpoint)
- [ ] **CSV Import/Export Service**
  - [ ] CSV export functionality (export historical data from Google Sheets)
  - [ ] CSV import functionality (import CSV file into Schedule as JSON plan document)
  - [ ] Migration tooling and documentation

#### API Features
- [ ] API expand parameter support for including associated data (schedule, client, mc, platform, materials, etc.)
- [ ] API search and search_term parameters for column-based searching
- [ ] Fulltext search infrastructure and extensibility
- [ ] Show bulk operations (bulk create and bulk update with partial success handling) - Deferred from Phase 1
- [ ] Idempotency handling for show creation requests (Idempotency-Key header support)
- [ ] Idempotency handling for schedule creation requests (Idempotency-Key header support)
- [ ] Idempotency key storage and validation mechanism
- [ ] Idempotency response handling (return existing resource on duplicate key)

### Integration Points
- [ ] Material integration with Show entity
- [ ] Material integration with Client entity
- [ ] Material integration with Platform entity
- [ ] ShowMaterial integration with Show and Material entities
- [ ] Material association in Show Planning Management System
- [ ] Material assignment in show creation workflows
- [ ] Material selection in schedule planning (JSON document)
- [ ] Material filtering by client, platform, and type

### Seed Data
- [ ] MaterialType (brief, mechanic, script, scene, other)

### Documentation
- [ ] Material Management System Architecture
- [ ] Material Versioning Best Practices
- [ ] Show-Material Association Guide
- [ ] Platform-Specific Material Targeting Documentation
- [ ] Material Lifecycle Management Guide

## Technical Considerations

### Database Design
- Material-client and material-platform relationships with proper foreign key constraints
- Efficient indexing for material queries by client, platform, type, and status
- Soft delete support for all entities
- Unique constraints for show-material associations
- Optimized indexes for material search and filtering

### API Design
- RESTful endpoints following established patterns
- Proper validation with Zod schemas
- Proper error handling with NestJS exceptions
- Pagination support for large datasets
- Snake_case input/output with proper field mapping
- **Expand Parameter**: Query parameter (`expand`) to optionally include associated data (e.g., `?expand=client,platform,schedule,mc,materials` for shows)
- **Search Parameters**: Query parameters (`search` and `search_term`) to enable searching on specific columns of objects
- **Fulltext Search**: Extensible search infrastructure supporting both simple column search and advanced fulltext search capabilities
- **Idempotency Handling**: Support for `Idempotency-Key` header in show and schedule creation endpoints to prevent duplicate resource creation from retries or concurrent requests
- **Idempotency Storage**: Idempotency keys stored with request metadata and response references to enable returning existing resources on duplicate requests
- **Idempotency Validation**: Validate idempotency keys to ensure request uniqueness and prevent accidental duplicates (critical since no unique constraints exist on show/schedule names and durations)

### Security
- **Simplified Authentication**: Admin users have full CRUD access, other users read-only
- Input validation and sanitization
- SQL injection prevention via Prisma
- CORS and security headers
- Ready for JWT authentication

### Performance
- Indexed queries for material search and filtering
- Efficient relationship loading with Prisma includes (client, platform, materialType)
- Pagination for large result sets (materials, show-materials)
- Soft delete filtering at repository level
- Optimized queries for material reuse tracking
- Efficient material expiration date queries
- Batch operations for show-material associations
- Efficient eager loading with expand parameter to minimize N+1 query issues
- Optimized search queries with proper indexing for search_term functionality
- Fulltext search indexes for enhanced search performance

## Success Criteria
- Complete Material Management System with CRUD operations
- Functional Material versioning and version tracking
- Working show-material association management
- Platform-specific material targeting
- Material expiration handling
- Material reuse across multiple shows
- Integration with Schedule Planning Management System from Phase 1
- **Bulk publish operations** ⭐ - Bulk validate and publish multiple schedules in single operation with async job tracking
- **Job status tracking** ⭐ - Real-time progress monitoring for bulk publish operations
- Show bulk operations (bulk create and bulk update) working with partial success handling
- API expand parameter working for all entities with associated data
- API search and search_term parameters functional for column-based searching
- Extensible fulltext search infrastructure in place
- Idempotency handling working for show creation requests (prevents duplicate shows from retries)
- Idempotency handling working for schedule creation requests (prevents duplicate schedules from retries)
- Idempotency keys properly validated and stored with request/response mapping
- Proper documentation and testing coverage
- Performance optimizations for material queries and associations

## Dependencies
- Phase 1 core entities must be complete and stable
- Schedule Planning Management System (Phase 1) must be operational
- Client management must be functional
- Platform management must be operational
- Show management must be operational
- Basic CRUD patterns must be established
- Simplified authentication system (admin vs read-only)
- Basic JWT token support for user identification

## Timeline & Rollout Strategy

### Phase 2 Implementation Timeline (6 weeks)

#### Week 1-2: Bulk Publish Operations & Material Foundation
- [ ] Implement bulk publish endpoint (`POST /admin/schedules/bulk-publish`)
- [ ] Implement job queue system for async processing
- [ ] Implement background worker for schedule publishing
- [ ] Implement job status tracking endpoint (`GET /admin/jobs/:job_id`)
- [ ] Add progress tracking and real-time status updates
- [ ] Create Material and MaterialType entities
- [ ] Implement MaterialService with CRUD operations
- [ ] Implement MaterialTypeService
- [ ] Build material repository with proper indexing
- [ ] Add material validation logic
- [ ] Create MaterialController with REST API endpoints

#### Week 3-4: Material Features & Associations
- [ ] Implement material versioning logic
- [ ] Add platform-specific material targeting
- [ ] Implement material expiration handling
- [ ] Create ShowMaterial entity and service
- [ ] Build show-material association management
- [ ] Add material search and filtering capabilities
- [ ] Implement API expand parameter for associated data loading
- [ ] Implement API search and search_term parameters for column-based searching
- [ ] Implement idempotency handling for show creation (Idempotency-Key header support)
- [ ] Implement idempotency handling for schedule creation (Idempotency-Key header support)

#### Week 5-6: Integration & Testing
- [ ] Integrate materials with Show entity
- [ ] Integrate materials with Schedule Planning Management System
- [ ] Add material selection to schedule planning JSON documents
- [ ] Implement material reuse tracking
- [ ] Comprehensive testing for bulk publish operations and job tracking
- [ ] Comprehensive testing and documentation
- [ ] Performance optimization and monitoring

### Implementation Focus Areas

1. **Bulk Publish Operations** ⭐ (Deferred from Phase 1): Bulk validate and publish multiple schedules with async job tracking
2. **Material Management**: Complete material CRUD with versioning and lifecycle management
3. **Show-Material Associations**: Robust association management between shows and materials
4. **Platform Targeting**: Platform-specific material assignment and filtering
5. **Material Organization**: Client-scoped materials with search and filtering
6. **Integration**: Seamless integration with Phase 1 systems (Schedule Planning, Shows)
7. **API Query Features**: Expand parameter for associated data and search capabilities for flexible querying
8. **Show Bulk Operations**: Bulk create and bulk update operations for shows with partial success handling (deferred from Phase 1 where schedule bulk operations are implemented)
9. **Idempotency Handling**: Idempotency support for show and schedule creation to prevent duplicates from retries (critical since no unique constraints exist on names/durations for overlapping packages, events, and campaigns)

### User Access Strategy
- **Admin Users**: Full CRUD access to all resources including material management
- **Other Users**: Read-only access to all resources
- **Future Enhancement**: Advanced authorization control in Phase 3
- **Flexible Rollout**: Features can be enabled/disabled per user type as needed

This approach provides comprehensive material management with versioning and platform targeting while maintaining simplicity in the authentication layer and building upon the Schedule Planning Management System from Phase 1.

## Database Schema

> **Note**: Schedule and ScheduleSnapshot entities are implemented in Phase 1. See Phase 1 documentation for complete schema.

### Material Management Entities

#### Material
```prisma
model Material {
  id             BigInt         @id @default(autoincrement())
  uid            String         @unique
  clientId       BigInt?        @map("client_id")
  platformId     BigInt?        @map("platform_id")
  materialTypeId BigInt         @map("material_type_id")
  name           String
  description    String?
  resourceUrl    String?        @unique @map("resource_url")
  isActive       Boolean        @default(true) @map("is_active")
  expiringAt     DateTime?      @map("expiring_at")
  version        String
  metadata       Json           @default("{}")
  client         Client?        @relation(fields: [clientId], references: [id], onDelete: SetNull)
  platform       Platform?      @relation(fields: [platformId], references: [id], onDelete: SetNull)
  materialType   MaterialType   @relation(fields: [materialTypeId], references: [id])
  showMaterials  ShowMaterial[]
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")
  deletedAt      DateTime?      @map("deleted_at")

  @@index([uid])
  @@index([clientId])
  @@index([platformId])
  @@index([materialTypeId])
  @@index([name])
  @@index([isActive])
  @@index([clientId, isActive])
  @@index([expiringAt])
  @@index([deletedAt])
  @@index([clientId, deletedAt])
  @@index([platformId, deletedAt])
  @@index([materialTypeId, deletedAt])
  @@map("materials")
}
```

#### MaterialType
```prisma
model MaterialType {
  id        BigInt     @id @default(autoincrement())
  uid       String     @unique
  name      String     @unique // brief, mechanic, script, scene, other
  metadata  Json       @default("{}")
  materials Material[]
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  deletedAt DateTime?  @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@index([deletedAt])
  @@map("material_types")
}
```

#### ShowMaterial
```prisma
model ShowMaterial {
  id         BigInt    @id @default(autoincrement())
  uid        String    @unique
  showId     BigInt    @map("show_id")
  materialId BigInt    @map("material_id")
  note       String?
  metadata   Json      @default("{}")
  show       Show      @relation(fields: [showId], references: [id], onDelete: Cascade)
  material   Material  @relation(fields: [materialId], references: [id], onDelete: Cascade)
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")

  @@unique([showId, materialId])
  @@index([uid])
  @@index([showId])
  @@index([materialId])
  @@index([deletedAt])
  @@index([showId, deletedAt])
  @@index([materialId, deletedAt])
  @@map("show_materials")
}
```

**Note on Material Management**: Materials are client-scoped for data isolation and IP protection. Materials can be targeted to specific platforms or used across all platforms. Materials can be reused across multiple shows through ShowMaterial associations. See Phase 1 Show model for the `showMaterials` relation.