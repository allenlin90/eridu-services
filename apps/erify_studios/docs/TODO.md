# Pre-Merge Checklist: `feat/task-assignment-ui`

> Complete all items below before merging to master.

## 1. Feature Verification (Manual QA)

### Shows Page (`/studios/:studioId/shows`)
- [x] Table loads with correct columns (name, start time, task summary, etc.)
- [x] Search by show name is debounced and filters results
- [x] Date range filter (`date_from` / `date_to`) narrows the list
- [x] Pagination works (page size, next/prev, total count reflected)
- [x] Row selection enables the bulk action toolbar

### Bulk Task Generation Dialog
- [ ] Opens when rows are selected and "Generate Tasks" is clicked
- [ ] Template slots are grouped by task type
- [ ] Each template slot shows a dropdown of available templates
- [ ] Submitting generates tasks for all selected shows
- [ ] Shows with existing tasks show a "tasks already exist" indicator (skipped)
- [ ] Success toast and table refresh after generation

### Show Assignment Dialog
- [x] Opens when rows are selected and "Assign" is clicked
- [x] Studio member dropdown is populated
- [x] Overwrite warning is shown when selected shows already have an assignee
- [x] Submitting assigns all selected shows to the chosen member
- [x] Success toast and table refresh after assignment

### Show Detail: Task List (`/studios/:studioId/shows/:showId/tasks`)
- [x] Back button navigates to the shows list
- [x] All tasks for the show are listed with type, description, status, assignee, due date
- [x] Inline assignee dropdown updates the task on change
- [x] Disabled state shown while assignment mutation is in-flight
- [x] "Unassigned" option clears the assignee

### My Tasks Page (`/studios/:studioId/my-tasks`)
- [x] **Today** tab shows tasks due today (PENDING / IN_PROGRESS / REVIEW only)
- [x] **Upcoming** tab shows tasks due after today
- [x] **All** tab shows all tasks with no date filter
- [x] Empty state shown when no tasks match the filter
- [x] Clicking a task card opens the execution sheet

### Task Execution Sheet
- [x] Shows task status badge, due date, description, show/template context
- [x] Task content (JSON) rendered in the content section
- [x] **PENDING** → "Start Task" button transitions to IN_PROGRESS
- [x] **IN_PROGRESS** → "Complete Task" button transitions to COMPLETED and closes sheet
- [x] **COMPLETED** → "Reopen Task" button transitions back to IN_PROGRESS
- [x] Buttons disabled while mutation is in-flight

### JsonForm Engine (`/studios/:studioId/demo/tasks`)
- [ ] `text` field renders an Input
- [ ] `number` field renders a numeric Input; non-numeric input is rejected
- [ ] `checkbox` field renders a Checkbox
- [ ] `select` field renders a Select dropdown
- [ ] `multiselect` field renders a checkbox group; multiple values can be selected
- [ ] `date` field renders a DatePicker
- [ ] `datetime` field renders a DateTimePicker
- [ ] `textarea` field renders a Textarea
- [ ] Required field validation fires on submit
- [ ] Form submit callback receives typed values

---

## 2. Bug Fixes (Blocking — Must Fix Before Merge)

> Discovered during post-commit verification. Root causes and correct patterns documented in design doc §14.

### 2.1 Search Not Working on Shows Page

**Root cause**: `useStudioShows` reads `columnFilters.find(f => f.id === 'search')` but `useTableUrlState` creates the filter with `id: 'name'` (the default `searchColumnId`). IDs never match, so search is always empty.

- [x] Fix `use-studio-shows.ts` L30: change filter lookup from `f.id === 'search'` → `f.id === 'name'`
- [x] Verify typing a show name narrows the results and clearing returns the full list
- [x] Verify results remain scoped to the studio (studioId always passed to API)

### 2.2 Replace Plain Select with AsyncCombobox for Member Pickers

**Root cause**: Assignee pickers in `show-assignment-dialog.tsx` and `AssigneeCell` in `show-tasks-table/columns.tsx` use `<Select>` with no search input. Studios with many members are hard to navigate.

- [x] Update `show-assignment-dialog.tsx`: replace `Select`/`SelectTrigger`/`SelectContent` with `AsyncCombobox` from `@eridu/ui`; add `memberSearch` state for client-side filtering
- [x] Update `show-tasks-table/columns.tsx` → `AssigneeCell`: replace `Select` with `AsyncCombobox`; accept `onSearch` / `memberSearch` from parent column factory
- [x] Confirm `AsyncCombobox` is exported from `packages/ui/src/index.ts`
- [x] Test: open dialog → type partial name → dropdown narrows → select → correct UID submitted
- [x] Test inline cell: type to filter → pick user → task updates

### 2.3 Row Selection by Index vs. by Item ID

**Root cause**: TanStack Table default `getRowId` uses row index. When paginating, index `0` on page 2 is treated as the same key as index `0` on page 1, incorrectly appearing selected.

- [x] Add `getRowId?: (row: TData) => string` prop to `AdminTable` and wire to `useReactTable`
- [x] Pass `getRowId={(show) => show.id}` from `shows/index.tsx`
- [x] Refactor `selectedShows` memo: use IDs logic instead of indices
- [x] Test: select row on page 1 → navigate to page 2 → no rows appear selected → back to page 1 → original row still selected
- [x] Test: select rows across two pages → floating bar shows correct combined count

---

## 3. Cleanup Before Merge

- [x] **Remove demo route** — delete `apps/erify_studios/src/routes/studios/$studioId/demo/` directory
- [x] Remove the corresponding route entry from `routeTree.gen.ts`
- [x] Remove demo sidebar link if one was added

---

## 4. Documentation Updates

- [x] **Design doc** (`TASK_MANAGEMENT_UIUX_DESIGN.md`) — align naming:
  - [x] §9 references `buildZodSchema(schema)` but implementation exports `buildTaskContentSchema()` — update the doc
  - [x] §11.2 documents `enabled: boolean` option for `useInfiniteScroll` — update doc to match actual hook API (conditional inside instead)
- [ ] **Skill updates** — review and update if patterns changed:
  - `orchestration-service-nestjs` — now uses `resolveStudioMember()` pattern and `taskService.setAssignee()`
  - `frontend-api-layer` — TanStack Query v5 `placeholderData` function form confirmed

---

## 5. Final Pre-Merge Checks

- [x] `pnpm turbo typecheck --force` — pass
- [x] `pnpm turbo lint --force` — pass (warnings only, no blocking errors)
- [x] `pnpm turbo test --force` — pass
- [ ] PR description written and linked to design doc

---

# TODO: Task Deletion Workflow

## Phase 3.3: Bulk Task Deletion

The ability to remove wrongly generated tasks directly from the Show Tasks page.

### Backend API (`apps/erify_api`)
- [x] Create `BulkDeleteTasksDto` for validating an array of task UIDs (`task_uids`).
- [x] Add a `@Delete('bulk')` endpoint to `StudioTaskController`.
- [x] Implement `bulkDeleteTasks` in `TaskOrchestrationService` to soft-delete tasks and their targets in a transaction.
- [x] Update `TaskRepository.findByShowAndTemplate` to accept an `includeDeleted` option.
- [x] Update `TaskGenerationProcessor.processShow` to **Resume** (undelete, reset to `PENDING`, wipe content, update snapshot) soft-deleted tasks instead of skipping or duplicating them.

### Frontend UI (`apps/erify_studios`)
- [x] Update `<ShowTasksTable>` with a selection column (checkboxes).
- [x] Integrate bulk deletion in `<tasks.tsx>` page header/toolbar.
- [x] Implement the `useDeleteTasks` mutation in `use-delete-tasks.ts` to call the new backend endpoint.
- [x] Create a `DeleteTasksDialog` to handle the confirmation UI and mutation submission.

---

# TODO: Advanced Show Filtering

## Phase 3.4: Studio-Scoped Show Filters
Bring advanced filtering capabilities to the `/studios/:studioId/shows` page, parity with system shows.

### Backend API (`apps/erify_api`)
- [x] Add `client_name`, `show_type_name`, `show_standard_name`, `show_status_name`, and `platform_name` to `listStudioShowsQuerySchema`.
- [x] Update `ShowRepository.findPaginatedWithTaskSummary` to apply these filter columns using PostgreSQL ILIKE.

### Frontend UI (`apps/erify_studios`)
- [x] Update `useStudioShows` hook to accept the new string-based filter parameters.
- [x] Implement `<AdminTableToolbar />` in `/studios/:studioId/shows`.
- [x] Use `useShowStandardFieldData` and related generic hooks to populate dynamic filter dropdown options in `searchableColumns`.
- [x] Move `has_tasks` into advanced filters (featured section), not quick filters, so dropdown reset/count behavior is consistent.

---

# TODO: Mobile Bulk Actions UX (Shows Page)

## Phase 3.5: Selected Shows Action UI (Mobile)
Prevent overflow and maintain clear bulk-action workflow on small screens.

### Frontend UI (`apps/erify_studios`)
- [x] Keep existing floating action bar for desktop (`md+`) only.
- [x] Add a dedicated mobile selected-shows action tray (`<md`) with safe-area bottom padding.
- [x] Add bottom-sheet action menu for mobile with `Generate Tasks` and `Assign Tasks`.
- [x] Ensure sheet closes before triggering dialogs to avoid stacked overlays.

---

# TODO: MC Management Enhancements

## User Association

Currently, system admins can associate an MC with a User by manually entering the User's UID.

### Future Enhancements

- [ ] **User Search/Autocomplete**: Instead of a manual text input for User UID, implement an autocomplete or search-enabled dropdown (e.g., Combobox) to allow finding users by name or email.
- [ ] **Pagination/Infinite Scroll**: The user search should support pagination or infinite scroll to handle a large number of users efficiently.
- [ ] **Filtering**: Filter out users who are already associated with an MC to prevent duplicates or invalid associations.
