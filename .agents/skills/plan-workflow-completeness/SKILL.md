---
name: plan-workflow-completeness
description: Audit multi-PR plans for missing workflow steps and incomplete cycles before phase or workstream sign-off.
---

# Plan Workflow Completeness

Ensures every actor has surfaces for every read and write in their journey. Run BEFORE the plan ships and BEFORE starting each task.

## When to Invoke

- Writing/revising an active implementation plan
- Reviewing a plan before sign-off
- Discovering a gap in a shipped task — audit the rest
- Phase-close: every plan must pass

## The Five Invariants

### 1. Actor Coverage
Every actor in the PRD has ≥1 surface (read or write) for every workflow step involving them. Build an actor × step matrix. Blank cells are gaps or intentional.

### 2. "Scoped Out" Has a Forwarding Address
Every "this does NOT include X" names the task that picks X up. No forwarding task → create a placeholder.

### 3. Every Snapshot Field Has an Edit Path
If plan persists a snapshot field → schedule: write path, edit path, UI surface. Missing edit path = "data we can't fix without admin script."

### 4. Read Views Paired with Writes
Every read view in the PRD has feeder writes scheduled. A view reading unwritten fields is unreachable.

### 5. Symmetry Across Parallel Entities
Entities sharing a pattern (snapshot + line items + actuals) share UX by default. Asymmetry requires written justification.

### 6. Correctness-Sensitive Follow-Ups Have a Design Gate
If a follow-up touches high-traffic lifecycle code, transactional publish loops, generic task assignment/completion, auth boundaries, or notification architecture, do not treat it as a small cleanup by default. Decide whether it is:

- safe implementation scope for this PR,
- accepted tech debt for a pre-existing gap,
- ideation/design work blocked on a larger mechanism, or
- a separate task with its own review plan.

Speculative seams with no functional consumer belong in ideation unless they remove an immediate, demonstrated coupling.

## How to Run

1. Read PRD + plan side-by-side; build actor-coverage matrix
2. For each scoped-out item, find forwarding address; list orphans
3. For each snapshot field, find write/edit/UI rows; list missing
4. For each read view, find feeder writes; list unreachable
5. For each parallel-entity pair, run symmetry diff; list unjustified asymmetries
6. Classify correctness-sensitive follow-ups as implementation, tech debt, ideation, or separate task
7. Produce single report: gaps, orphans, missing paths, unreachable views
8. Land fixes in plan before resuming implementation

## Common Failure Modes

- **Vertical-stack slicing** orphans input UX — cut by user journey instead
- **Read-view rhetoric without write rows** — verify each view has feeder writes
- **"Same as other entity" by default** — force the asymmetry question
- **DoD lists deliverables, not scenarios** — convert to actor-completes-journey
- **Cleanup PR reaches into lifecycle machinery** — pause for a design gate before changing publish loops, state gates, or generic task flows
- **No-op seam without a caller** — preserve the idea in ideation instead of adding speculative runtime surface

## Acceptance Criteria

- [ ] Every actor has surface for every relevant workflow step
- [ ] Every "does not include" has `Deferred to: Task N`
- [ ] Every snapshot field has write, edit, and UI rows
- [ ] Every read view has feeder writes scheduled
- [ ] Parallel entities: same UX or written asymmetry reason
- [ ] Correctness-sensitive follow-ups are classified before implementation
- [ ] Completion criteria are scenario-based
