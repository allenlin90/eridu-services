# Phase 2: Material Management & Advanced Schedule Features

## Overview

Phase 2 builds upon the core functions and Schedule Planning Management System from Phase 1 by adding:

1. **Material Management System** - Comprehensive material management with versioning and platform targeting
2. **Chunked Upload for Large Clients** - Support for clients with >200 shows per month or multi-client monthly overviews (500+ shows from 10+ clients)
3. **Advanced API Features** - Expand parameters, search capabilities, and idempotency handling

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE.md)** - Module architecture, dependencies, and design patterns
- **[Business Domain](../BUSINESS.md)** - Business domain information and entity relationships
- **[Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md)** - Schedule upload system design (Phase 1 client-by-client, Phase 2 chunked upload)
- **[Authentication Guide](../AUTHENTICATION_GUIDE.md)** - JWT validation and authorization patterns

## Core Features

### 1. Material Management System

- **CRUD Operations**: Complete material management with client and platform associations
- **Versioning**: Track material versions with version strings for history management
- **Platform Targeting**: Materials can be targeted to specific platforms or used across all platforms
- **Lifecycle Management**: Active/inactive status, expiration date tracking
- **Client-Scoped**: Materials belong to clients for data isolation and IP protection
- **Material Types**: Categorization (brief, mechanic, script, scene, other)
- **Show-Material Associations**: Associate materials with shows (multi-material support, platform targeting, optional notes)
- **Search & Filtering**: Search by name, type, client, platform, and status

### 2. API Query Features

- **Expand Parameter**: Support `expand` query parameter to optionally include associated data (e.g., `?expand=client,platform,schedule,mc,materials`)
- **Search Parameters**: Support `search` and `search_term` for column-based searching
- **Fulltext Search**: Extensible infrastructure for enhanced search capabilities

### 3. Idempotency Handling

- **Show & Schedule Creation**: Idempotency handling using `Idempotency-Key` header to prevent duplicates from retries/concurrent requests
- **Business Context**: Critical since no unique constraints exist on (name, clientId, startTime) or (name, clientId, startDate, endDate) - names/durations can overlap
- **Key Management**: Track and validate idempotency keys, return existing resource on duplicate key

### 4. Schedule Planning Enhancements (Deferred from Phase 1)

#### 4.1 Bulk Publish Operations ⭐

- **Endpoint**: `POST /admin/schedules/bulk-publish` - Bulk validate and publish multiple schedules
- **Job Tracking**: `GET /admin/jobs/:job_id` - Track async publish job status with real-time progress
- **Benefits**: 93% fewer API calls (51 vs 150+), 90% faster (~45s vs ~7min), no timeout risk
- **Features**: Async processing, partial success handling, progress tracking, detailed error reporting
- **Use Case**: Monthly planning with ~50 clients, ~50 shows each - publish all schedules at once
- **Design**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md#bulk-publish-endpoint-new-)

#### 4.2 Chunked Upload for Large Clients

- **Endpoint**: `POST /admin/schedules/:id/shows/append` - Incremental show uploads
- **Features**: Sequential tracking via `uploadProgress` metadata, error recovery/resume capabilities
- **Use Case**: Clients with >200 shows/month or multi-client monthly overviews (500+ shows from 10+ clients)
- **Design**: See [Schedule Upload API Design](../SCHEDULE_UPLOAD_API_DESIGN.md#phase-2-chunked-upload--deferred)

#### 4.3 CSV Import/Export Service

- **CSV Export/Import**: Export historical data from Google Sheets, import CSV into Schedule as JSON plan document
- **Migration Support**: Facilitate transition from Google Sheets

## Implementation Scope

### CRUD Entities

- [ ] Material, MaterialType, ShowMaterial
- **Note**: Schedule and ScheduleSnapshot entities implemented in Phase 1

### Material Management

- [ ] CRUD operations, versioning, platform targeting, expiration handling
- [ ] Show-material associations, search/filtering, reuse tracking
- [ ] Integration with Show, Client, Platform entities and Schedule Planning System

### Schedule Planning Enhancements

- [ ] **Bulk Publish Operations** ⭐
  - [ ] `POST /admin/schedules/bulk-publish`, `GET /admin/jobs/:job_id`
  - [ ] Job queue, background worker, progress tracking, partial success handling
- [ ] **Chunked Upload**
  - [ ] `POST /admin/schedules/:id/shows/append` controller endpoint
  - [x] Service layer implemented (`appendShows` with `uploadProgress`, sequential validation, error recovery)
- [ ] **CSV Import/Export**: Export/import functionality for Google Sheets migration

### API Features

- [ ] Expand parameter, search/search_term parameters, fulltext search infrastructure
- [ ] Show bulk operations (bulk create/update with partial success handling)
- [ ] Idempotency handling for show/schedule creation (`Idempotency-Key` header support)

### Seed Data & Documentation

- [ ] MaterialType seed data (brief, mechanic, script, scene, other)
- [ ] Material Management System documentation

## Technical Considerations

### Database Design

- Material-client/platform relationships with foreign key constraints
- Efficient indexing for queries by client, platform, type, status
- Unique constraints for show-material associations
- Soft delete support, optimized indexes for search/filtering

### API Design

- RESTful endpoints with Zod validation, NestJS error handling, pagination
- Snake_case input/output with field mapping
- **Expand Parameter**: `?expand=client,platform,schedule,mc,materials` for associated data
- **Search Parameters**: `search` and `search_term` for column-based searching
- **Fulltext Search**: Extensible infrastructure for advanced search
- **Idempotency**: `Idempotency-Key` header support for show/schedule creation (critical since no unique constraints on names/durations)

### Security & Performance

- Admin CRUD, others read-only; input validation, SQL injection prevention (Prisma), CORS, security headers
- Indexed queries, efficient Prisma includes, pagination, batch operations, expand parameter to minimize N+1 queries

## Success Criteria

### Material Management

- [ ] Complete Material Management System with CRUD operations, versioning, platform targeting
- [ ] Show-material associations, expiration handling, reuse tracking
- [ ] Integration with Schedule Planning Management System

### Schedule Planning Enhancements

- [ ] **Bulk publish operations** ⭐ - Bulk validate/publish with async job tracking
- [ ] **Job status tracking** ⭐ - Real-time progress monitoring
- [ ] Chunked upload controller endpoint (service layer implemented)
- [ ] CSV import/export functionality

### API Features

- [ ] Expand parameter, search/search_term parameters, fulltext search infrastructure
- [ ] Show bulk operations (bulk create/update with partial success handling)
- [ ] Idempotency handling for show/schedule creation (prevents duplicates from retries)

### Quality

- [ ] Documentation, testing coverage, performance optimizations

## Dependencies

- Phase 1 complete: Core entities, Schedule Planning Management System, Client/Platform/Show management
- Basic CRUD patterns established, simplified authentication (admin vs read-only), JWT token support

## Timeline & Rollout Strategy

### Implementation Timeline (6 weeks)

**Week 1-2: Bulk Publish & Material Foundation**

- Bulk publish endpoint, job queue, background worker, job status tracking
- Material/MaterialType entities, services, repository, controller

**Week 3-4: Material Features & API**

- Material versioning, platform targeting, expiration handling
- ShowMaterial entity/service, association management, search/filtering
- API expand parameter, search/search_term parameters
- Idempotency handling for show/schedule creation

**Week 5-6: Integration & Testing**

- Material integration with Show entity and Schedule Planning System
- Material selection in schedule planning JSON documents
- Comprehensive testing, documentation, performance optimization

### Implementation Focus Areas

1. **Bulk Publish Operations** ⭐ (Deferred from Phase 1)
2. **Material Management**: CRUD with versioning and lifecycle management
3. **Show-Material Associations**: Robust association management
4. **API Query Features**: Expand parameter, search capabilities
5. **Show Bulk Operations**: Bulk create/update with partial success handling
6. **Idempotency Handling**: Prevent duplicates from retries (critical since no unique constraints on names/durations)

### User Access Strategy

- **Admin Users**: Full CRUD access including material management
- **Other Users**: Read-only access
- **Future**: Advanced authorization control in Phase 3

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
