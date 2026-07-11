# Tech Debt: Held-Back Creator/Platform Diffs Carry No Display Name

## Current Issue

`heldBackCreatorEntrySchema` and `heldBackPlatformEntrySchema` (`packages/api-types/src/shows/schemas.ts`) carry `creator_uid`/`platform_uid` as bare strings, with no accompanying `name`. This differs from `show_fields`' FK-backed values, which resolve to `{uid, name}` via `heldBackFkRefSchema`.

The `erify_studios` conflict review panel (`HeldBackDiff`, `apps/erify_studios/src/features/shows/components/held-back-diff.tsx`) renders exactly what the payload gives it — the creator/platform UID itself, not a human-readable name. A `creator_uid`/`platform_uid` is this codebase's standard external-ID format and is safe to display (it is not an internal DB id), but it is not something a planner reviewing a held-back diff can recognize at a glance.

## Why It Matters

A planner reviewing a held-back creator or platform change sees an identifier like `creator_a1b2c3` instead of the creator's or platform's name. The rest of the diff (old/new note, the show it's attached to) is still useful, but the row itself doesn't answer "which creator/platform is this?" without a separate lookup.

## Desired Direction

Resolve `creator_uid`/`platform_uid` to a display name (creator's name; platform's label) at the same point `ScheduleConflictService` already resolves `show_fields`' FK values, and add a `name`/`display_name` field to `heldBackCreatorEntrySchema`/`heldBackPlatformEntrySchema`, mirroring `heldBackFkRefSchema`.

## Trigger To Fix

- A studio reports the review panel's creator/platform rows are hard to identify in practice.
- The `held_back` payload shape or its resolution point (`ScheduleConflictService`) is revisited for another reason.

## Acceptance Criteria

- `show_creators[]`/`show_platforms[]` entries in the `held_back` payload include a resolved display name alongside the existing uid.
- `HeldBackDiff` renders that name instead of the bare uid.

## Related Context

[`apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md`](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md) § Stale Conflict Rule, [`apps/erify_studios/docs/STUDIO_SHOW_MANAGEMENT.md`](../../apps/erify_studios/docs/STUDIO_SHOW_MANAGEMENT.md) § Schedule Publish Impacts, [`schedule-conflict-apply-fk-fields-not-written.md`](./schedule-conflict-apply-fk-fields-not-written.md) — a related, narrower gap in the same `held_back` payload family.
