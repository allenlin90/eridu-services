# Tech Debt

Known implementation gaps and cleanup issues that should be fixed, but are not product ideation topics.

Use this register for accepted risk, consistency gaps, migration cleanup, and refactor debt. Use [ideation](../ideation/README.md) for new product or architecture ideas that need discovery, decision gates, or PRD promotion.

## Lifecycle

1. Create a tech-debt doc when a review accepts an issue as follow-up instead of blocking the current PR.
2. Keep each entry concrete: affected surface, current behavior, desired behavior, risk, and trigger to fix.
3. Link from PR descriptions or review notes when a known issue is intentionally deferred.
4. When fixed, update or delete the entry in the same PR that resolves it.

## Active Issues

| Issue | Area | Trigger To Fix | Related Context |
| --- | --- | --- | --- |
| [`erify_studios` `pnpm typecheck` is a no-op](./erify-studios-typecheck-noop.md) | `erify_studios` build tooling — root `tsconfig.json` checks zero files | Touching `erify_studios` typecheck/build tooling, a frontend hardening pass, or the next bot/manual-caught type bug CI should have caught | — |
| [Admin Route Business Logic Bypass](./admin-route-business-logic-bypass.md) | `erify_api` admin mutations | Any admin mutation touches finance, assignment snapshots, actuals, lifecycle transitions, or cross-domain side effects | [Economics cost model](../domain/economics-cost-model.md), [Phase 4 remaining-work tracker](../roadmap/PHASE_4.md) |
| [`fact-extraction.service.ts` exceeds the file-size trigger](./fact-extraction-service-size.md) | `erify_api` fact-extraction pipeline | A fourth paired/hydrated extractor scope is added, or the file crosses ~1300 LOC | [fact-extraction-pipeline skill](../../.agents/skills/fact-extraction-pipeline/SKILL.md), [Phase 4 tracker](../roadmap/PHASE_4.md) |
| [Show-detail performance fields exposed to all members](./show-detail-performance-fields-all-members.md) | `erify_api` show detail authorization | Show-detail authz changes, more revenue facts added to detail, or product confirms whether per-platform GMV is manager-only | [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md), [PHASE_4.md](../roadmap/PHASE_4.md) |
| [erify_api hardening program — deferred work](./erify-api-refactor-residuals.md) | `erify_api` money util / BaseRepository tx / Sheets identity / naming | A finance feature touches the money services, a Money-type decision is made, a base-repository refactor is in scope, or the compensation slice is refactored | Hardening complete (PRs #157–#200); patterns/decisions in skills, this tracks deferred work only |
| [Studio↔client linkage gate unvalidated against real multi-studio data](./studio-client-linkage-single-studio-reality.md) | `erify_api` client-mechanic / task-template authorization — onboarding-sequencing gap and a one-way "once linked, never unlinked" ratchet | A second studio is onboarded, or any client relationship is ever reassigned away from a studio that previously held it | [CLIENT_MECHANICS_MANAGEMENT.md](../../apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md), [PHASE_6.md](../roadmap/PHASE_6.md) |
| [`AddStudioCreatorDialog` calls two async lookup hooks at the component level](./add-creator-dialog-dual-async-lookup-hooks.md) | `erify_studios` studio-creator-roster — `add-studio-creator-dialog.tsx` merged search/create dialog | A third dialog mode is added, or the unguarded catalog-query refetch during create mode causes an observed UX/rate-limit problem | [STUDIO_CREATOR_ONBOARDING.md](../../apps/erify_studios/docs/STUDIO_CREATOR_ONBOARDING.md), PR #225 |
| [`import-mc-list.ts` does not assign imported creators to a studio roster](./mc-list-import-script-no-roster-link.md) | `erify_api` scripts — one-off CSV importer writes `creators`/`users` but never `studio_creators` | The script (or a similar ad hoc roster-import script) is run again | PR #228 |
