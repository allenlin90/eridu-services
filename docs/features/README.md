# Feature Docs

Shipped feature specifications — promoted from PRDs when features are implemented. Each document captures the product-level view: the problem, users, key decisions, and acceptance record.

**This is not the technical reference.** Technical implementation lives in `apps/*/docs/`. Feature docs answer "why does this exist and who uses it"; app-local docs answer "how does it work under the hood."

> Temporary exception: this folder also retains a small number of archived deferred references when a workstream was implemented on a non-`master` branch and then deferred before merge. Those references are listed separately below and are not shipped features.

## Lifecycle

```
PRD (docs/prd/)   →  [feature ships]  →  Feature doc (docs/features/)
```

When a feature ships:
1. Update its PRD status to Shipped and move it here
2. Check off acceptance criteria
3. Add links to the canonical technical docs
4. Delete the original PRD

## Versioning Convention (Schema Redesigns)

Most features stay as a single flat file. **When a feature undergoes a schema redesign that introduces an incompatible v2** (the underlying contract changes shape, not just adds fields), promote the doc to a folder:

```
docs/features/
├── task-templates.md                  ← single-version feature, stays a flat file
└── task-templates/                    ← multi-version feature, promoted to a folder
    ├── README.md                      ← describes the current/latest version (the entry point)
    ├── v1.md                          ← historical version, frozen at retirement date
    ├── v2.md                          ← (optional) standalone v2 description if README.md cross-cuts versions
    └── shared/                        ← optional: cross-version context that applies to both
```

Rules:

- The folder's `README.md` is the canonical entry point — external links should target the folder, not a specific version file.
- `vN.md` files are **frozen** when their version retires. Add a `> Status: Retired YYYY-MM-DD — superseded by v(N+1)` header when archiving.
- Single-version features stay as flat `<feature>.md` files. Don't preemptively promote to a folder.
- The trigger for promotion is "schema redesign with incompatible storage/projection semantics," not "any non-trivial edit."

Run [.agent/workflows/feature-version-cutover.md](../../.agent/workflows/feature-version-cutover.md) when a redesign reaches the cutover point. That workflow decides whether to update in place (compatible change) or split into v1/v2 (incompatible change), and ensures cross-checks across all related docs and skills.

## Shipped Features

| Feature                                                                  | Phase        | Canonical Docs                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [RBAC Roles](./rbac-roles.md)                                            | Phase 4      | [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md)                                                                                                                                            |
| [Creator Mapping](./creator-mapping.md)                                  | Phase 4      | No per-feature design doc retained                                                                                                                                                                                                                |
| [Studio Creator Roster](./studio-creator-roster.md)                      | Phase 4      | [Backend reference](../../apps/erify_api/docs/STUDIO_CREATOR_ROSTER.md), [Frontend reference](../../apps/erify_studios/docs/STUDIO_CREATOR_ROSTER.md)                                                                                             |
| [Studio Member Roster](./studio-member-roster.md)                        | Phase 4      | [API types](../../packages/api-types/src/memberships/schemas.ts), [BE controller](../../apps/erify_api/src/studios/studio-membership/studio-members.controller.ts), [FE route](../../apps/erify_studios/src/routes/studios/$studioId/members.tsx) |
| [Task Templates](./task-templates.md)                                    | Foundational | [BE summary](../../apps/erify_api/docs/TASK_MANAGEMENT_SUMMARY.md), [FE summary](../../apps/erify_studios/docs/TASK_MANAGEMENT_SUMMARY.md), [Moderation loop workflow](../../apps/erify_studios/docs/MODERATION_WORKFLOW.md)                      |
| [Task Submission Reporting](./task-submission-reporting.md)              | Phase 4      | [BE design](../../apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md), [FE canonical](../../apps/erify_studios/docs/TASK_SUBMISSION_REPORTING.md)                                                                                                   |
| [Studio Creator Onboarding](./studio-creator-onboarding.md)              | Phase 4      | [BE canonical](../../apps/erify_api/docs/STUDIO_CREATOR_ONBOARDING.md), [FE canonical](../../apps/erify_studios/docs/STUDIO_CREATOR_ONBOARDING.md)                                                                                                |
| [Studio Show Management](./studio-show-management.md)                    | Phase 4      | [BE canonical](../../apps/erify_api/docs/STUDIO_SHOW_MANAGEMENT.md), [FE canonical](../../apps/erify_studios/docs/STUDIO_SHOW_MANAGEMENT.md)                                                                                                      |
| [Internal Knowledge Base (`eridu_docs`)](./eridu-docs-knowledge-base.md) | Phase 4      | [Auth design](../../apps/eridu_docs/docs/AUTH_DESIGN.md)                                                                                                                                                                                          |

