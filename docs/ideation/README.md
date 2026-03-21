# Ideation

Deferred ideas, investigations, and optimization topics with preserved reasoning context. Each document captures the full analysis behind a deferral so that future phases can make informed promote-or-drop decisions without re-deriving the context.

## Lifecycle

```
Identified during design/review
   ↓
docs/ideation/<topic>.md          ← full reasoning, constraints, decision gates
   ↓ (promoted to phase)
docs/prd/<feature>.md             ← rewritten as PRD for the active phase
   ↓ (shipped)
docs/features/<feature>.md        ← promoted to feature doc, ideation doc deleted
```

### Rules

1. **Create** an ideation doc when a design review or investigation identifies a topic worth preserving but not worth building now.
2. **Include** the full reasoning: why it was considered, why it was deferred, what would trigger promotion, and any constraints or prerequisites.
3. **Cross-check** ideation docs during design, investigation, and review phases using the [ideation-lifecycle workflow](../../.agent/workflows/ideation-lifecycle.md).
4. **Promote** to a PRD when the topic is selected for an active phase. Rewrite as a fresh PRD — do not copy the ideation doc verbatim.
5. **Delete** the ideation doc when its topic is either promoted to a PRD or permanently dropped. Record the disposition in this README.
6. **Never accumulate stale ideation docs.** If a topic has been sitting for 2+ phases without promotion, it should be reviewed and either refreshed or dropped.

## Active Topics

| Topic                                                                                 | Origin                                              | Decision Gates                                                                              | Related Docs                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Task Analytics Summaries](./task-analytics-summaries.md)                             | Task submission reporting design review             | Product requirement for numeric aggregation in review workspace                             | [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)                     |
| [BullMQ Async Processing](./bullmq-async-processing.md)                               | Task submission reporting design review             | P95 generation > 5s, HTTP timeout, or row cap removal                                       | [BE design §4.11](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)                                                                                                      |
| [Submitted-At State Machine](./submitted-at-state-machine.md)                         | Task submission reporting design review             | Need for precise submission timestamps beyond `status` + `updatedAt`                        | [BE design §4.8](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md)                                                                                                       |
| [Show Planning Export](./show-planning-export.md)                                     | Operations workflow ideation                        | Stable pre-show export contract, Google Sheets replacement signal, or shared export-engine extraction readiness | [Task reporting PRD](../../docs/prd/task-submission-reporting.md), [Business domain](../../docs/domain/BUSINESS.md)                                                                         |
| [JSON Schema for Document-Based Records](./document-record-json-schema.md)            | Task template + task report definition schema audit | Non-HTTP validation needs, schema-versioned JSON docs, or more `z.any()` document contracts | [task template schema](../../packages/api-types/src/task-management/task-template.schema.ts), [task report schema](../../packages/api-types/src/task-management/task-report.schema.ts)       |
| [Full Frontend i18n Standardization](./frontend-i18n-paraglide.md)                    | Tech debt audit for Paraglide usage                 | Official multi-region support requirement or UI audit/polish phase                          | [i18n skill](../../.agent/skills/frontend-i18n/SKILL.md)                                                                                                                                     |
| [erify_studios console.error Cleanup](./studios-console-error-cleanup.md)             | PR #16 task reporting review                        | UI polish pass, Sentry integration, or mutateAsync → mutate refactor                       | [report-builder.tsx](../../apps/erify_studios/src/features/task-reports/components/report-builder.tsx), [definitions-viewer.tsx](../../apps/erify_studios/src/features/task-reports/components/task-report-definitions-viewer.tsx) |

## Dropped / Promoted Topics

| Topic        | Disposition | Date | Notes |
| ------------ | ----------- | ---- | ----- |
| erify_studios Route Query Optimization | Implemented | 2026-03-21 | Implemented directly without PRD: route loaders added to builder + show-tasks routes, duplicate source query eliminated, lookup queries lifted for prefetch compatibility. Pattern documented in `frontend-api-layer` skill. |
