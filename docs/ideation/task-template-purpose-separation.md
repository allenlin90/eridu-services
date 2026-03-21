# Ideation: Task Template Purpose Separation

> **Status**: Deferred from Phase 4/5 planning
> **Origin**: Phase 4/5 planning, March 2026
> **Related**: [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md), [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md)

## What

Separate task template views by purpose: regular operations templates and moderation templates. Align visibility and actions with the Phase 4 studio membership roles so each role sees only the templates relevant to their workflow.

## Why It Was Considered

- Template intent is mixed in the current single template list view, creating confusion between operational templates and moderation-specific templates.
- Moderation roles (MODERATION_MANAGER) should not see or interact with regular operational templates, and vice versa.
- Purpose separation improves template discoverability and reduces accidental misuse of wrong template types.

## Why It Was Deferred

1. The current single-studio, limited-role rollout has manageable template counts where mixing is not yet painful.
2. The purpose taxonomy (what exactly distinguishes a "regular" template from a "moderation" template) needs formal product definition.
3. Role-aware template filtering requires backend support (template purpose/category field) not currently in the schema.
4. UX changes to the template list would require careful design to avoid breaking existing manager workflows.

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. Template count grows to the point where mixing causes operational confusion or misuse.
2. A moderation role (MODERATION_MANAGER) needs a distinct template surface without cross-contamination from regular templates.
3. The purpose taxonomy (regular vs. moderation) is formally defined and approved by product.
4. Role-aware template visibility is required for a specific operational or compliance reason.

## Implementation Notes (Preserved Context)

### Deferred workstream TODOs

- Separate task-template views for regular templates and moderation templates.
- Align visibility/actions with Phase 4 studio membership roles.
- Keep role-aware UX/API behavior to avoid purpose leakage and confusion.

### Schema addition needed

A `purpose` or `category` field on `TaskTemplate` would be the minimal schema change required to support purpose-based filtering. The field should be an enum to prevent free-form categorization drift.
