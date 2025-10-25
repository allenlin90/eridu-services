# Phase 2: Scheduling & Planning Workflow

## Overview
Phase 2 introduces the collaborative planning layer using the "Promotable Draft" model. This phase builds upon the core functions from Phase 1 by adding comprehensive scheduling capabilities, change management, and collaborative planning workflows.

## Core Features

### 1. Scheduling System (Critical Resource)
- **Schedule Management**: Multi-version scheduling with change tracking
- **Schedule Status**: Workflow states (draft, proposed, confirmed, archived, cancelled)
- **Change Management**: Categorized change tracking with approval workflows
- **Version Control**: Complete audit trail for schedule modifications
- **Resource Conflict Detection**: Prevent double-booking of studio resources

### 2. Enhanced Show Management
- **Draft Shows**: Create shows with DRAFT status linked to schedule_id
- **Show Confirmation Service**: Bulk-update Show statuses from DRAFT to CONFIRMED
- **Schedule Integration**: Shows can be part of schedules or standalone
- **Status Transitions**: Proper workflow management for show lifecycle

### 3. Collaborative Planning
- **Client-Studio Collaboration**: Collaborative planning before committing to bookings
- **Approval Workflows**: Client approval for schedule changes
- **Change Tracking**: Complete audit trail for all schedule modifications
- **Resource Allocation**: Studio room and time slot management

### 4. Basic Collaboration Features
- **User Attribution**: Track who created/modified entities
- **Soft Delete**: Data preservation with logical deletion
- **Future Integration**: Material management and comment system (Phase 3)

## Implementation Scope

### CRUD Entities by Admin User
- [ ] Schedule (Critical Resource)
- [ ] ScheduleStatus
- [ ] ScheduleVersion
- [ ] ChangeCategory
- [ ] ChangeType
- [ ] Show (Enhanced with schedule integration)

### Advanced Features
- [ ] Schedule management endpoints for viewing and managing draft shows
- [ ] Validation logic for schedule conflicts and studio room availability
- [ ] Bulk show confirmation from DRAFT to CONFIRMED
- [ ] Change management workflow with client approval
- [ ] Resource conflict detection and prevention

### Integration Points
- [ ] Schedule integration with existing shows
- [ ] Show status transitions (draft → confirmed → live → completed)
- [ ] Client approval workflows for schedule changes
- [ ] Studio resource allocation and conflict detection

### Seed Data
- [ ] ScheduleStatus (draft, proposed, confirmed, archived, cancelled, other)
- [ ] ChangeCategory (CLIENT_REQUESTED, OPERATIONAL, FORCE_MAJEURE)
- [ ] ChangeType (TIME_CHANGE, RESOURCE_CHANGE, SCOPE_CHANGE, etc.)

### Documentation
- [ ] Schedule Management Architecture
- [ ] Change Management Workflow Documentation
- [ ] Resource Conflict Resolution Guide

## Technical Considerations

### Database Design
- Multi-version scheduling with proper foreign key relationships
- Efficient indexing for schedule queries and conflict detection
- Soft delete support for all entities
- Proper foreign key constraints for data integrity

### API Design
- RESTful endpoints following established patterns
- Proper validation with Zod schemas
- Proper error handling with NestJS exceptions
- Pagination support for large datasets
- Snake_case input/output with proper field mapping

### Security
- **Simplified Authentication**: Admin users have full CRUD access, other users read-only
- Input validation and sanitization
- SQL injection prevention via Prisma
- CORS and security headers
- Ready for JWT authentication

### Performance
- Indexed queries for schedule conflicts and resource availability
- Efficient relationship loading with Prisma includes
- Pagination for large result sets
- Soft delete filtering at repository level
- Optimized queries for schedule versioning

## Success Criteria
- Complete scheduling system with multi-version support
- Functional collaborative planning workflow
- Working change management with approval processes
- Resource conflict detection and prevention
- Complete show integration with schedules
- Simplified authentication with admin write, others read-only
- Admin interface for managing all entities
- Proper documentation and testing coverage

## Dependencies
- Phase 1 core entities must be complete and stable
- User management system must be functional
- Studio and show management must be operational
- Basic CRUD patterns must be established
- Simplified authentication system (admin vs read-only)
- Basic JWT token support for user identification

## Timeline & Rollout Strategy

### Phase 2 Implementation
This phase delivers the complete scheduling and planning system. The implementation focuses on:

1. **Scheduling System**: Complete multi-version scheduling with change tracking
2. **Collaborative Planning**: Client-studio collaboration workflows
3. **Resource Management**: Studio room allocation and conflict detection
4. **Basic Collaboration**: Comments and user attribution

### User Access Strategy
- **Admin Users**: Full CRUD access to all resources
- **Other Users**: Read-only access to all resources
- **Future Enhancement**: Advanced authorization control in Phase 3
- **Flexible Rollout**: Features can be enabled/disabled per user type as needed

This approach provides a complete scheduling and planning system while maintaining simplicity in the authentication layer and preparing for advanced authorization control in Phase 3.

## Database Schema

### Schedule
```prisma
model Schedule {
  id               BigInt            @id @default(autoincrement())
  uid              String            @unique
  clientId         BigInt            @map("client_id")
  studioId         BigInt            @map("studio_id")
  scheduleStatusId BigInt            @map("schedule_status_id")
  activeVersionId  BigInt?           @unique @map("active_version_id") // Points to active version
  name             String
  description      String?
  startTime        DateTime          @map("start_time")
  endTime          DateTime?         @map("end_time")
  metadata         Json              @default("{}")
  client           Client            @relation(fields: [clientId], references: [id])
  studio           Studio            @relation(fields: [studioId], references: [id])
  scheduleStatus   ScheduleStatus    @relation(fields: [scheduleStatusId], references: [id])
  activeVersion    ScheduleVersion?  @relation("ActiveVersion", fields: [activeVersionId], references: [id])
  versions         ScheduleVersion[] @relation("ScheduleVersions")
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")
  deletedAt        DateTime?         @map("deleted_at")

  @@index([uid])
  @@index([clientId])
  @@index([studioId])
  @@index([scheduleStatusId])
  @@index([activeVersionId])
  @@map("schedules")
}
```

### ScheduleStatus
```prisma
model ScheduleStatus {
  id        BigInt     @id @default(autoincrement())
  uid       String     @unique
  name      String     @unique // draft, proposed, confirmed, archived, cancelled, other
  metadata  Json       @default("{}")
  schedules Schedule[]
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  deletedAt DateTime?  @map("deleted_at")

  @@index([uid])
  @@map("schedule_status")
}
```

### ChangeCategory
```prisma
model ChangeCategory {
  id               BigInt            @id @default(autoincrement())
  uid              String            @unique
  name             String            @unique // CLIENT_REQUESTED, OPERATIONAL, FORCE_MAJEURE
  metadata         Json              @default("{}")
  scheduleVersions ScheduleVersion[]
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")
  deletedAt        DateTime?         @map("deleted_at")

  @@index([uid])
  @@map("change_categories")
}
```

### ChangeType
```prisma
model ChangeType {
  id               BigInt            @id @default(autoincrement())
  uid              String            @unique
  name             String            @unique // TIME_CHANGE, RESOURCE_CHANGE, SCOPE_CHANGE, etc.
  metadata         Json              @default("{}")
  scheduleVersions ScheduleVersion[]
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")
  deletedAt        DateTime?         @map("deleted_at")

  @@index([uid])
  @@map("change_types")
}
```

### ScheduleVersion
```prisma
model ScheduleVersion {
  id                     BigInt         @id @default(autoincrement())
  uid                    String         @unique
  scheduleId             BigInt         @map("schedule_id")
  versionNumber          Int            @map("version_number")
  effectiveFrom          DateTime       @map("effective_from")
  effectiveTo            DateTime?      @map("effective_to")
  changeCategoryId       BigInt         @map("change_category_id")
  changeTypeId           BigInt         @map("change_type_id")
  changeReason           String         @map("change_reason")
  requiresClientApproval Boolean        @default(false) @map("requires_client_approval")
  creatorId              BigInt         @map("creator_id")
  approverId             BigInt?        @map("approver_id")
  approvedAt             DateTime?      @map("approved_at")
  metadata               Json           @default("{}")
  creator                User           @relation("CreatedSchedules", fields: [creatorId], references: [id])
  approver               User?          @relation(fields: [approverId], references: [id])
  schedule               Schedule?      @relation("ScheduleVersions", fields: [scheduleId], references: [id])
  activeForSchedule      Schedule?      @relation("ActiveVersion")
  changeCategory         ChangeCategory @relation(fields: [changeCategoryId], references: [id])
  changeType             ChangeType     @relation(fields: [changeTypeId], references: [id])
  shows                  Show[]
  createdAt              DateTime       @default(now()) @map("created_at")
  updatedAt              DateTime       @updatedAt @map("updated_at")
  deletedAt              DateTime?      @map("deleted_at")

  @@unique([scheduleId, versionNumber])
  @@index([changeCategoryId])
  @@index([changeTypeId])
  @@index([scheduleId, changeCategoryId])
  @@index([scheduleId, changeTypeId])
  @@index([changeCategoryId, requiresClientApproval])
  @@index([changeTypeId, requiresClientApproval])
  @@index([creatorId, changeTypeId])
  @@index([approverId, changeTypeId])
  @@index([effectiveFrom, effectiveTo, changeCategoryId])
  @@index([scheduleId, approvedAt])
  @@index([requiresClientApproval, approvedAt])
  @@map("schedule_versions")
}
```

### Enhanced Show Model (Phase 2 Enhancement)
The Show model from Phase 1 is enhanced in Phase 2 to include schedule integration:
- Added `scheduleVersionId` field for linking shows to schedule versions
- Shows can be created in DRAFT status as part of a schedule
- Shows can be bulk-confirmed when schedule is approved