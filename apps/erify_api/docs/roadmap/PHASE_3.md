# Phase 3: Advanced Authorization Control & Tracking Features

**Status**: ⏳ Planning phase (not yet started)

## Overview

Phase 3 introduces advanced authorization control, comprehensive tracking features, and sophisticated collaboration tools. This phase builds upon the Material Management System from Phase 2 by adding role-based access control, audit trails, task management, and advanced collaboration features.

**Timeline**: Dependent on Phase 1 and Phase 2 completion

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE.md)** - Module architecture, dependencies, and design patterns
- **[Business Domain](../BUSINESS.md)** - Business domain information and entity relationships
- **[Authentication Guide](../AUTHENTICATION_GUIDE.md)** - JWT validation and authorization patterns

## Core Features

### 1. Advanced Authorization Control

- **Role-Based Access Control**: Granular permissions based on user roles and context
- **Polymorphic Membership System**: Memberships for Studios, Clients, and Platforms
- **Context-Specific Permissions**: Different roles in different contexts (studio admin ≠ client admin)

### 2. Comprehensive Tracking & Audit

- **Audit Trail System**: Complete change tracking for all entities with user attribution
- **Change History**: Store old and new values for all modifications
- **Compliance Reporting**: Audit reports for regulatory compliance

### 3. Task Management System

- **Task Templates**: Reusable task templates per studio with automated generation
- **Task Assignment**: Assign tasks to users with due dates and status tracking
- **Lifecycle Management**: Complete workflow (pending, assigned, in_progress, review, completed, blocked)

### 4. Advanced Collaboration Features

- **Polymorphic Tagging**: Tag any entity type with studio-scoped tags
- **Enhanced Comments**: Rich commenting with threading, mentions, and notifications
- **Real-time Notifications**: Notify users of important events and changes

## Implementation Scope

### CRUD Entities

- [ ] Membership (Enhanced polymorphic user-group relationships), Tag, Taggable, Audit
- [ ] TaskTemplate, TaskTemplateItem, TaskType, TaskInputType, TaskStatus, Task
- [ ] Comment (polymorphic commenting system)
- **Note**: Material, MaterialType, and ShowMaterial entities implemented in Phase 2

### Advanced Features

- [ ] Role-based access control with granular permissions, enhanced polymorphic membership system
- [ ] Comprehensive audit trail for all CRUD operations
- [ ] Task template management, automated generation, assignment, and status tracking workflows
- [ ] Polymorphic tagging system across all entities
- [ ] Comment system with threading, mentions, and notifications
- [ ] Real-time notifications for important events

### Integration Points

- [ ] Enhanced Membership integration (polymorphic design building on Phase 1)
- [ ] Audit integration with all CRUD operations
- [ ] Task assignment to users with proper permissions, association with shows/schedules
- [ ] Tag and Comment system integration with all entities

### Seed Data & Documentation

- [ ] TaskType, TaskInputType, TaskStatus seed data
- [ ] Advanced Authorization Architecture, Task Management System Design, Audit Trail Implementation Guide, Tagging System Documentation

## Technical Considerations

### Database Design

- Polymorphic relationships for Memberships, Taggables, Tasks, Comments, Audit
- Efficient indexing for audit queries, task assignments, permission checking
- Soft delete support, foreign key constraints, optimized queries

### API Design

- RESTful endpoints with Zod validation, NestJS error handling, pagination
- Snake_case input/output with field mapping
- Permission-based endpoint access control

### Security & Performance

- Role-based access control with granular permissions, permission validation at service/controller levels
- Secure audit trail with user attribution, input validation, SQL injection prevention (Prisma), CORS, security headers
- Indexed queries, efficient Prisma includes, pagination, soft delete filtering, optimized queries for task management and tagging

## Success Criteria

### Authorization & Audit

- [ ] Complete role-based access control system with granular permissions
- [ ] Comprehensive audit trail for all operations with user attribution

### Task Management

- [ ] Full task management workflow from template to completion
- [ ] Automated task generation, assignment, and status tracking

### Collaboration Features

- [ ] Polymorphic tagging system across all entities
- [ ] Enhanced comments with threading, mentions, and notifications
- [ ] Real-time notifications for important events

### Quality

- [ ] Admin interface for managing all entities
- [ ] Documentation, testing coverage, security best practices, performance optimizations

## Dependencies

- Phase 1 & 2 complete: Core entities, Schedule Planning Management System, Material Management System
- User management system functional, basic CRUD patterns established
- Advanced authentication system with role support, JWT token support with role information

## Timeline & Rollout Strategy

### Implementation Focus Areas

1. **Authorization Control**: Role-based access control with granular permissions
2. **Audit & Tracking**: Comprehensive audit trail and change tracking
3. **Task Management**: Complete task management workflow from template to completion
4. **Advanced Collaboration**: Polymorphic tagging, enhanced comments, and notifications

### User Access Strategy

- **Role-Based Access**: Granular permissions based on user roles and context
- **Context-Specific Permissions**: Different roles in different contexts (studio admin ≠ client admin)
- **Permission Inheritance**: Proper permission hierarchy and inheritance
- **Flexible Rollout**: Features can be enabled/disabled per user type as needed

```

---

## Polymorphic Tagging System - Implementation Plan

### Overview

The polymorphic tagging system enables studio-scoped tags that can be attached to any entity (Shows, Users, Clients, etc.) without requiring separate join tables per entity type.

**Key Features:**
- Studio-scoped tag management (create, update, delete tags)
- Polymorphic tagging (attach tags to any entity type)
- Type-safe validation using application-level enums
- Soft delete support for both tags and taggables
- Query tags by entity or list all entities with a specific tag

### Architectural Decisions

#### Polymorphism Strategy: Loose Polymorphism

**Chosen Approach:** Loose polymorphism (`taggableId` + `taggableType` string fields)

**Advantages:**
- ✅ True polymorphism: any entity can be tagged without schema changes
- ✅ Flexible for future entity types
- ✅ Simple query patterns for "all tags on entity X"

**Disadvantages:**
- ❌ **No database-level foreign key integrity**
- ❌ Orphaned `Taggable` records if tagged entity is deleted
- ❌ Cannot use CASCADE delete at database level

**Mitigation Strategy:**
- Define `TaggableType` enum in application code
- Validate all `taggableType` values against enum
- Implement application-level cleanup hooks
- Add periodic cleanup job for orphaned records

### Module Structure

Following existing patterns in `apps/erify_api/src/models/`:
- `tag/` - Main tag module directory
  - `tag.module.ts` - NestJS module registration
  - `tag.service.ts` - Business logic for tags and taggables
  - `tag.controller.ts` - Admin endpoints
  - `dto/` - Zod validation schemas
  - `schemas/` - Response serialization schemas
  - `constants/taggable-types.ts` - TaggableType enum

### Implementation Components

#### TaggableType Enum

```typescript
export const TaggableType = {
  SHOW: 'show',
  USER: 'user',
  CLIENT: 'client',
  MC: 'mc',
  PLATFORM: 'platform',
  STUDIO: 'studio',
  SCHEDULE: 'schedule',
} as const;

export type TaggableType = typeof TaggableType[keyof typeof TaggableType];
```

#### Tag Service Methods

**Core Methods:**
- `createTag(dto)` - Create studio-scoped tag
- `updateTag(id, dto)` - Update tag name/metadata
- `deleteTag(id)` - Soft delete tag (cascades to taggables via Prisma)
- `findAll(filters)` - List tags with pagination, filter by studio
- `findOne(id)` - Get single tag with taggables included
- `attachTag(tagId, entityId, entityType)` - Create taggable link
- `detachTag(tagId, entityId, entityType)` - Soft delete taggable link
- `getTagsForEntity(entityId, entityType)` - Get all tags on an entity
- `getEntitiesWithTag(tagId)` - Get all entities tagged with a tag

#### Admin Endpoints

- `POST /admin/tags` - Create tag
- `GET /admin/tags` - List tags (filter by studio_id)
- `GET /admin/tags/:id` - Get tag details
- `PATCH /admin/tags/:id` - Update tag
- `DELETE /admin/tags/:id` - Delete tag
- `POST /admin/tags/:id/attach` - Attach tag to entity
- `POST /admin/tags/:id/detach` - Detach tag from entity
- `GET /admin/tags/:id/entities` - List entities with this tag

### Implementation Steps

1. **Database Schema Migration**
   - Add `Tag` and `Taggable` models to `schema.prisma`
   - Update `Studio` model with `tags` relation
   - Run `npx prisma migrate dev --name add-polymorphic-tagging`

2. **Create Module Structure**
   - Create `src/models/tag/` directory
   - Create subdirectories: `dto/`, `schemas/`, `constants/`
   - Create `TaggableType` enum

3. **Implement Service Layer**
   - Create `tag.service.ts` with core CRUD methods
   - Implement soft delete filtering (follow `database-patterns` skill)
   - Add transaction support for attach/detach operations

4. **Implement Controller Layer**
   - Create `tag.controller.ts` with admin endpoints
   - Add Zod validation schemas in `dto/`
   - Add response schemas in `schemas/`
   - Apply `@AdminProtected()` decorator

5. **Register Module**
   - Create `tag.module.ts`
   - Import `TagModule` in `app.module.ts`

6. **Testing**
   - Write unit tests for `TagService`
   - Write e2e tests for `TagController`
   - Test with Prisma Studio
   - Manual API testing

### Future Enhancements

- **Cleanup Hooks:** Automatically delete orphaned `Taggable` records when entities are deleted
- **Periodic Cleanup Job:** Scheduled task to find and remove orphaned records
- **Tag Analytics:** Count entities per tag, most-used tags
- **Tag Suggestions:** Auto-suggest tags based on entity attributes
- **Bulk Tagging:** Attach/detach tags to multiple entities at once

---



### Task Management System

#### TaskTemplate

```prisma
model TaskTemplate {
  id                BigInt             @id @default(autoincrement())
  uid               String             @unique
  studioId          BigInt             @map("studio_id")
  name              String
  description       String?
  isActive          Boolean            @default(true) @map("is_active")
  metadata          Json               @default("{}")
  studio            Studio             @relation(fields: [studioId], references: [id], onDelete: Cascade)
  taskTemplateItems TaskTemplateItem[]
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  deletedAt         DateTime?          @map("deleted_at")

  @@unique([studioId, name])
  @@index([uid])
  @@index([studioId])
  @@index([isActive])
  @@index([studioId, isActive])
  @@index([deletedAt])
  @@index([studioId, deletedAt])
  @@map("task_templates")
}
```

#### TaskTemplateItem

```prisma
model TaskTemplateItem {
  id             BigInt        @id @default(autoincrement())
  uid            String        @unique
  taskTemplateId BigInt        @map("task_template_id")
  taskTypeId     BigInt        @map("task_type_id")
  inputTypeId    BigInt        @map("input_type_id")
  name           String
  description    String?
  isRequired     Boolean       @default(false) @map("is_required")
  metadata       Json          @default("{}")
  taskTemplate   TaskTemplate  @relation(fields: [taskTemplateId], references: [id], onDelete: Cascade)
  taskType       TaskType      @relation(fields: [taskTypeId], references: [id])
  taskInputType  TaskInputType @relation(fields: [inputTypeId], references: [id])
  tasks          Task[]
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  deletedAt      DateTime?     @map("deleted_at")

  @@index([uid])
  @@index([taskTemplateId])
  @@index([taskTypeId])
  @@index([inputTypeId])
  @@index([deletedAt])
  @@index([taskTemplateId, deletedAt])
  @@map("task_template_items")
}
```

#### TaskType

```prisma
model TaskType {
  id                BigInt             @id @default(autoincrement())
  uid               String             @unique
  name              String             @unique // pre_production, production, post_production, show_mc_review, show_platform_review, other
  metadata          Json               @default("{}")
  taskTemplateItems TaskTemplateItem[]
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  deletedAt         DateTime?          @map("deleted_at")

  @@index([uid])
  @@index([deletedAt])
  @@map("task_types")
}
```

#### TaskInputType

```prisma
model TaskInputType {
  id                BigInt             @id @default(autoincrement())
  uid               String             @unique
  name              String             @unique // text, number, date, percentage, file, url
  metadata          Json               @default("{}")
  taskTemplateItems TaskTemplateItem[]
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  deletedAt         DateTime?          @map("deleted_at")

  @@index([uid])
  @@index([deletedAt])
  @@map("task_input_types")
}
```

#### Task

```prisma
model Task {
  id                 BigInt           @id @default(autoincrement())
  uid                String           @unique
  taskableId         BigInt           @map("taskable_id")
  taskableType       String           @map("taskable_type")
  taskTemplateItemId BigInt           @map("task_template_item_id")
  taskStatusId       BigInt           @map("task_status_id")
  assigneeId         BigInt           @map("assignee_id")
  dueDate            DateTime         @map("due_date")
  completedAt        DateTime?        @map("completed_at")
  metadata           Json             @default("{}")
  taskTemplateItem   TaskTemplateItem @relation(fields: [taskTemplateItemId], references: [id], onDelete: Cascade)
  taskStatus         TaskStatus       @relation(fields: [taskStatusId], references: [id])
  assignee           User             @relation(fields: [assigneeId], references: [id], onDelete: SetNull)
  createdAt          DateTime         @default(now()) @map("created_at")
  updatedAt          DateTime         @updatedAt @map("updated_at")
  deletedAt          DateTime?        @map("deleted_at")

  @@unique([taskableId, assigneeId])
  @@index([uid])
  @@index([taskableId, taskableType])
  @@index([taskTemplateItemId])
  @@index([taskStatusId])
  @@index([assigneeId])
  @@index([dueDate])
  @@index([assigneeId, dueDate])
  @@index([taskStatusId, dueDate])
  @@index([deletedAt])
  @@index([taskStatusId, deletedAt])
  @@index([assigneeId, deletedAt])
  @@map("tasks")
}
```

#### TaskStatus

```prisma
model TaskStatus {
  id        BigInt    @id @default(autoincrement())
  uid       String    @unique
  name      String    @unique // pending, assigned, in_progress, review, completed, blocked
  metadata  Json      @default("{}")
  tasks     Task[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@index([uid])
  @@index([deletedAt])
  @@map("task_status")
}
```

### Collaboration Features

#### Comment

```prisma
model Comment {
  id              BigInt    @id @default(autoincrement())
  uid             String    @unique
  commentableId   BigInt    @map("commentable_id")
  commentableType String    @map("commentable_type") // e.g., Show, Schedule, Material, User, Tag, Task
  ownerId         BigInt    @map("owner_id")
  parentId        BigInt?   @map("parent_id")
  content         String
  parent          Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  replies         Comment[] @relation("CommentReplies")
  owner           User      @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  @@index([uid])
  @@index([commentableId, commentableType])
  @@index([ownerId])
  @@index([parentId])
  @@index([commentableId, commentableType, createdAt])
  @@index([ownerId, createdAt])
  @@index([deletedAt])
  @@index([ownerId, deletedAt])
  @@map("comments")
}
```

### Audit System

#### Audit

```prisma
model Audit {
  id            BigInt   @id @default(autoincrement())
  uid           String   @unique
  userId        BigInt   @map("user_id")
  action        String // create, update, delete
  auditableId   BigInt   @map("auditable_id")
  auditableType String   @map("auditable_type") // e.g., Show, Schedule, Material, User, Tag, Task
  // changes
  oldValues     Json     @map("old_values")
  newValues     Json     @map("new_values")
  metadata      Json     @default("{}")
  user          User     @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([uid])
  @@index([userId])
  @@index([auditableId, auditableType])
  @@index([createdAt])
  @@index([userId, createdAt])
  @@index([auditableType, createdAt])
  @@index([action, createdAt])
  @@map("audits")
}
```

### Enhanced Membership (Phase 3 Enhancement)

The Membership model from Phase 1 is enhanced in Phase 3 to support polymorphic relationships:

- Basic structure from Phase 1 already supports polymorphic `groupType` and `groupId`
- Phase 3 adds advanced role-based permissions and context-specific access control
- Enables granular permissions per entity type and studio/client context
