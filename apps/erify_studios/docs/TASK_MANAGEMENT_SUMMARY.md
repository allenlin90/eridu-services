# Task Management — UI/UX Summary

> **Quick-reference** for the Task Management frontend UI/UX system.

---

## User Personas

| Persona                  | Role                                         | Context                          | Key Needs                                     |
| ------------------------ | -------------------------------------------- | -------------------------------- | --------------------------------------------- |
| **Sarah** (Studio Admin) | Plans shows, manages templates, assigns work | Desk-based, multi-tasking        | Overview, bulk actions, review queue          |
| **Marcus** (Operator)    | Executes checklists, updates status          | Mobile-first, floor/control room | Today's tasks, quick status, offline (future) |

---

## Screen Index

| #     | Screen                 | Route                                     | Role         | Status  |
| ----- | ---------------------- | ----------------------------------------- | ------------ | ------- |
| 3.1   | Template Library       | `/studios/$studioId/task-templates`       | Admin        | ✅       |
| 3.2   | Create/Edit Template   | Dialog/sheet                              | Admin        | ✅       |
| 3.3   | Shows List             | `/studios/$studioId/shows`                | Admin        | ✅       |
| 3.3.1 | Bulk Generation Dialog | Dialog                                    | Admin        | ✅       |
| 3.3.2 | Assignment Dialog      | Dialog                                    | Admin        | ✅       |
| 3.3.3 | Show Detail / Tasks    | `/studios/$studioId/shows/$showUid/tasks` | Admin        | ✅       |
| 3.4   | My Tasks               | `/studios/$studioId/my-tasks`             | All          | ✅       |
| 3.5   | Task Execution Sheet   | Sheet overlay                             | Operator     | ✅       |
| 3.6   | Task Review Queue      | `/studios/$studioId/tasks?status=REVIEW`  | Admin        | ✅       |
| 3.7   | All Tasks Dashboard    | Studio-scoped                             | Admin        | Planned |
| 3.8   | System Tasks           | `/system/tasks`                           | System Admin | ✅       |
| 3.9   | System Show Statuses   | `/system/show-statuses`                   | System Admin | ✅      |
| 3.10  | System Task Templates  | `/system/task-templates`                  | System Admin | ✅      |

---

## Key Workflows

### 1. Bulk Task Generation (Admin)
Shows list → select shows → "Generate Tasks" → pick templates in dialog → POST `/tasks/generate` → table refreshes

### 2. Bulk Assignment (Admin)
Shows list → select shows → "Assign" → pick member → POST `/tasks/assign-shows` → table refreshes

### 3. Individual Reassignment (Admin)
Show detail → inline assignee dropdown on task card → PATCH `/tasks/:taskUid/assign` (optimistic update)

### 4. Task Execution (Operator)
My Tasks → tap card → Task Execution Sheet (JsonForm) → auto-save on field change (300ms debounce) → status actions (`Start Task` / `Submit for Review` / `Report Blocker`)

### 5. Review (Admin)
Review Queue → row actions: Approve (`→ COMPLETED`), Reject (with note, `→ IN_PROGRESS`), Close, Block

---

## Navigation & Studio Context

- **Studio Switcher**: `TeamSwitcher` from `@eridu/ui` — maps `studio_memberships` from `/me/profile`
- **Sidebar Nav**: Dashboard, My Tasks (all roles) + Shows, Task Templates (admin only)
- **Active Studio**: persisted in `localStorage`, auto-initializes, invalidates queries on switch
- **Role-Based Access**: admin sees Shows + Templates nav items; non-admin sees only Dashboard + My Tasks

---

## Component Patterns (Implemented)

| Pattern         | Component                               | Location                              |
| --------------- | --------------------------------------- | ------------------------------------- |
| Responsive Grid | `ResponsiveCardGrid`                    | `components/responsive-card-grid.tsx` |
| Infinite Scroll | `useInfiniteScroll`                     | `@eridu/ui`                           |
| Sticky Toolbar  | CSS `sticky top-0 backdrop-blur`        | Per-page                              |
| Route Layout    | Parent `<Outlet />` → child owns layout | TanStack Router                       |
| Query Hooks     | Feature hooks own all query state       | `hooks/use-*.ts`                      |

---

## Task Card Anatomy (My Tasks)

```
┌──────────────────────────────────────────────┐
│ [TYPE]  Description                 ● STATUS  │
│ Show Name                                     │
│ Due: date  ⚠️ urgency                         │
│ ▓▓▓▓▓▓░░░░ completed/total items      pct%   │
└──────────────────────────────────────────────┘
```

**Urgency borders**: Red = overdue, Amber = due within 3h, Blue = in progress, Grey = pending

---

## Filter Bar (My Tasks)

| Filter           | API Param            | Values                                           |
| ---------------- | -------------------- | ------------------------------------------------ |
| Date             | `due_date_from/to`   | Today, This Week, Custom                         |
| Show Start Date  | `show_start_from/to` | Single date picker (operational-day window)      |
| Status           | `status[]`           | PENDING, IN_PROGRESS, REVIEW, BLOCKED, COMPLETED |
| Type             | `task_type[]`        | SETUP, ACTIVE, CLOSURE, ADMIN, ROUTINE           |
| Search           | `search`             | Free text                                        |
| Sort             | `sort`               | Due date ↑/↓, Recently updated                   |
| Overdue shortcut | combined             | `due_date_to=today&status=PENDING,IN_PROGRESS`   |

---

## Visual Design Tokens

- **Status colors**: Overdue (#DC2626), Due-soon (#F59E0B), In-progress (#3B82F6), Completed (#10B981), Review (#F59E0B), Blocked (#6B7280), Closed (#9CA3AF)
- **Fonts**: Headings = Space Mono, Body = IBM Plex Sans
- **CTA**: Slate 900 (#0F172A)

---

## Technical Integration

- **State**: TanStack Query for server state; feature hooks own all query logic
- **Forms**: `JsonForm` renders from `task.snapshot.schema`, auto-saves via debounced PATCH
- **Progress**: Frontend-calculated from `calculateTaskProgress(task, schema)` — required fields only
- **Optimistic updates**: On field change → local state → debounce → PATCH → 409 conflict → revert + toast
- **Cache strategy**: `staleTime: 60s`; invalidate only affected show/task queries on mutations

---

## Implementation Status

✅ Template library (cards, search, infinite scroll), create/edit dialog  
✅ Shows list (data table, filters, bulk actions bar), generation & assignment dialogs  
✅ Show detail with task cards and inline reassignment  
✅ My Tasks (filter bar, task cards, progress bars, urgency borders, show-start-date filter)  
✅ Task Execution Sheet (JsonForm, auto-save, rejection banner, status actions)  
✅ Review Queue (per-task actions, rejection/block note dialogs)  
✅ System Tasks (cross-studio list, detail dialog, reassignment)

**Deferred**: Animations/confetti, swipe gestures, file uploads, PWA/offline, WebSocket sync, ~~analytics dashboard~~, bulk review approve
