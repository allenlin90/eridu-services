# Design: Simplify Mechanic→Shows Coverage to a Listing + Up-to-Date Signal

> **Status**: Approved, pending implementation
> **Scope**: `getMechanicCoverage` (mechanic→shows direction only). Does not touch `getShowMechanicsCoverage` (show→mechanics direction), the client mechanics catalog, or the Loop × Mechanic matrix builder.
> **Context**: Follow-up to PR #235 ("Simplify client mechanic show coverage"), which removed the `unassigned` status and the Flag-to-Manager action from the UI but left the backend computing a `current`/`stale`/`dropped` status that no longer has a UI consumer and that the feature owner found confusing (specifically, "dropped" — a row stays in the list even when "dropped").

## Problem

The current `current`/`stale`/`dropped` status conflated two different drift signals (instruction content edited vs. mechanic removed from template) into a 3-way enum, while the underlying purpose of this view is simpler: list which shows have a moderation task that actually references this mechanic. The "dropped" label specifically read as if the row should be excluded, when in fact it meant "this task referenced the mechanic, but the live template definition has since dropped it" — a forward-looking signal, not an inclusion criterion. The frontend column for any of this was also removed in PR #235, leaving the backend computing a value with no consumer.

## What stays the same

- **Inclusion rule**: only shows whose authoritative task's frozen snapshot references this mechanic are listed. Shows with no qualifying task, or whose task snapshot doesn't carry a `mechanic_ref` to this mechanic, are omitted — not shown with a placeholder status.
- **Authoritative task selection**: unchanged — "latest finalized task with a loop schema wins" per show (`FINALIZED_LOOP_TASK_STATUSES`, shared with PR 22.1).
- **`templates` array / `is_latest_carrying`**: unchanged. Out of scope for this round.

## What changes

The 3-way `status` enum (`current` / `stale` / `dropped`) collapses into a single boolean `is_current`:

- `is_current = true` when the template's latest version still carries the mechanic **and** the frozen instruction content (captured in the task's snapshot) matches the mechanic's current content revision.
- `is_current = false` otherwise — covers both former "stale" (content edited since) and former "dropped" (mechanic removed from template since) cases. Both point to the same remediation: regenerate the task from the latest snapshot.

`frozen_revision` and `catalog_revision` are dropped from the response — they existed only to support the 3-way distinction and have no other consumer.

## Backend changes

### `apps/erify_api/src/models/client-mechanic/client-mechanic.service.ts` — `getMechanicCoverage`

- Authoritative-task selection loop: capture `{ loops, items }` together in one `parseModeratorSnapshot` call when the loop finds the task with non-null `loops`, instead of parsing once to find the task and again afterward to extract `items` for the frozen revision. This removes a redundant JSON re-parse per show flagged in prior review.
- Keep `latestTemplateRefs` (templateId → mechanic uids on the latest template version) and `snapshotRefs` (snapshotId → mechanic uids frozen into that snapshot) — both are still needed: `snapshotRefs` for the inclusion check, `latestTemplateRefs` for `is_current`.
- Inclusion: `hasSnapshotRef = snapshotRefs.get(snapshotId)?.has(mechanic.uid)`. If false, `return []` (show excluded).
- `is_current = hasLatestRef && frozenRevision === mechanic.contentRevision`, where `hasLatestRef = latestTemplateRefs.get(templateId)?.has(mechanic.uid)` and `frozenRevision` comes from the captured `items` (find the item whose `mechanic_ref.mechanic_id === mechanic.uid`).
- Returned row shape: `{ uid, name, start_time, task_uid, template_uid, template_name, is_current }` — no `status`, `frozen_revision`, `catalog_revision`.
- `task_uid` is no longer nullable (every returned row has a task by construction, since inclusion requires `hasSnapshotRef` which requires an authoritative task).

No repository changes — `findTemplateRefsForTemplatesAndSnapshots(templateIds, snapshotIds)` already returns both the "latest" and "snapshot-specific" ref rows needed.

### `packages/api-types/src/client-mechanics/schemas.ts` — `mechanicCoverageShowSchema`

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

(`template_uid`/`template_name` stay nullable — the task's template relation could be missing independent of the task itself.)

## Frontend changes

### `apps/erify_studios/src/routes/studios/$studioId/client-mechanics/$mechanicId.coverage.tsx`

Add a "Status" column to the "Shows Using This Mechanic" table (`columns` memo), positioned after the "Task" column:

- `is_current === true` → `<Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Up to Date</Badge>`
- `is_current === false` → `<Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700">Needs Update</Badge>`

No other UI changes — the date-picker draft-state logic, "Linked Templates" card, and page copy from PR #235 are untouched.

## Docs

- `apps/erify_studios/docs/CLIENT_MECHANICS_MANAGEMENT.md`: replace the current/stale/dropped description for the mechanic→shows direction with the `is_current` model.
- `docs/features/client-mechanics.md`: same update (this doc was already adjusted once in the PR #235 wrap-up to drop "unassigned"/"Flag to Manager" — this round replaces the remaining current/stale/dropped language with `is_current`).

## Tests

`apps/erify_api/src/models/client-mechanic/client-mechanic.service.spec.ts`:
- Replace status-string assertions (`status: 'current'`, `'stale'`, `'dropped'`) with `is_current: true` / `is_current: false` for the equivalent fixture cases (the former "stale" and "dropped" fixtures both become `is_current: false`).
- Keep the exclusion assertions (`show_103`, `show_105` not in the list) unchanged — inclusion rule didn't change.
- Verify the response still validates against `clientMechanicCoverageResponseSchema`.

## Explicitly out of scope

- Renaming `getMechanicCoverage`, its route, or schema names.
- Touching `getShowMechanicsCoverage` (show→mechanics direction) or its `current`/`stale`/`missing` status model.
- The duplicated "find authoritative task" loop between the two directions (pre-existing, not introduced by this change).
- The date-picker draft-state duplication across routes (pre-existing, not introduced by this change).
- Any new enforcement/gating tied to coverage status — coverage remains observational only.
