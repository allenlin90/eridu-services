# Tech Debt: Applying a Held-Back Conflict Doesn't Write FK-Backed Field Changes

## Current Issue

`StudioShowManagementService.toShowUpdateData` (`apps/erify_api/src/studios/studio-show/studio-show-management.service.ts`) only maps plain scalar fields — `name`, `start_time`, `end_time`, `metadata` — from a held-back `show_fields` diff onto the `Show` update payload. The six FK-backed fields a diff can also carry (`client_id`, `studio_id`, `studio_room_id`, `show_type_id`, `show_status_id`, `show_standard_id`) are stored in the diff (as `{uid, name}` snapshots, per the stale-conflict `held_back` payload) but never resolved back to an internal id and written to the `Show` row.

A planner who applies a held-back conflict whose diff includes one of these FK fields gets an audit trail that says `outcome: 'applied'` and a `resolved` record referencing the snapshot's `new` value, but the `Show` row itself does not change for that field — only whatever scalar fields were also part of the same diff (if any) are actually written.

## Why It Matters

The resolution record is misleading for this specific field subset: it reads as "planner applied this change" when the FK-backed portion of the change was silently skipped. A planner backfilling a client/studio/room/type/status/standard correction via schedule publish + resolve would not see the correction land, with no error surfaced.

This is scoped narrowly on purpose — the documented common case for this feature is backfilling a creator/platform assignment or a name/time correction on an untouched past show, not reassigning a show's client or studio after the fact. Relation-level hold-backs (creators/platforms) are fully applied via `applyHeldBackRelations` and are unaffected by this gap.

## Desired Direction

Resolve each FK-backed field's snapshot `{uid, name}` value back to an internal id at apply time — the inverse of the write-time resolution `ScheduleConflictService.resolveHeldBackLabels` already performs — and include the resolved id in the `ShowUpdateData` passed to `showRepository.update`.

## Trigger To Fix

- A held-back conflict whose diff includes an FK-backed `show_fields` entry is actually applied in practice and the FK not landing causes a real workflow gap.
- `toShowUpdateData` / the apply flow is revisited for another reason.

## Acceptance Criteria

- Applying a held-back conflict whose diff includes an FK-backed `show_fields` entry writes that field's resolved internal id to the `Show` row, matching the snapshot's `new` value.
- The `resolved`/`applied` audit outcome accurately reflects that the full diff — scalar and FK-backed fields alike — was applied, not a partial subset.

## Related Context

[`apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md`](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md) § Stale Conflict Rule.
