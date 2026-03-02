# Task Management — Backend Summary

> **TLDR**: "Task as Form" system — `TaskTemplates` define JSON schemas, `Tasks` are created per-show with form content, `TaskTargets` link tasks to shows via polymorphic association. Tasks follow a PENDING → IN_PROGRESS → REVIEW → COMPLETED lifecycle. Templates and tasks are studio-scoped.

> **Quick-reference** for the Task Management backend system.

---

## Architecture at a Glance

**"Task as Form"** — one Task record = one complete checklist/form (not one row per checkbox).  
A show with 3 task types → 3 DB records instead of 60.

### Core Entities

| Entity                 | Purpose                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `TaskTemplate`         | Blueprint defining form structure (JSON schema), scoped to a Studio      |
| `TaskTemplateSnapshot` | Immutable version of a template's schema                                 |
| `Task`                 | Instance with user-entered data (`content` JSONB), references a snapshot |
| `TaskTarget`           | Polymorphic link (task → Show, Studio, or future entity)                 |

### Key Design Decisions

1. **Snapshot Table** for schema versioning — tasks reference immutable snapshots, not templates
2. **Polymorphic `TaskTarget`** — generic `targetType` + `targetId` with optional FKs for referential integrity
3. **Advisory Locks** — `pg_advisory_xact_lock(showId)` in `@Transactional()` prevents duplicate task generation
4. **Optimistic Locking** — version-based compare-and-swap on task updates (409 on conflict)

---

## Database Schema (Key Fields)

```
TaskTemplate:   id, uid, studioId, name, taskType, currentSchema (JSONB), version, isActive
Snapshot:       id, templateId, version, schema (JSONB, immutable)
Task:           id, uid, status, type, dueDate, snapshotId, templateId, studioId, assigneeId, content (JSONB), metadata (JSONB), version
TaskTarget:     id, taskId, targetType, targetId, showId?, studioId?
```

**Enums**: `TaskStatus` (PENDING → IN_PROGRESS → REVIEW → COMPLETED / BLOCKED / CLOSED), `TaskType` (SETUP, ACTIVE, CLOSURE, ADMIN, ROUTINE, OTHER)

---

## Status State Machine

```
PENDING → IN_PROGRESS → REVIEW → COMPLETED (terminal)
          IN_PROGRESS → BLOCKED → IN_PROGRESS (resume)
          any → CLOSED (admin only, terminal)
```

- **Enforced for operators** on `/me/tasks/:id/action` — strict 8-transition allowlist in `MeTaskService.ensureMemberTransitionAllowed()`
- **Not enforced for admin/manager** on `/studios/:studioId/tasks/:id/action` — action resolves to target status with no "from → to" validation (Phase 4 gap)
- **Not enforced** on system-admin endpoints (`/admin/tasks/*`) for operational recovery
- Action-based workflow: `PATCH .../action` with named actions (`START_WORK`, `SUBMIT_FOR_REVIEW`, `APPROVE_COMPLETED`, etc.)

---

## API Surface

### Studio-Scoped (`/studios/:studioId/...`)

| Endpoint                 | Method | Purpose                           |
| ------------------------ | ------ | --------------------------------- |
| `/task-templates`        | CRUD   | Template management               |
| `/shows`                 | GET    | Shows list with task summary      |
| `/shows/:showUid`        | GET    | Show detail                       |
| `/shows/:showUid/tasks`  | GET    | Tasks for a show                  |
| `/tasks/generate`        | POST   | Bulk task generation              |
| `/tasks/assign-shows`    | POST   | Bulk show assignment              |
| `/tasks/bulk`            | DELETE | Bulk soft-delete tasks            |
| `/tasks/:taskUid/assign` | PATCH  | Individual reassignment           |
| `/tasks/:taskUid/action` | PATCH  | Status transition (admin/manager) |
| `/tasks/:taskUid`        | GET    | Lazy detail with schema           |
| `/members`               | GET    | Studio members for assignment     |

### Operator (`/me/...`)

| Endpoint                | Method | Purpose                                                          |
| ----------------------- | ------ | ---------------------------------------------------------------- |
| `/me/tasks`             | GET    | My tasks (paginated, filterable by status/type/date/search/sort) |
| `/me/tasks/:uid`        | GET    | Task detail with snapshot schema                                 |
| `/me/tasks/:uid/action` | PATCH  | Operator actions (start, submit, block, save content)            |

### System Admin (`/admin/...`)

| Endpoint                                | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `GET /admin/tasks`                      | Cross-studio discovery with rich filters     |
| `GET /admin/tasks/:uid`                 | Task detail                                  |
| `PATCH /admin/tasks/:uid/assign`        | Reassign (membership validated)              |
| `PATCH /admin/tasks/:uid/reassign-show` | Move task target (PENDING only, same studio) |
| `DELETE /admin/tasks/:uid`              | Hard delete                                  |
| `GET /admin/show-statuses`              | Manage system-wide show statuses             |
| `GET /admin/task-templates`             | Manage task templates across studios         |

---

## Service Layer

| Service                    | Scope                                                                      |
| -------------------------- | -------------------------------------------------------------------------- |
| `TaskTemplateService`      | CRUD + schema validation + snapshot creation                               |
| `TaskOrchestrationService` | Bulk generation, show assignment, reassignment, studio show/task reads     |
| `TaskGenerationProcessor`  | Per-show transactional processing (advisory lock, idempotency, resumption) |
| `TaskService`              | Single-task content/status update with optimistic locking                  |
| `TaskValidationService`    | Schema validation + dynamic content validation + require_reason logic      |

---

## Auth & Permissions

- **Studio endpoints**: `@StudioProtected([STUDIO_ROLE.ADMIN])` — composes JWT + membership + role guard
- **Operator**: owns-task check via `assigneeId`
- **System admin**: `isSystemAdmin` flag, unrestricted operational access (no state machine enforcement)

---

## Current Implementation Status

✅ Template CRUD, bulk generation, assignment, reassignment, operator tasks  
✅ Optimistic locking, advisory locks, soft-delete with resumption  
✅ Action-based workflow endpoints, operator state machine enforcement (admin/manager transition whitelist deferred to Phase 4)  
✅ Submission window validation (SETUP before show start, ACTIVE/CLOSURE after show start)  
✅ Audit metadata (`task.metadata.audit.last_transition`)

**Deferred**: File uploads, smart due dates, progress in API response, WebSocket live sync, offline/PWA, bulk review approve
