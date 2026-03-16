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

| Topic | Origin | Decision Gates | Related Docs |
|-------|--------|----------------|--------------|
| [Task Analytics Summaries](./task-analytics-summaries.md) | Task submission reporting design review | Product requirement for numeric aggregation in review workspace | [BE design](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md), [FE design](../../apps/erify_studios/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md) |
| [BullMQ Async Processing](./bullmq-async-processing.md) | Task submission reporting design review | P95 generation > 5s, HTTP timeout, or row cap removal | [BE design §4.11](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md) |
| [Submitted-At State Machine](./submitted-at-state-machine.md) | Task submission reporting design review | Need for precise submission timestamps beyond `status` + `updatedAt` | [BE design §4.8](../../apps/erify_api/docs/design/TASK_SUBMISSION_REPORTING_DESIGN.md) |

## Dropped / Promoted Topics

| Topic | Disposition | Date | Notes |
|-------|------------|------|-------|
| *(none yet)* | | | |
