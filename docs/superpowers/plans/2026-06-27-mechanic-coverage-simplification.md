# Mechanic Coverage `is_current` Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `current`/`stale`/`dropped` status enum on the mechanic→shows coverage endpoint with a single `is_current` boolean, remove the now-dead `frozen_revision`/`catalog_revision` fields, fix a redundant snapshot re-parse along the way, and surface the new signal as a "Status" column (Up to Date / Needs Update) in the frontend coverage table.

**Architecture:** No new files. Three existing files change: the backend service method `getMechanicCoverage` (logic + field shape), the shared Zod schema it serializes through, and the frontend route component that renders the response. Tests and two docs are updated to match.

**Tech Stack:** NestJS + Prisma (erify_api), Zod (`@eridu/api-types`), React + TanStack Table (erify_studios).

## Global Constraints

- Inclusion rule does not change: only shows whose authoritative task's frozen snapshot references this mechanic appear in `shows`. (Spec § "What stays the same")
- Authoritative task selection ("latest finalized task with a loop schema wins", `FINALIZED_LOOP_TASK_STATUSES`) does not change. (Spec § "What stays the same")
- `templates` array / `is_latest_carrying` does not change — out of scope. (Spec § "What stays the same")
- `getShowMechanicsCoverage` (show→mechanics direction) is not touched. (Spec § "Explicitly out of scope")
- No renaming of `getMechanicCoverage`, its route, or schema names. (Spec § "Explicitly out of scope")
- `is_current = true` when the template's latest version still carries the mechanic **and** the frozen instruction content matches the mechanic's current content revision; `false` otherwise. (Spec § "What changes")
- Badge copy: `is_current === true` → "Up to Date"; `is_current === false` → "Needs Update". (Conversation: labels confirmed)

---

### Task 1: Update the Zod schema — `status`/`frozen_revision`/`catalog_revision` → `is_current`

**Files:**
- Modify: `packages/api-types/src/client-mechanics/schemas.ts:108-120`
- Test: `apps/erify_api/src/models/client-mechanic/client-mechanic.service.spec.ts` (Task 3 updates the test that exercises this schema; no standalone schema unit test exists today, so this task itself has no independent test — schema correctness is verified by Task 3's `clientMechanicCoverageResponseSchema.parse(result)` assertion)

**Interfaces:**
- Produces: `mechanicCoverageShowSchema` with shape `{ uid: string, name: string, start_time: string, task_uid: string, template_uid: string | null, template_name: string | null, is_current: boolean }` — Task 2 (service) must return exactly this shape per row.

- [ ] **Step 1: Replace the schema fields**

In `packages/api-types/src/client-mechanics/schemas.ts`, find:

```ts
export const mechanicCoverageShowSchema = z.object({
  uid: z.string(),
  name: z.string(),
  start_time: z.string(),
  status: z.enum(['current', 'stale', 'dropped']),
  task_uid: z.string().nullable(),
  template_uid: z.string().nullable(),
  template_name: z.string().nullable(),
  frozen_revision: z.number().int().nullable(),
  catalog_revision: z.number().int(),
});
```

Replace with:

```ts
export const mechanicCoverageShowSchema = z.object({
  uid: z.string(),
  name: z.string(),
  start_time: z.string(),
  task_uid: z.string(),
  template_uid: z.string().nullable(),
  template_name: z.string().nullable(),
  is_current: z.boolean(),
});
```

- [ ] **Step 2: Typecheck the package**

Run: `pnpm --filter @eridu/api-types typecheck`
Expected: passes (this only changes a type literal; nothing in the package itself consumes the removed fields)

- [ ] **Step 3: Build the package**

Run: `pnpm --filter @eridu/api-types build`
Expected: passes — `dist/` regenerated with the new shape so downstream consumers (erify_api, erify_studios) pick it up

- [ ] **Step 4: Commit**

```bash
git add packages/api-types/src/client-mechanics/schemas.ts
git commit -m "feat(api-types): replace mechanic coverage status enum with is_current boolean"
```

---

### Task 2: Simplify `getMechanicCoverage` service logic

**Files:**
- Modify: `apps/erify_api/src/models/client-mechanic/client-mechanic.service.ts:324-388`
- Test: `apps/erify_api/src/models/client-mechanic/client-mechanic.service.spec.ts` (Task 3 writes the test for this — TDD order is test-then-code per project convention, but this task and Task 3 are interdependent on the same method; this plan writes the test first in Task 3's Step 1, then comes back to implement here per the step ordering below)

**Interfaces:**
- Consumes: `parseModeratorSnapshot(rawSchema: unknown): { items: SnapshotFieldItem[], loops: SnapshotLoop[] | null }` from `apps/erify_api/src/studios/studio-performance/schemas/moderator-snapshot.schema.ts` (unchanged, already imported in this file).
- Consumes: `mechanic.uid: string`, `mechanic.contentRevision: number` (already in scope from the method's earlier `mechanic` lookup).
- Consumes: `latestTemplateRefs: Map<string, Set<string>>` and `snapshotRefs: Map<string, Set<string>>` (already built earlier in the method — unchanged).
- Produces: `coverageShows: Array<{ uid: string, name: string, start_time: string, task_uid: string, template_uid: string | null, template_name: string | null, is_current: boolean }>` — must match Task 1's schema exactly.

This task and Task 3 (the spec test) are written together since they're the same unit of behavior. Work step-by-step in this order: write the test (Task 3 Steps 1-2), watch it fail, then implement here (this task's steps), then run the test again (Task 3 Steps 3-4). Do Task 3 Steps 1-2 first, then return here.

- [ ] **Step 1: Replace the `coverageShows` flatMap**

In `apps/erify_api/src/models/client-mechanic/client-mechanic.service.ts`, find the block starting at the comment `// 5. List only shows whose authoritative moderation task includes this mechanic.` (currently lines 324-388) and replace the entire `coverageShows` assignment with:

```ts
    // 5. List only shows whose authoritative moderation task includes this mechanic.
    const coverageShows = shows.flatMap((show) => {
      const showTasks = tasksByShowId.get(show.id.toString()) ?? [];

      // Find the latest finalized loop-bearing task, capturing its parsed
      // snapshot so we don't re-parse the same JSON below.
      let authoritativeTask: typeof showTasks[0] | null = null;
      let authoritativeItems: ReturnType<typeof parseModeratorSnapshot>['items'] = [];
      for (const t of showTasks) {
        const parsed = parseModeratorSnapshot(t.snapshot?.schema);
        if (parsed.loops !== null) {
          authoritativeTask = t;
          authoritativeItems = parsed.items;
          break;
        }
      }

      if (!authoritativeTask || !authoritativeTask.snapshotId || !authoritativeTask.templateId) {
        return [];
      }

      const snapshotIdKey = authoritativeTask.snapshotId.toString();
      const templateIdKey = authoritativeTask.templateId.toString();

      const hasSnapshotRef = snapshotRefs.get(snapshotIdKey)?.has(mechanic.uid) ?? false;
      if (!hasSnapshotRef) {
        return [];
      }

      const hasLatestRef = latestTemplateRefs.get(templateIdKey)?.has(mechanic.uid) ?? false;

      const item = authoritativeItems.find(
        (it: any) =>
          it.mechanic_ref
          && it.mechanic_ref.mechanic_id === mechanic.uid,
      );
      const frozenRevision = (item?.mechanic_ref as any)?.content_revision ?? null;

      const isCurrent = hasLatestRef && frozenRevision === mechanic.contentRevision;

      const templateName = authoritativeTask.template?.name ?? null;
      const templateUid = authoritativeTask.template?.uid ?? null;

      return [{
        uid: show.uid,
        name: show.name,
        start_time: show.startTime.toISOString(),
        task_uid: authoritativeTask.uid,
        template_uid: templateUid,
        template_name: templateName,
        is_current: isCurrent,
      }];
    });
```

This removes `status`, `frozenRevision`'s standalone second-parse (it now comes from `authoritativeItems`, captured once), `catalog_revision`, and replaces them with the single `isCurrent` boolean. `latestTemplateRefs`/`snapshotRefs`/`templateIds` stay as they were — both maps are still read.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter erify_api typecheck`
Expected: fails at this point if Task 3's test hasn't been updated yet (the test still asserts `status`/`frozen_revision`) — that's expected; proceed to Task 3 to finish the test update, then come back and re-run.

- [ ] **Step 3: Commit (after Task 3's test passes)**

```bash
git add apps/erify_api/src/models/client-mechanic/client-mechanic.service.ts
git commit -m "feat(erify_api): replace mechanic coverage status enum with is_current boolean"
```

(Run this commit step after Task 3 Step 4 confirms the test passes — see Task 3.)

---

### Task 3: Update `client-mechanic.service.spec.ts` for `is_current`

**Files:**
- Modify: `apps/erify_api/src/models/client-mechanic/client-mechanic.service.spec.ts:420-454`

**Interfaces:**
- Consumes: `service.getMechanicCoverage(studioUid, clientUid, mechanicUid, startDate, endDate)` returning `{ templates: MechanicCoverageTemplate[], shows: MechanicCoverageShow[] }` per Task 1's schema.

- [ ] **Step 1: Write the updated assertions (failing against the *old* implementation)**

In `apps/erify_api/src/models/client-mechanic/client-mechanic.service.spec.ts`, replace lines 425-453 (the block from `// Verify only shows...` through the two `not.toContain` assertions) with:

```ts
      // Verify only shows whose authoritative moderation task includes the mechanic are listed.
      expect(result.shows).toHaveLength(3);

      expect(result.shows[0]).toMatchObject({
        uid: 'show_101',
        is_current: true, // frozen revision (5) matches catalog (5), template still carries it
        task_uid: 'task_1',
        template_uid: 'ttpl_1',
      });

      expect(result.shows[1]).toMatchObject({
        uid: 'show_102',
        is_current: false, // frozen revision (4) behind catalog (5) -- formerly "stale"
        task_uid: 'task_2',
        template_uid: 'ttpl_1',
      });

      expect(result.shows[2]).toMatchObject({
        uid: 'show_104',
        is_current: false, // template_2's latest version no longer carries the mechanic -- formerly "dropped"
        task_uid: 'task_4',
        template_uid: 'ttpl_2',
      });

      expect(result.shows.map((show) => show.uid)).not.toContain('show_103');
      expect(result.shows.map((show) => show.uid)).not.toContain('show_105');
```

Also rename the test title at line 280 from `'returns templates and computes coverage statuses across shows'` to `'returns templates and computes is_current across shows'`.

- [ ] **Step 2: Run the test to verify it fails against the not-yet-updated service**

Run: `pnpm --filter erify_api test -- client-mechanic.service.spec.ts`
Expected: FAIL — `result.shows[0]` has `status: 'current'` not `is_current`, etc. (If Task 2 Step 1 was already applied, this instead passes — skip ahead.)

- [ ] **Step 3: Apply Task 2 Step 1 (the service implementation) if not already done**

See Task 2, Step 1, above.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter erify_api test -- client-mechanic.service.spec.ts`
Expected: PASS — all tests in this file green, including the existing `clientMechanicCoverageResponseSchema.parse(result)` regression check at line 423 (now validating against Task 1's updated schema).

- [ ] **Step 5: Run the full erify_api test suite to check for unrelated breakage**

Run: `pnpm --filter erify_api test`
Expected: PASS — no other spec file references `mechanicCoverageShowSchema`'s removed fields (confirmed during design research: `getShowMechanicsCoverage` uses a separate schema).

- [ ] **Step 6: Commit both the test and the service implementation together**

```bash
git add apps/erify_api/src/models/client-mechanic/client-mechanic.service.ts apps/erify_api/src/models/client-mechanic/client-mechanic.service.spec.ts
git commit -m "feat(erify_api): replace mechanic coverage status enum with is_current boolean"
```

---

### Task 4: Verify erify_api build

**Files:** none (verification-only task)

**Interfaces:** none — this task only runs commands.

- [ ] **Step 1: Lint**

Run: `pnpm --filter erify_api lint`
Expected: passes (no new lint violations introduced by Task 2's edit)

- [ ] **Step 2: Build**

Run: `pnpm --filter erify_api build`
Expected: passes

- [ ] **Step 3: Commit**

No commit needed — this task makes no file changes. If lint auto-fixed anything, `git status` will show it; if so, commit with:

```bash
git add -u apps/erify_api
git commit -m "style(erify_api): lint autofix"
```

---

### Task 5: Add the "Status" column to the coverage table

**Files:**
- Modify: `apps/erify_studios/src/routes/studios/$studioId/client-mechanics/$mechanicId.coverage.tsx:162-173`

**Interfaces:**
- Consumes: `row.original.is_current: boolean` from the API response (Task 1's schema, surfaced through `useMechanicCoverageQuery`).
- Consumes: `Badge` from `@eridu/ui` (already imported in this file, line 7-17).

- [ ] **Step 1: Add the column**

In `apps/erify_studios/src/routes/studios/$studioId/client-mechanics/$mechanicId.coverage.tsx`, find the `columns` memo's `task_uid` column (currently the last entry, lines 162-171):

```tsx
      {
        accessorKey: 'task_uid',
        header: 'Task',
        cell: ({ row }: any) => {
          const { task_uid } = row.original;
          return task_uid
            ? <span className="font-mono text-xs text-muted-foreground">{task_uid}</span>
            : <span className="text-muted-foreground">—</span>;
        },
      },
    ];
  }, [studioId]);
```

Add a new column immediately after it, inside the same array, before the closing `];`:

```tsx
      {
        accessorKey: 'task_uid',
        header: 'Task',
        cell: ({ row }: any) => {
          const { task_uid } = row.original;
          return task_uid
            ? <span className="font-mono text-xs text-muted-foreground">{task_uid}</span>
            : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'is_current',
        header: 'Status',
        cell: ({ row }: any) => {
          const { is_current } = row.original;
          return is_current
            ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Up to Date</Badge>
            : <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700">Needs Update</Badge>;
        },
      },
    ];
  }, [studioId]);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter erify_studios typecheck`
Expected: passes — `row.original` is typed `any` in this column definition (matches the existing pattern in this file), so no type error from the new field.

- [ ] **Step 3: Lint**

Run: `pnpm --filter erify_studios lint`
Expected: passes

- [ ] **Step 4: Manual verification**

Run: `pnpm dev:studios`, navigate to a studio's `/client-mechanics/:mechanicId/coverage` route for a mechanic with at least one covered show, and confirm the "Status" column renders an "Up to Date" or "Needs Update" badge per row matching the backend's `is_current` value (cross-check against the `getMechanicCoverage` response in the Network tab).

- [ ] **Step 5: Commit**

```bash
git add "apps/erify_studios/src/routes/studios/\$studioId/client-mechanics/\$mechanicId.coverage.tsx"
git commit -m "feat(erify_studios): show is_current as a Status badge on mechanic coverage table"
```

---

### Task 6: Verify erify_studios build

**Files:** none (verification-only task)

**Interfaces:** none.

- [ ] **Step 1: Test**

Run: `pnpm --filter erify_studios test`
Expected: passes — no existing test in this app asserts the old `status`/`frozen_revision`/`catalog_revision` fields on this route (confirmed during design research).

- [ ] **Step 2: Build**

Run: `pnpm --filter erify_studios build`
Expected: passes

- [ ] **Step 3: Commit**

No commit needed unless build/test produced file changes (it shouldn't). Skip.

---

### Task 7: Update `CLIENT_MECHANICS_MANAGEMENT.md`

**Files:**
- Modify: `apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md:105`
- Modify: `apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md:139`
- Modify: `apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md:141`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update the Snapshot & Coverage Rules section**

Find (line 105):

```
- A listed show is **current** when its frozen `content_revision` matches the catalog's current `content_revision`. **Stale** when the frozen revision is behind. **Dropped** when the template's latest version no longer carries the mechanic.
```

Replace with:

```
- A listed show carries `is_current: true` when its frozen `content_revision` matches the catalog's current `content_revision` **and** the template's latest version still carries the mechanic; `is_current: false` otherwise (covers both "content changed since" and "mechanic removed from template since" — both point to the same remediation: regenerate the task).
```

- [ ] **Step 2: Update the Coverage & Verification section**

Find (line 139):

```
- **Mechanic→shows**: for a mechanic, which templates reference it and whether its latest version still carries it; for each target show (date-ranged) whose authoritative task carries the mechanic, current / stale / dropped status.
```

Replace with:

```
- **Mechanic→shows**: for a mechanic, which templates reference it and whether its latest version still carries it; for each target show (date-ranged) whose authoritative task carries the mechanic, an `is_current` up-to-date/needs-update signal.
```

Find (line 141):

```
- Read-only for `ACCOUNT_MANAGER`. The actual fix for stale or dropped mechanics (regenerate the task from the latest snapshot) is an ADMIN/MANAGER action.
```

Replace with:

```
- Read-only for `ACCOUNT_MANAGER`. The actual fix for a show flagged `is_current: false` (regenerate the task from the latest snapshot) is an ADMIN/MANAGER action.
```

- [ ] **Step 3: Commit**

```bash
git add apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md
git commit -m "docs: describe mechanic coverage is_current signal in place of status enum"
```

---

### Task 8: Update `docs/features/client-mechanics.md`

**Files:**
- Modify: `docs/features/client-mechanics.md:26`
- Modify: `docs/features/client-mechanics.md:45`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update the "What Was Delivered" bullet**

Find (line 26, already updated once in PR #235's wrap-up to drop "unassigned"/"Flag to Manager" — this step replaces the remaining current/stale/dropped language):

```
- **Mechanic→shows coverage**: per mechanic, which templates reference it (and whether the latest version still does) and, for each target show whose authoritative moderation task actually carries the mechanic, whether content is **current / stale / dropped**; shows with no qualifying task are omitted from the list rather than shown as "unassigned" (20.6, simplified in #235).
```

Replace with:

```
- **Mechanic→shows coverage**: per mechanic, which templates reference it (and whether the latest version still does) and, for each target show whose authoritative moderation task actually carries the mechanic, a single **is_current** up-to-date signal; shows with no qualifying task are omitted from the list (20.6, simplified in #235 and again to a boolean signal in a follow-up).
```

- [ ] **Step 2: Update the Acceptance Record bullet**

Find (line 45):

```
- [x] Mechanic→shows coverage lists only shows whose authoritative moderation task carries the mechanic, resolving current/stale/dropped using frozen vs. current `contentRevision` and template-latest membership.
```

Replace with:

```
- [x] Mechanic→shows coverage lists only shows whose authoritative moderation task carries the mechanic, resolving a single `is_current` boolean from frozen vs. current `contentRevision` and template-latest membership.
```

- [ ] **Step 3: Commit**

```bash
git add docs/features/client-mechanics.md
git commit -m "docs: describe mechanic coverage is_current signal in place of status enum"
```

---

### Task 9: Full workspace verification

**Files:** none (verification-only task)

**Interfaces:** none.

- [ ] **Step 1: Lint all three workspaces**

Run: `pnpm --filter erify_api lint && pnpm --filter erify_studios lint && pnpm --filter @eridu/api-types lint`
Expected: all three pass

- [ ] **Step 2: Typecheck all three workspaces**

Run: `pnpm --filter erify_api typecheck && pnpm --filter erify_studios typecheck && pnpm --filter @eridu/api-types typecheck`
Expected: all three pass

- [ ] **Step 3: Test all three workspaces**

Run: `pnpm --filter erify_api test && pnpm --filter erify_studios test`
Expected: both pass (`@eridu/api-types` has no test script — confirmed during design research; skip)

- [ ] **Step 4: Build all three workspaces**

Run: `pnpm --filter @eridu/api-types build && pnpm --filter erify_api build && pnpm --filter erify_studios build`
Expected: all three pass (order matters: `@eridu/api-types` first since the other two consume its `dist/`)

- [ ] **Step 5: Grep for stray references to the removed fields**

Run: `grep -rn "frozen_revision\|catalog_revision" apps/erify_api/src apps/erify_studios/src packages/api-types/src --include="*.ts" --include="*.tsx"`
Expected: no matches (confirms no other file still reads the removed fields on this schema; note `getShowMechanicsCoverage`'s `showMechanicExpectedSchema` legitimately keeps its own `frozen_revision`/`catalog_revision` fields — this grep is scoped to confirm `mechanicCoverageShowSchema`'s removed fields specifically, so manually confirm any hit is in `show-mechanic` / `getShowMechanicsCoverage` code, not `getMechanicCoverage` code)

- [ ] **Step 6: No commit** — this task is verification-only.

---

## Self-Review Notes

- **Spec coverage**: Backend logic change (§ Backend changes) → Tasks 2-3. Schema change (§ Backend changes) → Task 1. Frontend badge (§ Frontend changes) → Task 5. Docs (§ Docs) → Tasks 7-8. Tests (§ Tests) → Task 3. Out-of-scope items (§ Explicitly out of scope) are not touched by any task — confirmed no task references `getShowMechanicsCoverage`, renames, or the date-picker logic.
- **Placeholder scan**: no TBD/TODO; all code steps show complete code.
- **Type consistency**: `is_current: boolean` is consistent across Task 1 (schema), Task 2 (service return shape), Task 3 (test assertions), and Task 5 (frontend `row.original.is_current`). `task_uid` is non-nullable consistently across Task 1 and Task 2.
