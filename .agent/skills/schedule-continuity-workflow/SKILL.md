---
name: schedule-continuity-workflow
description: Feature workflow for schedule planning continuity. Use when implementing or reviewing schedule update/validate/publish behavior, Google Sheets planning integration, and pending-resolution handling.
---

# Schedule Continuity Workflow

Schedule continuity across `erify_api`, `erify_studios`, and Google Sheets integration.

## Canonical Feature Docs

1. `apps/erify_api/docs/SCHEDULE_CONTINUITY.md`
2. `apps/erify_api/docs/SCHEDULE_PLANNING.md`
3. `docs/features/studio-show-management.md`
4. `docs/prd/future/studio-schedule-management.md`

## Baseline Behavior

1. Flow: `update → validate → publish`
2. Publish is identity-preserving diff+upsert (no delete-all/recreate)
3. Removed shows with active tasks → `cancelled_pending_resolution`
4. Removed shows without active tasks → `cancelled`
5. Reappearing shows (matched by `(client_id, external_id)`) restored in place

**Current boundary**: diff+upsert, summary counters, and restore are shipped. Studio-scoped pending-resolution resolve endpoint/queue/CTA not fully shipped.

## Phase 4 Product Direction

- Schedules are **grouping/date-range containers first**, planning artifacts second
- `status` is a client-communication signal, not an operational gate or write lock
- Studio-native schedules (1f) are operationally active from creation — publish not required to start work
- `published` = billing/audit milestone, not execution prerequisite
- **Two distinct publish paths** (don't conflate): Google Sheets sync vs studio-native snapshot

## Implementation Rules

1. Preserve same-studio assignment boundaries and external-identity checks
2. Preserve same-client schedule boundaries (show ↔ schedule client must match)
3. Do NOT block same-studio show reassignment solely because target schedule isn't `draft`
4. Keep publish-time continuity: diff by `(client_id, external_id)`, preserve show identity and task linkage
5. Model finance/settlement separately — don't fold into schedule `status`

## Operational Day Boundary

Show membership determined by **operational day**: if `startTime` local < 06:00, operational day = previous calendar day.

**Timezone**: 06:00 cutoff is studio-local time. Studio timezone not yet modeled — deferred. Do NOT use ambient server timezone as approximation.

## Checklist

- [ ] Show identity preserved across republish
- [ ] Task targets remain linked for matched shows
- [ ] Removed shows: active tasks → `cancelled_pending_resolution`, else → `cancelled`
- [ ] Reappearing shows restored in place
- [ ] Same-studio CRUD not blocked by schedule status
- [ ] Same-client schedule linkage preserved
- [ ] External API uses `id`/`external_id` (not UIDs)
- [ ] New semantics don't overload schedule `status`

## Related Skills

- [shift-schedule-pattern](../shift-schedule-pattern/SKILL.md) — Shift CRUD and calendar
- [show-production-lifecycle](../show-production-lifecycle/SKILL.md) — owns `cancelled_pending_resolution` as a show lifecycle state; this skill's automated transition is the entry point the lifecycle's pending-resolution workflow (manual trigger, resolution owner, disposition) builds on
