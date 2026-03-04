# Moderation Workflow Patterns (feat/moderator-workflow)

## Key Architecture Decisions

### Schema Contract
- `group` field added to `FieldItemBaseSchema` in `packages/api-types/src/task-management/template-definition.schema.ts` — optional string, no validation of values against loop list (backend is ignorant of loops by design)
- Loop metadata lives in `template.snapshot.schema.metadata.loops` (app-layer contract, not enforced by backend Zod schema)
- `TemplateSchemaValidator` accepts `metadata: z.record(z.string(), z.any())` — fully opaque at API layer
- `LoopMetadataSchema` (id, name, durationMin) + `TemplateMetadataSchema` live in `apps/erify_studios/src/components/task-templates/builder/schema.ts` (builder-local, not promoted to @eridu/api-types — correct, this is app-level logic)

### Loop ID Convention
- Loop IDs are generated as `l1`, `l2`, `l3` etc. (not UUIDs) in `createNextLoop()`. These are also the `group` values stored in field items.
- `buildLoopMetadataFromTemplate` has a fallback: if `metadata.loops` is missing or incomplete, it reconstructs loop entries from unique `group` values on items. This ensures backward compat if metadata is corrupted.

### Active Loop Selection (resolvedActiveGroup pattern)
- The `resolvedActiveGroup` derived-state (useMemo) pattern is used in BOTH `task-execution-sheet.tsx` and `live-preview.tsx`. This is the correct React pattern — avoids transient invalid state from useEffect-synchronized state.
- `liveLoopId` computed via cumulative `durationMin` arithmetic against `Show.startTime`. Polling interval is 30s (`LOOP_CLOCK_TICK_MS`). Only starts if `showStartTimeMs && loopTabs.length > 0`.

### Template Builder Mode Detection
- `isModerationMode` is DERIVED, not stored in state: `template.items.some((item) => !!item.group) || (template.metadata?.loops?.length ?? 0) > 0`
- Switching modes via `handleWorkflowModeChange`: MODERATION mode assigns all ungrouped items to the first loop; STANDARD mode strips all `group` props and removes `metadata.loops`

### Progress Component
- `Progress` component added to `@eridu/ui` (new `@radix-ui/react-progress` dep). Has `indicatorClassName` prop for color override and clamps value to 0-100.
- Replaces the local `ProgressBar` component at `apps/erify_studios/src/components/progress-bar.tsx`. The `ProgressBar` file still exists as dead code after this PR (not deleted).

### isFieldComplete Export
- `isFieldComplete` in `apps/erify_studios/src/features/tasks/lib/progress.ts` was a private function; exported in this PR to enable per-loop completion tracking in both `task-execution-sheet.tsx` and `live-preview.tsx`.

## Final State (feat/moderator-workflow — MERGED)
- All 23 files committed, working tree clean after `fix(studios): resolve PR review issues` commit (a81a378)
- All checks pass: lint PASS, typecheck PASS, build PASS (erify_studios, @eridu/ui, @eridu/api-types), tests 319 passed / 1 skipped
- Canonical feature doc created: `apps/erify_studios/docs/MODERATION_WORKFLOW.md`

## All Issues — Final Resolution
- BLOCKING 1 (incomplete commit): RESOLVED
- BLOCKING 2 (lockfile): RESOLVED
- BLOCKING 3 (metadata.loops ordering): RESOLVED
- WARNING 4 (progress-bar.tsx dead code): CONFIRMED NOT DEAD — `ProgressBar` still used by `task-card.tsx` (studio tasks). Mischaracterized in original review.
- WARNING 5 (cross-loop drag): ACCEPTED — separate DndContext per loop enforces within-loop drag at runtime; group property not mutated on drag
- WARNING 6 ((item: any) cast): RESOLVED — removed explicit `(item: any)` annotation in `task-template-card.tsx:79`; TypeScript now infers from `TaskTemplateDto`
- DESIGN DOC UPDATE 7 (section 3.2 deferred features): RESOLVED — design doc section 3.2 mockup updated; deferred callout added for countdown timer and Mark Loop Complete button
- DESIGN DOC UPDATE 8 (Mermaid diagram): RESOLVED — `group: Loop 1` → `group: l1`, `activeGroup=Loop 1` → `activeGroup=l1` in section 2 Mermaid
- DESIGN DOC UPDATE 9 (section 3.1 "3/5 complete"): RESOLVED — ASCII mockup updated to show item count only; interaction rules bullet corrected
- SUGGESTION 10 (tests): PARTIAL — draft persistence tested; loop navigation/liveLoopId not directly tested
- SUGGESTION 11 (LoopMetadata duplication): RESOLVED — `live-preview.tsx` imports `LoopMetadata` from `./schema`, uses `Pick<LoopMetadata, 'id' | 'name'>` for `PreviewLoop`; `task-execution-sheet.tsx` imports `LoopMetadata` from `@/components/task-templates/builder/schema`, uses `Pick<LoopMetadata, 'id' | 'name'> & { durationMin?: number }` in filter predicate
- SUGGESTION 12 (commit messages): RESOLVED

## Cross-Loop Drag Behavior (Confirmed)
Each loop has its own `<DndContext>` with a `<SortableContext items={loopItems}>`. Dragging is scoped per-loop at the SortableContext level. handleDragEnd uses global `currentTemplate.items` for arrayMove indexing, but since items from other loops are not in the SortableContext's item list, cross-loop snapping cannot occur. Group property is preserved (no mutation on drag). Behavior is safe.

## Draft Persistence Architecture (New in ca16f8b)
- `TaskExecutionSheet`: uses `idb-keyval` for local draft persistence; key = `my_task_execution_draft:{taskId}`
- `StudioTaskActionSheet`: uses `idb-keyval` for local draft persistence; key = `studio_task_action_draft:{taskId}:{action}`
- Both persist `{ taskId, content, baseContent, baseVersion, updatedAt }` for stale detection
- `useDebounceCallback` used in `TaskExecutionSheetInner.handleFormChange` (300ms) to decouple form state from server auto-save loop
