# Ideation: StudioShift / StudioShiftBlock Optimistic Versioning

> **Status**: Deferred from `feat/studio-shift-schedule` PR review, March 2026
> **Origin**: `feat/studio-shift-schedule` PR review, March 2026
> **Related**: [shift-schedule-pattern skill](../../.agent/skills/shift-schedule-pattern/SKILL.md)

## What

Add `version Int @default(1)` to `StudioShift` and `StudioShiftBlock` and expose `updateByIdWithVersionCheck` in `StudioShiftRepository` for optimistic locking. Currently, concurrent admin edits to the same shift resolve as last-write-wins with no conflict detection. `StudioCreator` already received this field in Phase 4.

## Why It Was Considered

- Optimistic locking (`version` field) is the project-universal pattern for preventing silent last-write-wins on concurrent edits.
- `StudioShift` and `StudioShiftBlock` are frequently edited entities — schedule management workflows can have concurrent edits from multiple admins.
- `StudioCreator` (studio_creators) already received this field in Phase 4, creating an inconsistency in the shift domain.

## Why It Was Deferred

1. The version field should be added in the next migration that already requires a schema change for this domain — not as a standalone migration.
2. Concurrent shift editing is not currently causing production incidents, so urgency is low.
3. Adding the field alone is not sufficient — `StudioShiftRepository` and `StudioShiftService` callers need to be updated to use version-guarded writes.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A concurrent shift edit causes a production data integrity issue (last-write-wins overwrites a valid change).
2. A schema migration for the shift domain is planned for another reason, making this a zero-cost addition.
3. The shift domain is selected for a capability expansion that introduces concurrent edit workflows.
4. A code audit identifies that shift mutation endpoints are missing version guards that exist on other entities.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Add `version Int @default(1)` to both `StudioShift` and `StudioShiftBlock` in the next migration that already requires a schema change for this domain. Do not create a standalone migration for this alone.
- Expose `updateByIdWithVersionCheck` in `StudioShiftRepository` following the same CAS pattern as `StudioCreatorRepository` (uses `updateMany` + `VersionConflictError` on `count === 0`).
- Update `StudioShiftService` callers that need version-guarded writes to use the new method.

### Pattern reference

Follow `StudioCreatorRepository.updateByIdWithVersionCheck` as the reference implementation. The CAS pattern:
1. Run `updateMany` with `WHERE id = ? AND version = ?`.
2. If `count === 0`, throw `VersionConflictError`.
3. The client retries by re-fetching the entity and re-applying the mutation with the latest version.
