
# Phase 1: Core Functions with Simplified Auth

## Overview
Phase 1 establishes the core production functions with simplified authentication where admin users have full CRUD access and other users have read-only access. This phase focuses on essential entities and basic show management without complex scheduling or advanced features.

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE.md)** - Complete module architecture, dependencies, and design patterns
- **[Business Domain](../BUSINESS.md)** - Comprehensive business domain information and entity relationships  
- **[Show Orchestration Architecture](../SHOW_ORCHESTRATION_ARCHITECTURE.md)** - Cross-module coordination for complex show operations
- **[Scheduling Architecture](../SCHEDULING_ARCHITECTURE.md)** - Multi-version scheduling and collaborative planning (Phase 2)
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
- **Show Creation**: Direct show creation with CONFIRMED status
- **Show Relationships**: Basic MC assignments and platform integrations
- **Show Types**: Categorization (BAU, campaign, other)
- **Show Status**: Lifecycle management (draft, confirmed, live, completed, cancelled)
- **Show Standards**: Quality tiers (standard, premium) for production levels
- **Show Orchestration**: Cross-module coordination for complex show operations (see [Show Orchestration Architecture](../SHOW_ORCHESTRATION_ARCHITECTURE.md))
- **Note**: Material associations deferred to Phase 3 (requires Material management system)

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
  - [ ] Simple StudioMembership model for admin verification (basic CRUD)
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
  - [ ] ShowOrchestrationModule (Cross-module coordination for complex show operations with MCs and platforms)

- Seed data (Required for Show management)
  - [x] ShowType (bau, campaign, other)
  - [x] ShowStatus (draft, confirmed, live, completed, cancelled)
  - [x] ShowStandard (standard, premium)

- Documentation
  - [x] [Architecture Overview](../ARCHITECTURE.md) - Complete module architecture and design patterns
  - [x] [Business Domain](../BUSINESS.md) - Comprehensive business domain information
  - [x] [Show Orchestration Architecture](../SHOW_ORCHESTRATION_ARCHITECTURE.md) - Cross-module coordination patterns
  - [x] [Scheduling Architecture](../SCHEDULING_ARCHITECTURE.md) - Multi-version scheduling design (Phase 2)
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
- [x] Complete CRUD operations for core entities (Users, Clients, MCs, Platforms, Studios, StudioRooms, ShowType, ShowStatus, ShowStandard)
- [x] Functional direct show creation with full CRUD operations
- [x] Working show-MC relationships
- [x] Working show-platform relationships (ShowPlatform entity)
- [ ] ShowOrchestrationModule implementation for atomic show creation with MC/platform assignments
- [ ] JWT token validation from `erify_auth` service for user identification
- [x] Simple StudioMembership model (database model complete, auth integration pending)
- [ ] Admin guard implementation (JWT + StudioMembership verification)
- [ ] Hybrid authentication with admin write, others read-only
- [x] Admin interface for managing all implemented entities
- [x] Comprehensive testing coverage for core services
- [x] Security best practices implemented (input validation, SQL injection prevention, CORS, headers)
- [x] Performance optimizations in place (indexed queries, pagination, efficient loading)
- [x] Seed data for reference tables

## Dependencies
- [x] PostgreSQL database setup
- [x] Prisma ORM configuration
- [x] NestJS framework setup
- [x] Environment configuration
- [ ] `erify_auth` service running and accessible
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

This approach provides a solid foundation with core functions while maintaining simplicity in the authentication layer and preparing for advanced features in later phases.

## Implementation Details

### Show Service Pattern (✅ Implemented)

The Show service follows a consistent pattern for DTO-to-Prisma payload transformation. For complex show operations involving multiple MCs and platforms, see the [Show Orchestration Architecture](../SHOW_ORCHESTRATION_ARCHITECTURE.md) for cross-module coordination patterns.

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
  id          BigInt       @id @default(autoincrement())
  uid         String       @unique
  extId       String?      @unique @map("ext_id") // For SSO integration
  email       String       @unique
  name        String
  isBanned           Boolean            @default(false) @map("is_banned")
  profileUrl         String?            @map("profile_url")
  metadata           Json               @default("{}")
  mc                 MC? // Optional MC profile linkage
  studioMemberships  StudioMembership[]
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  deletedAt   DateTime?    @map("deleted_at")

  @@index([uid])
  @@index([email])
  @@index([name])
  @@index([extId])
  @@index([isBanned])
  @@map("users")
}
```

**Note**: Relations to `Comment`, `Task`, `Audit` (Phase 3) and `ScheduleVersion` (Phase 2) will be added in their respective phases.

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
  user      User?     @relation(fields: [userId], references: [id])
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@index([uid])
  @@index([userId])
  @@index([name])
  @@index([aliasName])
  @@index([isBanned])
  @@map("mcs")
}
```

### Client & Platform Management

#### Client
```prisma
model Client {
  id            BigInt    @id @default(autoincrement())
  uid           String    @unique
  name          String    @unique
  contactPerson String    @map("contact_person")
  contactEmail  String    @map("contact_email")
  metadata      Json      @default("{}")
  shows         Show[]
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@index([contactPerson])
  @@index([contactEmail])
  @@map("clients")
}
```

**Note**: Relations to `Material` (Phase 3) and `Schedule` (Phase 2) will be added in their respective phases.

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
  @@map("platforms")
}
```

**Note**: Relations to `Material` (Phase 3) will be added in that phase.

### Show Management

#### Show
```prisma
model Show {
  id             BigInt        @id @default(autoincrement())
  uid            String        @unique
  clientId       BigInt        @map("client_id")
  studioRoomId   BigInt        @map("studio_room_id")
  showTypeId     BigInt        @map("show_type_id")
  showStatusId   BigInt        @map("show_status_id")
  showStandardId BigInt        @map("show_standard_id")
  name           String
  startTime      DateTime      @map("start_time")
  endTime        DateTime      @map("end_time")
  metadata       Json          @default("{}")
  client         Client        @relation(fields: [clientId], references: [id])
  studioRoom     StudioRoom    @relation(fields: [studioRoomId], references: [id])
  showType       ShowType      @relation(fields: [showTypeId], references: [id])
  showStatus     ShowStatus    @relation(fields: [showStatusId], references: [id])
  showStandard   ShowStandard  @relation(fields: [showStandardId], references: [id])
  showMCs        ShowMC[]
  showPlatforms  ShowPlatform[]
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  deletedAt      DateTime?     @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@index([clientId])
  @@index([studioRoomId])
  @@index([showTypeId])
  @@index([showStatusId])
  @@index([showStandardId])
  @@index([startTime, endTime])
  @@index([startTime])
  @@index([endTime])
  @@map("shows")
}
```

**Note**: The `scheduleVersionId` field and `scheduleVersion` relation (Phase 2) and `showMaterials` relation (Phase 3) will be added in their respective phases.

#### ShowMC
```prisma
model ShowMC {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  showId    BigInt    @map("show_id")
  mcId      BigInt    @map("mc_id")
  note      String?
  metadata  Json      @default("{}")
  show      Show      @relation(fields: [showId], references: [id])
  mc        MC        @relation(fields: [mcId], references: [id])
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@unique([showId, mcId])
  @@index([uid])
  @@index([showId])
  @@index([mcId])
  @@map("show_mcs")
}
```

#### ShowPlatform
```prisma
model ShowPlatform {
  id             BigInt    @id @default(autoincrement())
  uid            String    @unique
  showId         BigInt    @map("show_id")
  platformId     BigInt    @map("platform_id")
  liveStreamLink String    @map("live_stream_link")
  platformShowId String    @map("platform_show_id") // external id of the platform e.g., tiktok
  viewerCount    Int       @default(0) @map("viewer_count")
  metadata       Json      @default("{}")
  show           Show      @relation(fields: [showId], references: [id])
  platform       Platform  @relation(fields: [platformId], references: [id])
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  @@unique([showId, platformId])
  @@index([uid])
  @@index([showId])
  @@index([platformId])
  @@index([platformShowId])
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
  @@map("show_standards")
}
```

### Studio Management

#### Studio
```prisma
model Studio {
  id                BigInt             @id @default(autoincrement())
  uid               String             @unique
  name              String
  address           String
  metadata          Json               @default("{}")
  studioRooms       StudioRoom[]
  studioMemberships StudioMembership[]
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  deletedAt         DateTime?          @map("deleted_at")

  @@index([uid])
  @@index([name])
  @@map("studios")
}
```

**Note**: Relations to `Schedule` (Phase 2), `Tag` and `TaskTemplate` (Phase 3) will be added in their respective phases.

#### StudioRoom
```prisma
model StudioRoom {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  studioId  BigInt    @map("studio_id")
  name      String
  capacity  Int
  metadata  Json      @default("{}")
  studio    Studio    @relation(fields: [studioId], references: [id])
  shows     Show[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@index([uid])
  @@index([studioId])
  @@index([name])
  @@index([studioId, name])
  @@map("studio_rooms")
}
```

### Authorization (Basic)

#### StudioMembership
```prisma
model StudioMembership {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  userId    BigInt    @map("user_id")
  studioId  BigInt    @map("studio_id")
  role      String // admin, manager, member
  metadata  Json      @default("{}")
  user      User      @relation(fields: [userId], references: [id])
  studio    Studio    @relation(fields: [studioId], references: [id])
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@unique([userId, studioId])
  @@index([uid])
  @@index([userId])
  @@index([studioId])
  @@index([role])
  @@index([userId, role])
  @@map("studio_memberships")
}
```

**Note on Phase 1 StudioMembership**: This model implements studio-specific user relationships for simple admin verification (checking if user has admin role in ANY studio). The direct foreign key relationship to Studio simplifies Prisma implementation. Client and Platform membership models will be added separately in Phase 3 when advanced role-based access control is implemented.
