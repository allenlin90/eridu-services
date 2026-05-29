# Retire Range Sign-Off + Show Run Review Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the no-consumer range sign-off feature (12.4.5) entirely, and add a current-view CSV export to the four `/show-run-review` tabs that exports the full filtered set, not the current page.

**Architecture:** Two independent PRs. **B1** is a coordinated cross-package deletion (api-types contract + erify_api service/controller/audit + erify_studios UI) committed together because the pieces don't compile independently. **B2** adds client-side CSV export per tab via a high-limit refetch of the existing server-paginated endpoints (no backend change).

**Tech Stack:** NestJS + Prisma (erify_api), Zod contracts (`@eridu/api-types`), React + TanStack Query + Vitest (erify_studios), Jest (erify_api).

**Spec:** [`docs/superpowers/specs/2026-05-29-retire-range-sign-off-design.md`](../specs/2026-05-29-retire-range-sign-off-design.md)

---

## File structure

**B1 — removal (modify/delete):**
- `packages/api-types/src/audits/schemas.ts` — drop `'SIGN_OFF'` from `auditActionSchema`.
- `packages/api-types/src/shows/schemas.ts` — delete `signOffDetailsSchema`, `signOffShowRunReviewInputSchema`, and the `sign_off` field on `showRunReviewSummarySchema`.
- `packages/api-types/src/shows/types.ts` — drop `SignOffDetails` / `SignOffShowRunReviewInput` exports + their import.
- `apps/erify_api/src/show-orchestration/show-orchestration.service.ts` — delete the `sign_off` block in `getShowRunReviewSummary`, the `signOffShowRunReview` method, and the now-unused imports.
- `apps/erify_api/src/studios/studio-show/studio-show.controller.ts` — delete the `POST run-review/sign-off` route, `SignOffShowRunReviewDto`, and now-unused imports.
- `apps/erify_api/src/models/audit/audit.service.ts` — delete `findSignOff` + `lockSignOffRange`; revert the `create` zero-target waiver.
- `apps/erify_api/src/models/audit/audit.repository.ts` — delete `findSignOff` + `lockSignOffRange`.
- `apps/erify_api/prisma/schema.prisma` — drop `SIGN_OFF` from the `Audit.action` doc comment.
- `apps/erify_studios/src/features/show-run-review/components/show-run-summary.tsx` — remove the sign-off banner/dialog/handlers.
- `apps/erify_studios/src/features/shows/api/sign-off-show-run-review.ts` — **delete file.**
- `apps/erify_studios/src/routes/studios/$studioId/show-run-review.tsx` — remove sign-off wiring.
- Spec files: remove the matching cases from `*.spec.ts` / `*.test.ts`.

**B2 — export (create/modify):**
- `apps/erify_studios/src/features/show-run-review/lib/show-run-review-csv.ts` — **create**: per-tab `CsvColumn` lists + row mappers (typed row → `Record<string,string>`) + `exportShowRunReviewTab` helper.
- `apps/erify_studios/src/features/show-run-review/lib/__tests__/show-run-review-csv.test.ts` — **create**: unit tests.
- `apps/erify_studios/src/features/shows/api/get-show-run-review-paginated.ts` — reuse the existing `getShowRunReview{Creators,Violations,Tasks,Shows}` fetchers for the high-limit refetch (no change unless a thin `fetchAll` wrapper helps).
- `apps/erify_studios/src/features/show-run-review/components/show-run-summary.tsx` — add per-tab Export buttons.

**B3 — docs:**
- `docs/roadmap/PHASE_4.md`, `docs/prd/task-fact-binding.md`.

---

## PHASE B1 — Remove range sign-off (one PR)

> Deletion spans api-types → erify_api → erify_studios and does not compile in partial states, so B1 is one coordinated task with a single commit. Edit in the order below (contract last-consumed-first is impossible here; edit producers and consumers together, then run gates once).

### Task 1: Remove all sign-off code

**Files:** all "B1 — removal" files above.

- [ ] **Step 1: Remove the api-types contract**

In `packages/api-types/src/audits/schemas.ts`, delete the `'SIGN_OFF',` line from `auditActionSchema` so it reads:

```ts
export const auditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'OVERRIDE',
  'SKIPPED_LOWER_PRIORITY',
]);
```

In `packages/api-types/src/shows/schemas.ts`, delete `signOffDetailsSchema` and `signOffShowRunReviewInputSchema` entirely, and remove the `sign_off: signOffDetailsSchema.nullable(),` field from `showRunReviewSummarySchema`.

In `packages/api-types/src/shows/types.ts`, remove `signOffShowRunReviewInputSchema` / `signOffDetailsSchema` from the import block and delete the `SignOffDetails` and `SignOffShowRunReviewInput` type exports.

- [ ] **Step 2: Remove erify_api service code**

In `apps/erify_api/src/show-orchestration/show-orchestration.service.ts`:
- Remove `SignOffDetails` and `SignOffShowRunReviewInput` from the `@eridu/api-types/shows` import on line 7.
- In `getShowRunReviewSummary`, delete the `const signOffAudit = await this.auditService.findSignOff(...)` lookup, the entire `const sign_off = signOffAudit ? {...} : null;` block, and the `sign_off,` property from the returned object.
- Delete the whole `signOffShowRunReview(...)` method.
- After deletion, remove any now-unused constructor deps / imports (`auditService`, `userService`, `HttpError`) **only if** nothing else in the file uses them — let typecheck (Step 6) flag unused symbols.

- [ ] **Step 3: Remove erify_api controller + audit model code**

In `apps/erify_api/src/studios/studio-show/studio-show.controller.ts`:
- Change the import on line 17 to `import { showRunReviewSummarySchema } from '@eridu/api-types/shows';` (drop `signOffShowRunReviewInputSchema`).
- Delete the `export class SignOffShowRunReviewDto ...` line.
- Delete the entire `@Post('run-review/sign-off') ... async signOff(...) {...}` method.
- Remove now-unused imports (`auditApiResponseSchema`, `CurrentUser`, `AuthenticatedUser`, `HttpStatus`) only if unused elsewhere — typecheck will flag.

In `apps/erify_api/src/models/audit/audit.service.ts`:
- Delete the `findSignOff` and `lockSignOffRange` methods.
- Revert the `create` guard to:

```ts
if (!payload.targets || payload.targets.length === 0) {
  throw HttpError.badRequest('Audit requires at least one target');
}
```

In `apps/erify_api/src/models/audit/audit.repository.ts`:
- Delete the `findSignOff` and `lockSignOffRange` methods (and any imports they alone used, e.g. the advisory-lock raw helper).

- [ ] **Step 4: Schema comment + frontend**

In `apps/erify_api/prisma/schema.prisma`, remove `| "SIGN_OFF"` from the `Audit.action` doc comment. (No migration — `action` is a free string column.)

In `apps/erify_studios/src/features/show-run-review/components/show-run-summary.tsx`:
- Remove the `import { useSignOffShowRunReview } from '@/features/shows/api/sign-off-show-run-review';` line.
- Remove `const { mutate: signOff, isPending } = useSignOffShowRunReview(studioId);` and the `handleSignOff` function.
- Remove the `{data.sign_off ? (...signed-off card...) : (...Sign-Off Pending banner with dialog...)}` JSX block entirely.
- Remove any remaining references to `data.sign_off`, `signOff`, `isPending` from sign-off, and the now-unused `toast` / `getShowRunReviewErrorMessage` imports **if** unused after removal (typecheck/lint will flag).

Delete the file `apps/erify_studios/src/features/shows/api/sign-off-show-run-review.ts`.

In `apps/erify_studios/src/routes/studios/$studioId/show-run-review.tsx`, remove any sign-off import/prop wiring added in 12.4.5.

- [ ] **Step 5: Remove sign-off tests**

Delete the sign-off `describe`/`it` blocks from:
- `apps/erify_api/src/show-orchestration/show-orchestration.service.spec.ts`
- `apps/erify_api/src/studios/studio-show/studio-show.controller.spec.ts`
- `apps/erify_api/src/models/audit/audit.repository.spec.ts`

(Search each for `sign`/`SIGN_OFF` and remove only those cases.)

- [ ] **Step 6: Verify no dangling references + gates green**

Run:
```bash
grep -rn "SIGN_OFF\|signOff\|sign_off\|lockSignOffRange\|findSignOff\|SignOffDetails" apps/ packages/ --include="*.ts" --include="*.tsx" --include="*.prisma" | grep -v "/dist/"
```
Expected: **no output** (only git history retains it).

Then:
```bash
pnpm --filter @eridu/api-types typecheck && pnpm --filter @eridu/api-types build
pnpm --filter erify_api    typecheck && pnpm --filter erify_api    lint && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios typecheck && pnpm --filter erify_studios lint && pnpm --filter erify_studios test && pnpm --filter erify_studios build
pnpm sherif
```
Expected: all pass.

- [ ] **Step 7: Pre-ship data safety check**

Before this lands in any environment with real data, confirm zero historical rows:
```sql
SELECT count(*) FROM audits WHERE action = 'SIGN_OFF';
```
Expected: `0`. (If non-zero, STOP — switch to the spec's option (a) "tolerate-on-read" instead of hard-removing the enum value.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(show-run-review): remove range sign-off (no consumer)"
```

---

## PHASE B2 — Show Run Review current-view export (one PR, roadmap 12.4.7)

### Task 2: CSV column maps + row mappers + export helper

**Files:**
- Create: `apps/erify_studios/src/features/show-run-review/lib/show-run-review-csv.ts`
- Test: `apps/erify_studios/src/features/show-run-review/lib/__tests__/show-run-review-csv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';

import type { ShowRunReviewCreatorException } from '@/features/shows/api/get-show-run-review-paginated';
import {
  CREATOR_CSV_COLUMNS,
  exportShowRunReviewCreators,
  toCreatorCsvRow,
} from '../show-run-review-csv';

const sample: ShowRunReviewCreatorException = {
  show_creator_uid: 'shc_1',
  creator_name: 'Alice',
  show_name: 'Morning Show',
  show_start_time: '2026-05-20T01:00:00.000Z',
  status: 'LATE',
  late_minutes: 12,
  reason: 'traffic',
};

describe('toCreatorCsvRow', () => {
  it('flattens a typed row to string cells for every column', () => {
    const row = toCreatorCsvRow(sample);
    for (const col of CREATOR_CSV_COLUMNS) {
      expect(typeof row[col.key]).toBe('string');
    }
    expect(row.creator_name).toBe('Alice');
    expect(row.late_minutes).toBe('12');
    expect(row.reason).toBe('traffic');
  });

  it('renders null reason as empty string', () => {
    expect(toCreatorCsvRow({ ...sample, reason: null }).reason).toBe('');
  });
});

describe('exportShowRunReviewCreators', () => {
  it('serializes ALL provided rows (not a page) and triggers a download', () => {
    const download = vi.fn();
    const rows = Array.from({ length: 200 }, (_, i) => ({ ...sample, show_creator_uid: `shc_${i}` }));

    exportShowRunReviewCreators(rows, { dateFrom: '2026-05-20', dateTo: '2026-05-20', download });

    expect(download).toHaveBeenCalledTimes(1);
    const arg = download.mock.calls[0][0];
    // header + 200 data rows
    expect(arg.content.split('\r\n')).toHaveLength(201);
    expect(arg.filename).toBe('show-run-creators-2026-05-20_2026-05-20.csv');
    expect(arg.mimeType).toContain('text/csv');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter erify_studios test -- show-run-review-csv`
Expected: FAIL — `Cannot find module '../show-run-review-csv'`.

- [ ] **Step 3: Implement the helper module**

Create `apps/erify_studios/src/features/show-run-review/lib/show-run-review-csv.ts`:

```ts
import type {
  ShowRunReviewCreatorException,
  ShowRunReviewShow,
  ShowRunReviewTask,
  ShowRunReviewViolation,
} from '@/features/shows/api/get-show-run-review-paginated';
import { type CsvColumn, serializeRowsToCsv } from '@/lib/csv';
import { triggerBrowserDownload } from '@/lib/file-download';

type CsvRow = Record<string, string>;
const s = (v: string | number | null | undefined): string => (v === null || v === undefined ? '' : String(v));

export type ShowRunReviewExportTab = 'creators' | 'violations' | 'tasks' | 'shows';

type ExportOptions = {
  dateFrom: string;
  dateTo: string;
  // Injectable for tests; defaults to the real browser download.
  download?: (params: { content: string; mimeType: string; filename: string }) => void;
};

const CSV_MIME = 'text/csv;charset=utf-8;';

function fileName(tab: ShowRunReviewExportTab, dateFrom: string, dateTo: string): string {
  return `show-run-${tab}-${dateFrom}_${dateTo}.csv`;
}

function runExport<TRow extends CsvRow>(
  tab: ShowRunReviewExportTab,
  rows: TRow[],
  columns: CsvColumn<TRow>[],
  { dateFrom, dateTo, download = triggerBrowserDownload }: ExportOptions,
): void {
  const content = serializeRowsToCsv({ rows, columns });
  download({ content, mimeType: CSV_MIME, filename: fileName(tab, dateFrom, dateTo) });
}

// --- creators ---
export const CREATOR_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'creator_name', label: 'Creator' },
  { key: 'show_name', label: 'Show' },
  { key: 'show_start_time', label: 'Show Start' },
  { key: 'status', label: 'Status' },
  { key: 'late_minutes', label: 'Late (min)' },
  { key: 'reason', label: 'Reason' },
];

export function toCreatorCsvRow(r: ShowRunReviewCreatorException): CsvRow {
  return {
    creator_name: s(r.creator_name),
    show_name: s(r.show_name),
    show_start_time: s(r.show_start_time),
    status: s(r.status),
    late_minutes: s(r.late_minutes),
    reason: s(r.reason),
  };
}

export function exportShowRunReviewCreators(rows: ShowRunReviewCreatorException[], opts: ExportOptions): void {
  runExport('creators', rows.map(toCreatorCsvRow), CREATOR_CSV_COLUMNS, opts);
}

// --- violations ---
export const VIOLATION_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'platform_name', label: 'Platform' },
  { key: 'show_name', label: 'Show' },
  { key: 'show_start_time', label: 'Show Start' },
  { key: 'violation_type', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'reason', label: 'Reason' },
  { key: 'observed_at', label: 'Observed At' },
];

export function toViolationCsvRow(r: ShowRunReviewViolation): CsvRow {
  return {
    platform_name: s(r.platform_name),
    show_name: s(r.show_name),
    show_start_time: s(r.show_start_time),
    violation_type: s(r.violation_type),
    severity: s(r.severity),
    reason: s(r.reason),
    observed_at: s(r.observed_at),
  };
}

export function exportShowRunReviewViolations(rows: ShowRunReviewViolation[], opts: ExportOptions): void {
  runExport('violations', rows.map(toViolationCsvRow), VIOLATION_CSV_COLUMNS, opts);
}

// --- tasks ---
export const TASK_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'description', label: 'Task' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'show_name', label: 'Show' },
];

export function toTaskCsvRow(r: ShowRunReviewTask): CsvRow {
  return {
    description: s(r.description),
    type: s(r.type),
    status: s(r.status),
    show_name: s(r.show_name),
  };
}

export function exportShowRunReviewTasks(rows: ShowRunReviewTask[], opts: ExportOptions): void {
  runExport('tasks', rows.map(toTaskCsvRow), TASK_CSV_COLUMNS, opts);
}

// --- shows ---
export const SHOW_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'shows_range', label: 'Shows' },
  { key: 'actuals_completeness', label: 'Completeness' },
  { key: 'status', label: 'Status' },
];

export function toShowCsvRow(r: ShowRunReviewShow): CsvRow {
  return {
    shows_range: s(r.shows_range),
    actuals_completeness: s(r.actuals_completeness),
    status: s(r.status),
  };
}

export function exportShowRunReviewShows(rows: ShowRunReviewShow[], opts: ExportOptions): void {
  runExport('shows', rows.map(toShowCsvRow), SHOW_CSV_COLUMNS, opts);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter erify_studios test -- show-run-review-csv`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/erify_studios/src/features/show-run-review/lib/show-run-review-csv.ts apps/erify_studios/src/features/show-run-review/lib/__tests__/show-run-review-csv.test.ts
git commit -m "feat(show-run-review): add CSV export helpers for run-review tabs"
```

### Task 3: Wire per-tab Export buttons (high-limit refetch)

**Files:**
- Modify: `apps/erify_studios/src/features/show-run-review/components/show-run-summary.tsx`

- [ ] **Step 1: Add an export handler per tab**

For each tab, add an `onClick` that fetches the full filtered set then calls the matching helper. Use the tab's existing fetcher (`getShowRunReviewCreators` etc.) with the **same active filter params** and `limit = total`, where `total` comes from that tab's current paginated query result (`creatorsQuery.data?.pagination.total` — match the actual field on `PaginatedResponse`). Example for creators:

```tsx
import {
  getShowRunReviewCreators,
  // ...existing imports
} from '@/features/shows/api/get-show-run-review-paginated';
import { exportShowRunReviewCreators } from '@/features/show-run-review/lib/show-run-review-csv';

const [isExportingCreators, setIsExportingCreators] = useState(false);

const handleExportCreators = async () => {
  const total = creatorsQuery.data?.pagination.total ?? 0;
  if (total === 0) {
    return;
  }
  setIsExportingCreators(true);
  try {
    const all = await getShowRunReviewCreators(studioId, {
      date_from: search.date_from,
      date_to: search.date_to,
      page: 1,
      limit: total,
      search: search.creators_search,
      status: search.creators_status,
    });
    exportShowRunReviewCreators(all.items, {
      dateFrom: search.date_from,
      dateTo: search.date_to,
    });
  } finally {
    setIsExportingCreators(false);
  }
};
```

Repeat the same shape for violations (`severity`), tasks (`status`), and shows (`completeness`) using their fetchers, helpers, and filter params. (Confirm the exact `PaginatedResponse` total accessor in `@/lib/api/admin` before wiring — use whatever the existing pagination handlers read.)

- [ ] **Step 2: Add the Export button to each tab's toolbar**

Place a button next to each tab's search/filter controls:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleExportCreators}
  disabled={isExportingCreators || (creatorsQuery.data?.pagination.total ?? 0) === 0}
>
  {isExportingCreators ? 'Exporting…' : 'Export CSV'}
</Button>
```

(Use the existing `Button` import already in the file. Mirror placement of the existing per-tab toolbar.)

- [ ] **Step 3: Verify gates**

Run:
```bash
pnpm --filter erify_studios typecheck && pnpm --filter erify_studios lint && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```
Expected: all pass.

- [ ] **Step 4: Manual verification**

Start the app, open `/studios/:id/show-run-review` for a range with >1 page of creator exceptions, apply a status filter, click **Export CSV**, and confirm the downloaded file contains **all** filtered rows (count matches the tab's `total`), not just the visible page.

- [ ] **Step 5: Commit**

```bash
git add apps/erify_studios/src/features/show-run-review/components/show-run-summary.tsx
git commit -m "feat(show-run-review): export full filtered set per tab as CSV"
```

---

## PHASE B3 — Roadmap + PRD bookkeeping

> Land B3 in whichever PR makes sense (B1 for the removal-related edits, B2 for the export row). Clean removal — no "reverted" markers.

### Task 4: Update PHASE_4.md and the PRD

**Files:**
- Modify: `docs/roadmap/PHASE_4.md`
- Modify: `docs/prd/task-fact-binding.md`

- [ ] **Step 1: PHASE_4.md**
  - Remove the `12.4.5` row from the Remaining PR table and the `✅ PR 12.4.5 — Range sign-off audit` bullet from the **Shipped** section.
  - In the **Operations Review** narrative (the "PR 12.4.x first lights up…" / upstream-of-economics paragraph) and the **Mandated Reusable Widgets** `ShowRunSummary` line, remove "signed-off" language — describe the surface as summarizing and **exporting** submitted/extracted facts.
  - Change 12.4.6's **Depends on** cell from `PR 12.4.5` to `PR 12.4.4`.
  - Add a row: `| 12.4.7 | Show Run Review current-view export — export the full filtered set of each run-review tab (creators / violations / tasks / shows) to CSV. | PR 12.4.4 | 🔲 Planned | — |`.
  - Refresh the header line `Remaining` count and `Next`.

- [ ] **Step 2: PRD task-fact-binding.md §C**
  - Delete the `#### 🟨 PR 12.4.5 · Range Sign-Off Audit` subsection.
  - In the §C intro sentence, drop the "and log operational sign-offs" clause.
  - Add `#### 🟨 PR 12.4.7 · Show Run Review Export` with: "Export the full filtered result set of each run-review tab to CSV (high-limit refetch of the paginated endpoints; client-side serialization; no new endpoint)."

- [ ] **Step 3: Verify + commit**

```bash
grep -rn "sign-off\|sign off\|Sign-Off\|SIGN_OFF" docs/roadmap/PHASE_4.md docs/prd/task-fact-binding.md
```
Expected: no remaining sign-off references (except where unrelated). Then:
```bash
git add docs/roadmap/PHASE_4.md docs/prd/task-fact-binding.md
git commit -m "docs: drop range sign-off, add show-run-review export (12.4.7)"
```

---

## Self-review notes

- **Spec coverage:** B1 removal (api-types/erify_api/erify_studios/prisma/tests) → Task 1; export full-filtered-set via high-limit refetch → Tasks 2–3; roadmap/PRD clean removal → Task 4. Pre-ship `SIGN_OFF` row check → Task 1 Step 7.
- **Pagination accessor caveat:** the exact `total` accessor on `PaginatedResponse` (`.pagination.total` vs `.total`) must be confirmed against `@/lib/api/admin` and the existing pagination handlers in `show-run-summary.tsx` before wiring Task 3 — the plan flags this explicitly rather than guessing.
- **Type consistency:** helper names (`exportShowRunReview{Creators,Violations,Tasks,Shows}`, `to*CsvRow`, `*_CSV_COLUMNS`) are used identically in Task 2's test, Task 2's implementation, and Task 3's wiring.
