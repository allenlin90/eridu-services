# Phase 2: Show Task Management & Assignments

> **TLDR**: ✅ **Complete**. Adds "Task as Form" system — `TaskTemplate` → `TaskTemplateSnapshot` → `Task` + `TaskTarget`. Studio-scoped templates, bulk generation, operator assignment, and execution. Review gate (`REVIEW` status) exists; enforcement and review UI deferred to Phase 4. Ad-hoc ticketing and advanced task management deferred to Phase 3.

**Status**: ✅ Complete — all remaining items assigned to later phases (see Deferred Work)

## Overview

Phase 2 focuses on "**generic Task Management**" to enable extensible workflow management. It introduces the generic `Task` system and updates the Show entity to support studio-scoped workflows.

**Timeline**: Dependent on Phase 1 completion

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE_OVERVIEW.md)** - System architecture and module design
- **[Business Domain](../BUSINESS.md)** - Business domain information and entity relationships
- **[Task Management Summary](../TASK_MANAGEMENT_SUMMARY.md)** - Quick-reference for task architecture, API, and workflows

## Core Features

### 1. Task Management System

- **Task Templates**: Reusable templates per studio (`TaskTemplate`) to generate tasks.
- **Task Snapshots**: Immutable version history (`TaskTemplateSnapshot`) ensuring historical accuracy.
- **Generic Tasks**: `Task` entity decoupled from specific targets via `TaskTarget`.
- **Task as Form**: Each task represents a complete form/checklist defined by a JSON schema.
- **Lifecycle Management**: Workflow states (PENDING, IN_PROGRESS, REVIEW, COMPLETED, BLOCKED, CLOSED). Enum implemented; transition enforcement deferred — see Remaining Work.
- **Dashboard**: Operator overview of their assigned tasks.
- **Studio Scoping**: Templates and Tasks are strictly scoped to a Studio.

### 2. Show Association Updates

- **Show-Studio Linking**: Add `studioId` to `Show` entity to explicit link Shows to Studios.
- **Rationale**: Required for determining which Studio's Task Templates to apply to a Show.

### 3. Authorization (Studio-Based)

- **Studio Membership**: Leverage existing `StudioMembership`.
- **RBAC**: Studio Admins/Managers manage templates; Members complete tasks.

## Implementation Scope

All items implemented. See [Task Management Summary](../TASK_MANAGEMENT_SUMMARY.md) for quick-reference.

- `studioId` added to `Show` model with `Studio` relation
- `TaskStatus`, `TaskType` enums in Prisma schema
- `Task` and `TaskTarget` models with polymorphic association
- Full template management, bulk generation, assignment, and operator endpoints

## Technical Considerations

### Technical Considerations

### Database Design

- **JSONB Forms**: `TaskTemplate.currentSchema` defines the form, `Task.content` stores answers.
- **Schema Versioning**: `TaskTemplateSnapshot` stores immutable schema versions referenced by Tasks.
- **Explicit Association**: `Task` linked via `TaskTarget`.
- **Referential Integrity**: Deleting a target (Show) cascades to delete `TaskTarget` entries.

### API Design

- RESTful endpoints: `/admin/tasks`, `/studios/:studioId/task-templates` (✅ implemented).

## Success Criteria

- Full workflow from Template → Task generation → Completion: ✅
- Operators can see "My Tasks" across all shows: ✅
- Admin review gate before task marked complete: ✅ Partial — see Deferred Work

## Deferred Work (Assigned to Later Phases)

All remaining items have been explicitly assigned. Phase 2 is closed.

### What was completed (verified against code)

- ✅ Action-based endpoints: `PATCH /me/tasks/:id/action` and `PATCH /studios/:studioId/tasks/:id/action`
- ✅ Operator state machine: `MeTaskService.ensureMemberTransitionAllowed()` — strict 8-transition allowlist
- ✅ Frontend integration: Both action mutations wired, action sheet UI with confirmation

### → Phase 3: Advanced Task Management

- **Ad-hoc Task Ticketing**: Template-less task creation for pre-production one-off requirements. Reuses `Task` model with `snapshotId: null`. See [Ad-hoc Task Ticketing Design](../design/AD_HOC_TASK_TICKETING.md).
- **Task Reopening Workflow**: Formal process for reopening `completed` tasks (requiring reason/approval).
- **Complex Reassignment Rules**: Advanced validation for reassignment requests based on strict Show status.

### → Phase 4: Review Quality (remaining gaps)

- **Admin/Manager Transition Enforcement**: The studio `PATCH .../action` endpoint currently resolves action → status with no "from → to" whitelist — admins can freely transition to any status. Needs a transition allowlist matching the intended lifecycle:
  ```
  Admin/Manager:  REVIEW → COMPLETED   (approve)
                  REVIEW → IN_PROGRESS (reject, request revision)
                  any → BLOCKED, any → CLOSED
  ```
- **Frontend: Admin Review Queue**: A dedicated filtered review queue UI (`?status=REVIEW`) with rejection notes surfaced to operators.

## Dependencies

- Phase 1 complete.

## Timeline & Rollout Strategy

1.  **Schema**: Add `studioId` to Show, create `Task` tables.
2.  **Features**: Implement Templates, then Assignment logic.

## Database Schema (Planned)

### Show (Update)

```prisma
model Show {
  // ... existing fields ...
  studioId       BigInt?        @map("studio_id")
  externalId     String?        @map("external_id")
  studio         Studio?        @relation(fields: [studioId], references: [id])
  taskTargets    TaskTarget[]   // Relation to Query Tasks easily
  // ... existing fields ...
  
  @@index([studioId])
  @@index([externalId])
}
```

### Generic Task Management System

#### TaskTemplate & Snapshot

```prisma
enum TaskType {
  SETUP
  ACTIVE
  CLOSURE
  ADMIN
  ROUTINE
  OTHER
}

model TaskTemplate {
  id            BigInt   @id @default(autoincrement())
  uid           String   @unique
  studioId      BigInt   @map("studio_id")
  name          String
  description   String?
  isActive      Boolean  @default(true) @map("is_active")
  
  // Current version (denormalized)
  currentSchema Json     @map("current_schema")
  version       Int      @default(1)
  
  studio        Studio   @relation(fields: [studioId], references: [id])
  snapshots     TaskTemplateSnapshot[]
  tasks         Task[]

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  @@index([uid])
  @@index([studioId])
  @@map("task_templates")
}

model TaskTemplateSnapshot {
  id          BigInt   @id @default(autoincrement())
  templateId  BigInt   @map("template_id")
  template    TaskTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  version     Int      // 1, 2, 3, etc.
  schema      Json     // Immutable schema at this version
  metadata    Json     @default("{}")
  
  tasks       Task[]
  
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([templateId, version])
  @@index([templateId, version])
  @@map("task_template_snapshots")
}
```

#### Task & Target

```prisma
enum TaskStatus {
  PENDING
  IN_PROGRESS
  REVIEW
  COMPLETED
  BLOCKED
  CLOSED
}

model Task {
  id                 BigInt                @id @default(autoincrement())
  uid                String                @unique
  description        String
  status             TaskStatus            @default(PENDING)
  type               TaskType
  dueDate            DateTime?             @map("due_date")
  completedAt        DateTime?             @map("completed_at")
  
  // Schema reference (immutable snapshot)
  snapshotId         BigInt                @map("snapshot_id")
  snapshot           TaskTemplateSnapshot  @relation(fields: [snapshotId], references: [id], onDelete: Restrict)
  
  // Optional template reference
  templateId         BigInt?               @map("template_id")
  template           TaskTemplate?         @relation(fields: [templateId], references: [id], onDelete: SetNull)
  
  // Form Data
  content            Json                  @default("{}")
  metadata           Json                  @default("{}")
  
  // Optimistic locking
  version            Int                   @default(1)
  
  // Scoping
  studioId           BigInt?               @map("studio_id")
  studio             Studio?               @relation(fields: [studioId], references: [id])
  
  // Assignment
  assigneeId         BigInt?               @map("assignee_id")
  assignee           User?                 @relation(fields: [assigneeId], references: [id])
  
  targets            TaskTarget[]

  createdAt          DateTime              @default(now()) @map("created_at")
  updatedAt          DateTime              @updatedAt @map("updated_at")
  deletedAt          DateTime?             @map("deleted_at")
  
  @@index([uid])
  @@index([snapshotId])
  @@index([templateId])
  @@index([studioId])
  @@index([assigneeId])
  @@index([status])
  @@map("tasks")
}
```

#### TaskTarget (Association)

```prisma
model TaskTarget {
  id          BigInt   @id @default(autoincrement())
  taskId      BigInt   @map("task_id")
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  
  // Generic polymorphic reference
  targetType  String   @map("target_type") // "SHOW", "STUDIO", "PROJECT", etc.
  targetId    BigInt   @map("target_id")
  
  // Optional: Keep FKs for referential integrity
  showId      BigInt?  @map("show_id")
  show        Show?    @relation(fields: [showId], references: [id], onDelete: Cascade)
  studioId    BigInt?  @map("studio_id")
  studio      Studio?  @relation(fields: [studioId], references: [id], onDelete: Cascade)
  
  deletedAt   DateTime? @map("deleted_at")
  
  @@unique([taskId, targetType, targetId, deletedAt])
  @@index([taskId])
  @@index([showId])
  @@index([studioId])
  @@index([targetType, targetId])
  @@index([deletedAt])
  @@map("task_targets")
}
```
