# Phase 5: Collaboration, Notifications & Enterprise Scheduling

> **TLDR**: 🗓️ **Planned**. Adds system-wide audit logging, polymorphic tagging, enhanced comments, notification infrastructure (persistence + real-time delivery), and chunked schedule uploads for large enterprise clients.

**Status**: ⏳ Planning phase

## Overview

Phase 5 implements the advanced collaboration and communication features deferred from earlier phases. These features share a common theme: making the platform more observable, interactive, and scalable for larger teams and enterprise clients.

**Timeline**: Dependent on Phase 3 (file uploads, materials) and Phase 4 (review quality) completion.

## Related Documentation

- **[Architecture Overview](../ARCHITECTURE_OVERVIEW.md)** - System architecture and module design
- **[Schedule Planning](../SCHEDULE_PLANNING.md)** - Schedule upload system design (chunked upload extends this)

## Core Features

### 1. System-Wide Audit Logging

- **Goal**: Track all critical actions for compliance and debugging.
- **Scope**:
  - Authentication (Login, Failures)
  - Task Management (Creation, Assignment, Status Changes, Content Updates)
  - Show Management (Status Lifecycle)
  - Material Management (CRUD, Version Changes)
  - Shift Management (Approvals, Cost Overrides)
- **Implementation**: NestJS interceptor-based approach for automatic capture with manual enrichment for domain-specific context.

### 2. Polymorphic Tagging

- **Studio-Scoped Tags**: Tag any entity type with studio-scoped tags.
- **Polymorphic Design**: `Tag` + `Taggable` join table supporting Tasks, Shows, Materials, etc.
- **Use Cases**: Categorization, filtering, search enhancement.

### 3. Enhanced Comments

- **Rich Commenting**: Comments attachable to Tasks, Shows, and Materials.
- **Threading**: Support for threaded replies.
- **Mentions**: @mention users to notify them (depends on notification system).

### 4. Notifications

- **Persistence Layer**: `Notification` entity with read/unread state, categorization, and entity references.
- **REST API**: `GET /me/notifications`, `PATCH /me/notifications/:id/read`, `PATCH /me/notifications/read-all`.
- **Real-Time Delivery** (if infra is ready): WebSocket/SSE gateway for push notifications. Requires event bus infrastructure (`@nestjs/event-emitter` or similar) and potentially Redis for horizontal scaling.
- **Triggers**: Task assignment, status changes, comment mentions, shift approvals, review decisions.

### 5. High-Volume Schedule Management (Chunked Upload)

- **Chunked Upload for Large Clients**: Support for clients with >200 shows per month.
- **Endpoint**: `POST /admin/schedules/:id/shows/append`
- **Rationale**: Current schedule publish does a full diff+upsert. For very large schedules, an append-only mode avoids reprocessing the entire plan document.

## Implementation Scope

### Audit Logging

- [ ] `AuditLog` Prisma model (actor, action, entity type/id, metadata, timestamp)
- [ ] `AuditInterceptor` for automatic capture on mutation endpoints
- [ ] `AuditService` for programmatic logging from services
- [ ] Admin query endpoints for audit log search/filtering

### Tagging

- [ ] `Tag` and `Taggable` Prisma models (polymorphic)
- [ ] `TagService` with studio-scoped CRUD
- [ ] Tag endpoints on relevant entity controllers (e.g., `POST /studios/:id/tasks/:taskId/tags`)

### Comments

- [ ] `Comment` Prisma model (polymorphic target, threading via `parentId`)
- [ ] `CommentService` with studio-scoped CRUD
- [ ] Comment endpoints on relevant entity controllers
- [ ] Mention parsing and notification trigger integration

### Notifications

- [ ] `Notification` Prisma model (userId, type, entityType, entityId, read/unread, metadata)
- [ ] `NotificationService` for creation and query
- [ ] `GET /me/notifications` and mark-as-read endpoints
- [ ] (Optional) WebSocket/SSE gateway for real-time delivery
- [ ] (Optional) Event bus setup (`@nestjs/event-emitter`) for decoupled notification triggers

### Chunked Schedule Upload

- [ ] `POST /admin/schedules/:id/shows/append` endpoint
- [ ] Append-only validation (no full diff, additive only)
- [ ] Conflict detection against existing shows in the schedule

## Technical Considerations

### Database Design

- **Audit Logs**: Append-only table, consider partitioning by month for large volumes. No soft delete — audit records are immutable.
- **Polymorphic Relations**: `Taggable` and `Comment` use `targetType` + `targetId` pattern (same as `TaskTarget`). Consider whether FK enforcement is needed per target type.
- **Notifications**: High-write table. Index on `(userId, read, createdAt)` for efficient "unread first" queries.

### Infrastructure Decisions (Deferred)

- **Event Bus**: `@nestjs/event-emitter` for in-process events vs. Redis pub/sub for multi-instance. Decision depends on deployment topology at the time.
- **WebSocket Gateway**: NestJS `@WebSocketGateway` with optional Redis adapter for horizontal scaling.

## Success Criteria

- [ ] All critical actions produce audit log entries queryable by admins.
- [ ] Users can tag entities and filter by tags within a studio.
- [ ] Users can comment on Tasks and Shows with threading support.
- [ ] Users receive notifications for relevant events (at minimum via polling API).
- [ ] Large clients (>200 shows/month) can append shows to schedules without full republish.

## Dependencies

- Phase 3 complete: Materials and File Uploads available for tagging/commenting.
- Phase 4 complete: Review audit metadata patterns established (reused here).
- Event bus infrastructure decision made before real-time notification work begins.
