# Phase 3: Advanced Authorization Control & Tracking Features

## Overview
Phase 3 introduces advanced authorization control, comprehensive tracking features, and sophisticated collaboration tools. This phase builds upon the Material Management System from Phase 2 by adding role-based access control, audit trails, task management, and advanced collaboration features.

## Core Features

### 1. Advanced Authorization Control
- **Role-Based Access Control**: Granular permissions based on user roles and context
- **Membership System**: Polymorphic memberships for Studios, Clients, and Platforms
- **Permission Management**: Fine-grained control over resource access
- **Context-Specific Permissions**: Different roles in different contexts (studio admin ≠ client admin)

### 2. Comprehensive Tracking & Audit
- **Audit Trail System**: Complete change tracking for all entities
- **User Attribution**: Track who created/modified entities with timestamps
- **Change History**: Store old and new values for all modifications
- **Compliance Reporting**: Audit reports for regulatory compliance

### 3. Task Management System
- **Task Templates**: Reusable task templates per studio
- **Task Assignment**: Assign tasks to specific users with due dates
- **Task Status Tracking**: Complete lifecycle management (pending, assigned, in_progress, review, completed, blocked)
- **Automated Task Generation**: Generate tasks from templates when shows are confirmed

### 4. Advanced Collaboration Features
- **Tagging System**: Flexible categorization across all entities
- **Polymorphic Tagging**: Tag any entity type with studio-scoped tags
- **Enhanced Comments**: Rich commenting with mentions and notifications
- **Real-time Notifications**: Notify users of important events and changes

## Implementation Scope

### CRUD Entities by Admin User
- [ ] Membership (Enhanced polymorphic user-group relationships)
- [ ] Tag
- [ ] Taggable (Polymorphic tagging system)
- [ ] Audit (System-generated audit trail)
- [ ] TaskTemplate
- [ ] TaskTemplateItem
- [ ] TaskType
- [ ] TaskInputType
- [ ] TaskStatus
- [ ] Task

**Note**: Material, MaterialType, and ShowMaterial entities are implemented in Phase 2 as part of Material Management System.

### Advanced Features
- [ ] Role-based access control with granular permissions
- [ ] Enhanced polymorphic membership system (building on Phase 1 foundation)
- [ ] Comprehensive audit trail for all operations
- [ ] Task template management and automated generation
- [ ] Task assignment and status tracking workflows
- [ ] Polymorphic tagging system across all entities
- [ ] Comment system with threading, mentions, and notifications
- [ ] Real-time notifications for important events

### Integration Points
- [ ] Enhanced Membership integration (polymorphic design building on Phase 1)
- [ ] Audit integration with all CRUD operations
- [ ] Task assignment to users with proper permissions
- [ ] Task association with shows/schedules
- [ ] Tag integration with all entity types
- [ ] Comment system integration with all entities

### Seed Data
- [ ] TaskType (pre_production, production, post_production, show_mc_review, show_platform_review, other)
- [ ] TaskInputType (text, number, date, percentage, file, url)
- [ ] TaskStatus (pending, assigned, in_progress, review, completed, blocked)

### Documentation
- [ ] Advanced Authorization Architecture
- [ ] Task Management System Design
- [ ] Audit Trail Implementation Guide
- [ ] Tagging System Documentation

## Technical Considerations

### Database Design
- Polymorphic relationships for Memberships and Taggables
- Efficient indexing for audit queries and task assignments
- Soft delete support for all entities
- Proper foreign key constraints for data integrity
- Optimized queries for permission checking

### API Design
- RESTful endpoints following established patterns
- Proper validation with Zod schemas
- Proper error handling with NestJS exceptions
- Pagination support for large datasets
- Snake_case input/output with proper field mapping
- Permission-based endpoint access control

### Security
- **Advanced Authorization**: Role-based access control with granular permissions
- **Permission Validation**: Check permissions at service and controller levels
- **Audit Security**: Secure audit trail with user attribution
- **Input validation and sanitization**
- **SQL injection prevention via Prisma**
- **CORS and security headers**

### Performance
- Indexed queries for permission checking and audit trails
- Efficient relationship loading with Prisma includes
- Pagination for large result sets
- Soft delete filtering at repository level
- Optimized queries for task management and tagging

## Success Criteria
- Complete role-based access control system
- Comprehensive audit trail for all operations
- Full task management workflow from template to completion
- Polymorphic tagging system across all entities
- Enhanced collaboration features with notifications
- Admin interface for managing all entities
- Proper documentation and testing coverage
- Security best practices implemented
- Performance optimizations in place

## Dependencies
- Phase 1 core entities must be complete and stable
- Phase 2 Material Management System must be operational
- User management system must be functional
- Basic CRUD patterns must be established
- Advanced authentication system with role support
- JWT token support with role information

## Timeline & Rollout Strategy

### Phase 3 Implementation
This phase delivers advanced authorization control and comprehensive tracking features. The implementation focuses on:

1. **Authorization Control**: Role-based access control with granular permissions
2. **Audit & Tracking**: Comprehensive audit trail and change tracking
3. **Task Management**: Complete task management workflow
4. **Advanced Collaboration**: Tagging, enhanced comments, and notifications

### User Access Strategy
- **Role-Based Access**: Granular permissions based on user roles and context
- **Context-Specific Permissions**: Different roles in different contexts
- **Flexible Rollout**: Features can be enabled/disabled per user type as needed
- **Permission Inheritance**: Proper permission hierarchy and inheritance

This approach provides a complete advanced authorization and tracking system while maintaining security and performance standards.

## Database Schema

> **Note**: Material, MaterialType, and ShowMaterial entities are implemented in Phase 2. See Phase 2 documentation for complete schema.

### Tagging System

#### Tag
```prisma
model Tag {
  id        BigInt     @id @default(autoincrement())
  uid       String     @unique
  studioId  BigInt?    @map("studio_id")
  name      String
  metadata  Json       @default("{}")
  studio    Studio?    @relation(fields: [studioId], references: [id], onDelete: SetNull)
  taggables Taggable[]
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  deletedAt DateTime?  @map("deleted_at")

  @@unique([studioId, name])
  @@index([uid])
  @@index([studioId])
  @@index([deletedAt])
  @@index([studioId, deletedAt])
  @@map("tags")
}
```

#### Taggable
```prisma
model Taggable {
  id           BigInt    @id @default(autoincrement())
  uid          String    @unique
  tagId        BigInt    @map("tag_id")
  taggableId   BigInt    @map("taggable_id")
  taggableType String    @map("taggable_type")
  tag          Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  @@unique([tagId, taggableId])
  @@index([uid])
  @@index([tagId])
  @@index([taggableId, taggableType])
  @@index([deletedAt])
  @@index([tagId, deletedAt])
  @@map("taggables")
}
```

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
