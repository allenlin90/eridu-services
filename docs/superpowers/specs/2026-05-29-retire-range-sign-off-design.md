# Design: Retire Range Sign-Off, Refine Show Run Review to Filter + Export

> **Date**: 2026-05-29 · **Status**: Approved (design) · **Author**: brainstorming session
> **Affects**: PR 12.4.x operations review surface (`/show-run-review`)

## 1. Problem & decision

PR 12.4.5 shipped a manager "range sign-off" action ([#114](https://github.com/allenlin90/eridu-services/pull/114)). Investigation found it has **no downstream consumer**: nothing reads the `SIGN_OFF` audit row to gate, notify, export, or feed compensation. It is a write-only attestation that does not even freeze the data it attests (the summary stores exception *counts*, not the show set, and nothing blocks later edits). The PRD's own §5 defers every feature that would give it meaning (settlement gating, write-freeze, notifications, recipient acknowledgement) to Phase 5.

Product decision (confirmed): **there is no consumer — the action is vanity.** What the surface should actually be is *filter → quick-sight → export*. Therefore:

- **Remove** the sign-off feature entirely (forward change; git history is the only record we keep — no "reverted" markers in the roadmap).
- **Add** current-view export to `/show-run-review` so it becomes a real reporting tool.
- 12.4.6 (manager override + zero-fact / binding-drift warnings, [#118](https://github.com/allenlin90/eridu-services/pull/118)) is **independent and kept**.

## 2. Goals / non-goals

**Goals**
- Delete all sign-off write/UI/endpoint surface and the `SIGN_OFF` audit action.
- `/show-run-review` remains the filtered, read-only operational summary from 12.4.4.
- Export the **full filtered result set** of each tab to CSV (not just the visible page).

**Non-goals** (unchanged, stay Phase 5 / out of scope)
- Settlement / compensation gating, write-freeze, grace windows.
- Notifications, recipient acknowledgement, dispute defense.
- Scope-freezing any attestation. No new backend aggregation or export endpoint.

## 3. Delivery: two PRs

### PR B1 — Remove range sign-off

Confirmed safe to **hard-remove** the `SIGN_OFF` enum value: no sign-off audit rows exist in any environment (confirmed by product). `audit.action` is a plain string column and `auditActionSchema` validates audit *reads* (`auditApiResponseSchema`, `auditTimelineEntrySchema`), so this is only safe because no historical rows reference it.

**Backend (`erify_api`)**
- `show-orchestration.service.ts`: delete `signOffShowRunReview`; remove the `sign_off` block compiled into `getShowRunReviewSummary` (the `findSignOff` lookup + `sign_off` response field).
- `studio-show.controller.ts`: delete the `POST /studios/:studioId/shows/run-review/sign-off` route and its imports.
- `audit.repository.ts`: delete `findSignOff` and `lockSignOffRange`.
- `audit.service.ts`: revert the zero-target waiver — `create` requires ≥1 target again (no caller needs the waiver after sign-off is gone; verify no other zero-target caller exists before reinstating the invariant).
- Remove sign-off cases from `*.spec.ts` (`show-orchestration.service.spec.ts`, `studio-show.controller.spec.ts`, `audit.repository.spec.ts`).

**api-types**
- `audits/schemas.ts`: remove `'SIGN_OFF'` from `auditActionSchema`.
- `shows/schemas.ts` + `shows/types.ts`: remove `signOffShowRunReviewInputSchema`, its type, and the `sign_off` field from the run-review summary schema/type.

**Frontend (`erify_studios`)**
- `show-run-review/components/show-run-summary.tsx`: remove the signed-off / "Sign-Off Pending" banner and the "Sign Off Range" dialog + manager-gating wiring.
- Delete `shows/api/sign-off-show-run-review.ts` (mutation hook + cache invalidation).
- `routes/studios/$studioId/show-run-review.tsx`: drop sign-off imports/wiring.
- `lib/get-show-run-review-error-message.ts`: drop the sign-off fallback branch added in 12.4.5 if now unused.

**Schema**
- `prisma/schema.prisma`: remove `SIGN_OFF` from the `Audit.action` doc comment. No migration (string column, no DB enum, no rows).

**Keep**: the `database-patterns` skill's advisory-lock-on-hashed-composite-key lesson — it is a generic pattern, valid independent of this consumer.

### PR B2 — Current-view export on Show Run Review (new roadmap row 12.4.7)

Add an **Export CSV** affordance to each of the four tabs (creators / violations / tasks / shows) in `show-run-summary.tsx`.

- **Architecture reality**: the four tabs are **server-side paginated** via dedicated endpoints — `GET /studios/:studioId/shows/run-review/{creators,violations,tasks,shows}` — each returning `PaginatedResponse<T>` (query: `page`, `limit` default 10 / min 1 / **no max**, plus `search` / `status` / `severity` / `completeness`). The client therefore holds only the current page, not the full filtered set. (The separate `GET …/run-review` summary endpoint returns full arrays for the count cards, but the tab tables do **not** read it.)
- **Scope of export — the key requirement**: serialize **every row matching the tab's active filters**, not the visible page. Mechanism: **high-limit refetch** (chosen). On Export click, call the *same* tab endpoint with the *same* active filter params and `limit = total` (the `total` already returned by that tab's current paginated query), `page = 1`; serialize the returned `items`. No backend change. The set is bounded by the existing 31-day range cap, consistent with the backend's in-memory aggregation design. If `total === 0`, no-op (disable the button).
- **Reuse**: `serializeRowsToCsv({ rows, columns })` + `CsvColumn` from `@/lib/csv` and `triggerBrowserDownload({ content, mimeType, filename })` from `@/lib/file-download`. Rows must be `Record<string, string>`, so each tab needs a row-mapper that flattens its typed row to string cells. Per-tab `CsvColumn` list. Filename `show-run-<tab>-<date_from>_<date_to>.csv`.
- **Loading/disabled state**: the Export button shows a pending state during the refetch and is disabled while fetching or when `total === 0`. Reuse the existing per-tab fetch hook with explicit params (do not mutate the table's paginated query key).
- **Optional, in-scope-if-cheap refinement**: `show-run-summary.tsx` is ~1,056 lines. Removing the sign-off block (B1) plus adding export is a natural moment to extract each tab's table + export into a small focused component. Keep this light; do not refactor unrelated code.

## 4. Roadmap / PRD bookkeeping (clean removal, no "reverted" noise)

- **`docs/roadmap/PHASE_4.md`**:
  - Remove the 12.4.5 row from the Remaining/PR table and the 12.4.5 bullet from the **Shipped** section.
  - Update the Operations Review narrative (the "PR 12.4.x first lights up…" / upstream-of-economics section) and the **Mandated Reusable Widgets** `ShowRunSummary` description to drop "signed-off" language — the surface summarizes submitted/extracted facts and exports them; it does not sign off.
  - Reword 12.4.6's **Depends on** from `PR 12.4.5` → `PR 12.4.4`.
  - Add row **12.4.7 — Show Run Review current-view export** (Depends on PR 12.4.4).
  - Refresh the header `Remaining` count / `Next`.
- **`docs/prd/task-fact-binding.md` §C**:
  - Remove the `PR 12.4.5 · Range Sign-Off Audit` subsection.
  - Add a `PR 12.4.7 · Show Run Review Export` subsection (export full filtered set per tab).
  - Adjust §C intro ("…manage anomalies, and log operational sign-offs") to drop the sign-off clause.

Numbering note: the export row is **12.4.7** (not a reused 12.4.5) so it never collides with git history that ties "12.4.5" to the sign-off PR (#114). A gap at 12.4.5 is accepted.

## 5. Testing

- **B1**: removal is verified by deletion of sign-off specs + the full suites staying green (no dangling refs). Add no new tests; confirm `grep -r SIGN_OFF` returns only git history.
- **B2**: unit-test the per-tab export row/column mapping and that it serializes the **filtered** set (e.g. given N rows + a filter that matches M<N, the CSV has M data rows), reusing the `@/lib/csv` test style.

## 6. Verification gates (per PR)

```bash
pnpm --filter @eridu/api-types typecheck && pnpm --filter @eridu/api-types build
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
pnpm sherif
```

## 7. Risks

- **Hard-removing `SIGN_OFF`** breaks audit reads *iff* a row exists. Mitigation: product confirmed none exist; add a one-line check (`SELECT count(*) FROM audits WHERE action='SIGN_OFF'`) before shipping B1 to any environment with real data.
- **Export filter/pagination mismatch**: the tabs are server-paginated, so the page holds ≪ the filtered total. Export must refetch with `limit = total` and the same filters — the plan must assert the exported row count equals `total`, not the page size.
- **Unbounded `limit`**: the tab endpoints enforce no max `limit`. The 31-day range cap bounds the underlying set, so a `limit = total` refetch is acceptable; if abuse becomes a concern later, add a server max as a follow-up (option (b)).
- **Large component churn**: keep the optional extraction minimal to avoid coupling deletion with a broad refactor in one review.
