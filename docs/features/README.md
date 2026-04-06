# Feature Docs

Shipped feature specifications — promoted from PRDs when features are implemented. Each document captures the product-level view: the problem, users, key decisions, and acceptance record.

**This is not the technical reference.** Technical implementation lives in `apps/*/docs/`. Feature docs answer "why does this exist and who uses it"; app-local docs answer "how does it work under the hood."

## Lifecycle

```
PRD (docs/prd/)   →  [feature ships]  →  Feature doc (docs/features/)
```

When a feature ships:
1. Update its PRD status to Shipped and move it here
2. Check off acceptance criteria
3. Add links to the canonical technical docs
4. Delete the original PRD

## Shipped Features

| Feature | Phase | Canonical Docs |
| --- | --- | --- |
| [RBAC Roles](./rbac-roles.md) | Phase 4 | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md) |
| [Show Economics](./show-economics.md) | Phase 4 | [BE design](../../apps/erify_api/docs/design/SHOW_ECONOMICS_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/SHOW_ECONOMICS_DESIGN.md) |
| [Creator Mapping](./creator-mapping.md) | Phase 4 | No per-feature design doc retained |
| [Studio Creator Roster](./studio-creator-roster.md) | Phase 4 | [Backend reference](../../apps/erify_api/docs/STUDIO_CREATOR_ROSTER.md), [Frontend reference](../../apps/erify_studios/docs/STUDIO_CREATOR_ROSTER.md) |
| [Studio Member Roster](./studio-member-roster.md) | Phase 4 | [API types](../../packages/api-types/src/memberships/schemas.ts), [BE controller](../../apps/erify_api/src/studios/studio-membership/studio-members.controller.ts), [FE route](../../apps/erify_studios/src/routes/studios/$studioId/members.tsx) |
| [Task Submission Reporting](./task-submission-reporting.md) | Phase 4 | [BE design](../../apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md), [FE canonical](../../apps/erify_studios/docs/TASK_SUBMISSION_REPORTING.md) |
| [Studio Creator Onboarding](./studio-creator-onboarding.md) | Phase 4 | [BE canonical](../../apps/erify_api/docs/STUDIO_CREATOR_ONBOARDING.md), [FE canonical](../../apps/erify_studios/docs/STUDIO_CREATOR_ONBOARDING.md) |
| [Studio Show Management](./studio-show-management.md) | Phase 4 | [BE canonical](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md), [FE canonical](../../apps/erify_studios/docs/STUDIO_SHOW_MANAGEMENT.md) |
| [Internal Knowledge Base (`eridu_docs`)](./eridu-docs-knowledge-base.md) | Phase 4 | [Auth design](../../apps/eridu_docs/docs/AUTH_DESIGN.md) |
