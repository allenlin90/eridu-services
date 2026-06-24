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
| `Task`                 | Instance with user-entered data (`content` JSONB), normally references a snapshot |
| `TaskTarget`           | Polymorphic link (task → Show, Studio, or future entity)                 |

### Key Design Decisions

1. **Snapshot Table** for schema versioning — form tasks reference immutable snapshots, not templates. System `STATE_GATE` tasks are not form submissions and may have `templateId = null` and `snapshotId = null`.
2. **Schema Engine Routing** — v1 snapshots use `field.key` content keys; v2 templates use stable `fld_...` field ids and descriptor-based reporting
3. **System Fact Bindings** — v2 fields can set `system_fact_key` from the closed `@eridu/api-types/task-management` catalog; shared Zod validation enforces field-type compatibility and one binding per fact key before save. Creator attendance explanations use the existing `require_reason` sidecar instead of a separate reason binding. Platform violation bindings use `show_platform_violation` on a `multiselect` field and replace only `ShowPlatformViolation` rows from the same hydrated task field when a submitted task is confirmed
4. **Polymorphic `TaskTarget`** — generic `targetType` + `targetId` with optional FKs for referential integrity
5. **Advisory Locks** — `pg_advisory_xact_lock(showId)` in `@Transactional()` prevents duplicate task generation
6. **Optimistic Locking** — version-based compare-and-swap on task updates (409 on conflict)

---

## Database Schema (Key Fields)

```
TaskTemplate:   id, uid, studioId, name, taskType, currentSchema (JSONB), version, isActive
Snapshot:       id, templateId, version, schema (JSONB, immutable)
Task:           id, uid, status, type, dueDate, snapshotId?, templateId?, studioId, assigneeId, content (JSONB), metadata (JSONB), version
TaskTarget:     id, taskId, targetType, targetId, showId?, studioId?
```

**Enums**: `TaskStatus` (PENDING → IN_PROGRESS → REVIEW → COMPLETED / BLOCKED / CLOSED), `TaskType` (SETUP, ACTIVE, CLOSURE, ADMIN, ROUTINE, OTHER, STATE_GATE). Submitted operator tasks stop in `REVIEW`; manager confirmation into `COMPLETED` is the extraction gate for operational facts.

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

| Endpoint                 | Method | Purpose                                                                   |
| ------------------------ | ------ | ------------------------------------------------------------------------- |
| `/task-templates`        | CRUD   | Template management                                                       |
| `/shows`                 | GET    | Shows list with task summary + readiness-aligned `needs_attention` filter |
| `/shows/:showUid`        | GET    | Show detail                                                               |
| `/shows/:showUid/tasks`  | GET    | Tasks for a show                                                          |
| `/tasks/generate`        | POST   | Bulk task generation                                                      |
| `/tasks/assign-shows`    | POST   | Bulk show assignment                                                      |
| `/tasks/bulk`            | DELETE | Bulk soft-delete tasks                                                    |
| `/tasks/bulk-approve`    | POST   | Bulk approve eligible tasks and extract facts                             |
| `/tasks/:taskUid/assign` | PATCH  | Individual reassignment                                                   |
| `/tasks/:taskUid/action` | PATCH  | Status transition (admin/manager)                                         |
| `/tasks/:taskUid`        | GET    | Lazy detail with schema                                                   |
| `/members`               | GET    | Studio members for assignment                                             |

PR 12.4 keeps submitted-task confirmation in Task Review at `/task-review` and adds Show Run Review at `/show-run-review` for submitted show records already populated to target tables.

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
| `TaskValidationService`    | Schema validation + dynamic content validation, including optional field sidecars such as `<fieldKey>__reason` and `<fieldKey>__extra` |

---

## Auth & Permissions

- **Studio endpoints**: `@StudioProtected([STUDIO_ROLE.ADMIN])` — composes JWT + membership + role guard
- **Operator**: owns-task check via `assigneeId`
- **System admin**: `isSystemAdmin` flag, unrestricted operational access (no state machine enforcement)

---

## Current Implementation Status

✅ Template CRUD, bulk generation, assignment, reassignment, operator tasks  
✅ v2 `system_fact_key` schema validation for PR 12 operational fact bindings
✅ Confirmed-task extraction model: task submissions in `REVIEW` remain review inputs; approval to `COMPLETED` populates target fact columns
✅ Optimistic locking, advisory locks, soft-delete with resumption  
✅ Action-based workflow endpoints, operator state machine enforcement, studio review queue UI in `erify_studios`  
⚠️ Admin/manager transition whitelist is still not enforced on `/studios/:studioId/tasks/:id/action`  
✅ Submission window validation (SETUP before show start, ACTIVE/CLOSURE after show start)  
✅ Audit metadata (`task.metadata.audit.last_transition`)
✅ Studio shows `needs_attention` filtering via shift-alignment readiness warnings (no tasks / unassigned tasks / missing required task types)
✅ Bulk review approve: manager bulk approval of eligible `REVIEW` tasks with atomic transaction processing and extraction summaries

**Deferred**: Ad-hoc ticket creation, formal reopen workflow with approval context, operations review summary contract, smart due dates, progress in API response, WebSocket live sync, offline/PWA

---

## Studio Shows Attention Filter Contract

`GET /studios/:studioId/shows` supports:
- `needs_attention=true`
- `date_from=<ISO datetime>`
- `date_to=<ISO datetime>`
- Alignment guardrail: backend computes readiness with `match_show_scope=true` so issue candidates are derived from the same in-scope show set as table pagination.
- Optional fallback for legacy clients: `planning_date_from/planning_date_to` (date-only)

Behavior:
- `needs_attention=true` computes readiness warnings in the same datetime window used by the shows table query and restricts list results to those show UIDs.
- Shows page business window is operational-day aligned (`date_to` can use D+1 `05:59` local behavior), so readiness and table pagination stay consistent.
- Legacy fallback `planning_date_from/planning_date_to` accepts ISO date-only (`YYYY-MM-DD`) values; invalid values should be rejected with `400 Bad Request`.
- Readiness baseline for this filter:
  - Standard shows: missing `SETUP` or `CLOSURE` is an issue.
  - Premium shows: same baseline plus missing moderation task is an issue.
