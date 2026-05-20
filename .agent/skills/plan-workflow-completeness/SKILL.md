---
name: plan-workflow-completeness
description: Audit a multi-PR implementation plan for workflow-and-cycle gaps before it ships. Use when writing or revising any transient implementation plan, or when a phase or workstream is being signed off.
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

## How to Run

1. Read PRD + plan side-by-side; build actor-coverage matrix
2. For each scoped-out item, find forwarding address; list orphans
3. For each snapshot field, find write/edit/UI rows; list missing
4. For each read view, find feeder writes; list unreachable
5. For each parallel-entity pair, run symmetry diff; list unjustified asymmetries
6. Produce single report: gaps, orphans, missing paths, unreachable views
7. Land fixes in plan before resuming implementation

## Common Failure Modes

- **Vertical-stack slicing** orphans input UX — cut by user journey instead
- **Read-view rhetoric without write rows** — verify each view has feeder writes
- **"Same as other entity" by default** — force the asymmetry question
- **DoD lists deliverables, not scenarios** — convert to actor-completes-journey

## Acceptance Criteria

- [ ] Every actor has surface for every relevant workflow step
- [ ] Every "does not include" has `Deferred to: Task N`
- [ ] Every snapshot field has write, edit, and UI rows
- [ ] Every read view has feeder writes scheduled
- [ ] Parallel entities: same UX or written asymmetry reason
- [ ] Completion criteria are scenario-based
