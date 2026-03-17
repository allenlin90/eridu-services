# Timezone Boundary Normalization (Task Reporting)

## Context

Task report preflight currently resolves date presets (`this_week`, `this_month`) and explicit date-only ranges using local server timezone day boundaries.

Current implementation examples:
- `apps/erify_api/src/models/task-report/task-report-scope.service.ts`
- `apps/erify_api/src/models/show/show.repository.ts` (similar local-boundary pattern)

Related existing signal:
- `apps/erify_api/src/models/task/task.repository.ts` already contains a TODO about normalizing date bounds with studio timezone.

## Problem / Tech Debt

Date-only range interpretation is runtime-environment dependent:

1. If app servers move from UTC+7 to UTC (or mixed regions), the same request payload can produce different DB filter boundaries.
2. Preset windows (`this_week`, `this_month`) are currently tied to server locale/timezone rather than studio/business timezone.
3. Multi-region deployment can create non-deterministic report results across environments.

This is acceptable short-term for current single-region assumptions, but it is a correctness risk for future infra changes.

## Impact

- Off-by-hours/day inclusion/exclusion at date boundaries.
- Report preflight counts can differ from user expectation when client timezone != server timezone.
- Harder reproducibility in tests and incident debugging.

## Proposed Direction (Promotion Scope)

1. Define a canonical timezone source for date-only business logic:
   - Preferred: studio-configured timezone.
   - Fallback: explicit application timezone (e.g. `Asia/Bangkok`) if studio timezone is unavailable.
2. Centralize date-boundary helpers (start/end of day, week, month) in a shared utility.
3. Convert date-only/preset inputs to absolute UTC instants before repository queries.
4. Apply same utility across task reporting, show listing, and task query filters.
5. Add deterministic tests that assert behavior independent from host machine timezone.

## Decision Gates

Promote this ideation item when any of the following is true:

1. Infra plan includes multi-region or timezone changes.
2. Product requires studio-level timezone correctness.
3. Boundary mismatch bug is reported for reporting/show/task filters.

## Interim Status

- Known issue accepted for current phase.
- Track as technical debt until timezone normalization utility is introduced.
