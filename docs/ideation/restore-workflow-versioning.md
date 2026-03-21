# Ideation: Restore Workflow with Optimistic Versioning

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [soft-delete-restore skill](../../.agent/skills/soft-delete-restore/SKILL.md), [shift-optimistic-versioning.md](./shift-optimistic-versioning.md)

## What

Standardize restore behavior across soft-deleted records (starting with task templates) while preserving optimistic versioning semantics. Define whether restore increments the version, how restore handles stale client versions, and who can restore by role. Add restore API endpoints and UX for restorable records.

## Why It Was Considered

- Soft delete exists in multiple areas, but restore behavior is inconsistently handled — some records have no restore path at all.
- Task templates are the highest-priority restore candidate: accidentally deleted templates block operators from submitting tasks.
- Optimistic versioning must be considered during restore to prevent stale-client overwrites.
- A formal restore workflow improves operational resilience and reduces admin intervention for accidental deletions.

## Why It Was Deferred

1. Accidental deletion of soft-deleted records has not caused a production incident requiring restore.
2. Restore semantics with optimistic versioning need careful design: does restore increment version? Does it require latest-version precondition?
3. Permission model for restore (who can restore by role, when restore should be blocked by dependencies) has not been defined.
4. The list/filter behavior for deleted/restorable records needs UX design.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. A task template (or other critical soft-deleted record) is accidentally deleted and there is no restore path.
2. Operations request a "recycle bin" or restore UI for managing soft-deleted records.
3. The permission model for restore operations is formally defined as part of a role-policy update.
4. Optimistic versioning is standardized across all entities and restore is the remaining gap in the version consistency story.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Evaluate restore support for task templates first, then other soft-deleted records.
- Define optimistic-versioning behavior during restore:
  - whether restore increments version,
  - how restore handles stale clients/version conflicts,
  - whether restore requires latest-version precondition.
- Analyze workflow and permission model:
  - who can restore by role,
  - when restore should be blocked (dependencies, replaced records, policy constraints),
  - expected audit trail for restore events.
- Define API and UX contract candidates:
  - restore endpoint/payload shape,
  - list/filter behavior for deleted/restorable records,
  - user feedback for conflict/retry paths.

### Skill reference

The `.agent/skills/soft-delete-restore/SKILL.md` covers the restore workflow pattern for soft-deleted records, including version behavior, dependency checks, repository, service, and controller patterns. Use this as the implementation guide when promoted.
