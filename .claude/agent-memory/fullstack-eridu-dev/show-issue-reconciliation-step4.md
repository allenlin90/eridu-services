---
name: show-issue-reconciliation-step4
description: Phase 5 item 9 step 4 (automated ShowIssue reconciliation) implementation notes — signal channel, module wiring, severity default, test harness
metadata:
  type: project
---

Implemented 2026-08-02 on `feat/show-issue-reconciliation-backend` (merged
onto `integration/show-issue-ownership` / PR #357). Design doc:
`apps/erify_api/docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md`.

**Key files**: `apps/erify_api/src/show-issue-orchestration/show-issue-reconciliation.service.ts`
(+ `.types.ts`, `-severity-normalization.ts`), extended
`FactExtractionProcessor.applyAndAudit` (reconciliation runs AFTER the
extraction audit write, inside the SAME `@Transactional()` method — no new
transaction boundary), `ExtractionDecision`'s `write` variant now carries
optional `signals?: ShowIssueReconciliationSignal[]`.

**Decisions the design doc left open** (record here so a future reader
doesn't re-derive them):
- Automated `CREATOR_ATTENDANCE` issue severity defaults to `'HIGH'` — the
  design doc has no severity policy for attendance issues (only for platform
  violations). Titles (`'Creator attendance missing'`,
  `'Platform violation detected'`) are also my choice, not spec'd.
- A `RESOLVED` automated issue with a resolution code OTHER than
  `SOURCE_CORRECTED` (i.e. a human manually closed an auto-created issue) is
  treated as untouchable by reconciliation forever after — no auto-reopen,
  no evidence refresh, no re-resolve. Only `SOURCE_CORRECTED` is reconciler-
  owned state; anything else is a deliberate manual action that must survive
  replay/correction signals.
- `ShowPlatformViolationSummary` (in `show-platform-violation.service.ts`)
  gained an `id: bigint` field — `createMany` doesn't return created rows,
  so `replaceForTaskField` now does a follow-up `findByUids` keyed on the
  client-generated `uid`s it just wrote, to hand the extractor the internal
  id needed to key a `ShowIssue.showPlatformViolationId` without a redundant
  read at the extractor call site.

**Test harness gotcha**: the real-DB integration spec
(`test/integration/show-issue-reconciliation.integration-spec.ts`) declares
a throwaway `@Module` with `providers: [FactExtractionProcessor, ...]` but
NO `exports` — a root-level `Test.createTestingModule({imports:[thatModule]})`
provider (the transaction-rollback probe) cannot inject anything from an
imported module unless that module explicitly re-exports it. Cost real
debugging time; the existing `show-issue-persistence.integration-spec.ts`
avoided this because its probe only depended on the orchestration module's
OWN already-exported service.

**Don't re-touch**: steps 1–3 (model/manual-workflow/frontend tab) are
settled per [[show-issue-ownership-implementation]]. Step 5 (Show Run Review
counts) is explicitly out of scope; `show-run-review.service.ts` untouched.
