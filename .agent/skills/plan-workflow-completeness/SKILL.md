---
name: plan-workflow-completeness
description: Audit a multi-PR implementation plan for workflow-and-cycle gaps before it ships. Use when writing or revising any plan under `docs/superpowers/plans/`, or when a phase or workstream is being signed off. Catches: orphaned input surfaces, un-edited snapshot fields, missing per-perspective read views, asymmetric UX across parallel entities, and "scoped out" deferrals with no forwarding address. Pairs with `superpowers:writing-plans`.
---

# Plan Workflow Completeness

`superpowers:writing-plans` covers *how* to break a spec into PRs. This skill covers *what makes a plan complete*: does every actor have surfaces for every read and write in their journey, or are there orphaned bits of work that will be discovered at code review or worse, after merge?

Run this skill BEFORE the plan ships and BEFORE starting each task. The cost of finding a gap during planning is a paragraph edit; the cost of finding it during implementation is a follow-up PR; the cost of finding it after merge is a workflow that doesn't close for the user.

## When to invoke

- Writing a new plan under `docs/superpowers/plans/`
- Revising an existing plan when scope changes
- Reviewing a sibling or upstream's plan before sign-off
- Discovering a gap in a shipped task — run the audit on the rest of the plan to find peer gaps
- Phase-close: every plan in the phase must pass before the phase is marked done

## The five invariants

A complete plan satisfies all of these. Failing any one is a planning bug, not a code bug.

### 1. Actor coverage

Every actor named in the PRD has at least one surface — read or write — for every workflow step that involves them. Build a matrix:

| Actor | Workflow step 1 | Step 2 | ... | Step N |
| --- | --- | --- | --- | --- |
| Admin | read+write | ... | | |
| Manager | read | read+write | | |
| Talent Manager | — | read | | |
| Operator | — | — | write | |

Blank cells are intentional or are gaps. Gaps must be filled or explicitly deferred with a forwarding address (see invariant 2).

### 2. "Scoped out" has a forwarding address

Any task that says "this does NOT include X" must name the task that picks X up. Example:

> Task 5 does **not** implement show actuals, SHOW line-item UI, ...
> **Deferred to:** Task 9 (show actuals input), Task 10 (per-perspective review).

If the forwarding task does not yet exist, create a placeholder task in the same plan. Orphaned deferrals are how workflows go missing for entire phases.

### 3. Every snapshot field has an edit path

If the plan persists a snapshot field (`agreedRate`, `hourlyRate`, etc.), the plan must also schedule:

- The **write path** that creates the snapshot (assignment endpoint or default-resolution logic).
- The **edit path** that updates the snapshot after creation (manager override, with audit append).
- The **UI surface** that exposes the edit path to its role.

A snapshot-on-write entity without a post-creation edit path produces "data we can't fix without an admin script." That's a planning bug.

### 4. Read views are paired with the writes that produce their data

If the plan defines N read views (per-show, per-creator, per-member, dashboard), the writes that feed each view must be scheduled in the same plan (or an explicit upstream plan). A view that reads a field nothing in the plan writes is unreachable.

When the PRD lists "three read views," the plan must name three rows that schedule the writes for each, and one row per view for the read endpoint + UI surface.

### 5. Symmetry by default across parallel entities

If two entities share an architectural pattern (e.g., `ShowCreator` and `StudioShift` both have snapshot + line items + actuals + audit), they share a UX pattern by default. Asymmetry is a deliberate, justified decision and must be written down with a reason.

When reviewing a plan, list the parallel-entity pairs and run a one-paragraph diff:

> Shift gets X, Y, Z. Does creator? If not, why not?

A missing match is a gap unless the asymmetry is the deliberate point.

## How to run the audit

1. **Read the PRD and plan side-by-side.** Build the actor-coverage matrix on paper.
2. **For each task that scopes something out**, find the forwarding address. List the orphans.
3. **For each snapshot field** in the data model section, find its write/edit/UI rows in the plan. List the missing ones.
4. **For each read view** named in the PRD, find the write rows that produce its data. List the unreachable views.
5. **For each parallel-entity pair**, run the symmetry diff. List the asymmetries without written reasons.
6. **Produce a single report**: gaps, orphans, missing edit paths, unreachable views, unjustified asymmetries.
7. **Land fixes in the plan first**, before resuming implementation.

The companion workflow at `.agent/workflows/plan-completeness-audit.md` walks through this on a real plan with examples.

## Common failure modes

- **Vertical-stack slicing.** Workstreams cut by data layer (storage → calc → UI) orphan input UX between layers. Cut by user journey instead.
- **Read-view rhetoric without write rows.** "Three read-only views" in the PRD does not mean three rows in the plan. Verify.
- **"Same as the other entity" by default.** Asymmetry between parallel entities is common and almost always unintentional. Force the question.
- **DoD lists deliverables, not scenarios.** "X shipped" can be partially satisfied; "actor A completes journey Z" cannot. Convert DoD to scenarios.
- **Workflow docs written after implementation.** They become validation theater. Pre-PRD workflow docs are the artifact that catches gaps at the cheapest stage.

## Acceptance criteria for "plan is complete"

- [ ] Every actor in the PRD has at least one surface for every workflow step that involves them.
- [ ] Every "this task does not include X" has a `Deferred to: Task N` annotation.
- [ ] Every snapshot field has a write row, an edit row, and a UI row (or an explicit phase-defer with a reason).
- [ ] Every read view in the PRD has its feeder writes scheduled.
- [ ] Every parallel-entity pair has either the same UX pattern or a written asymmetry reason.
- [ ] Completion criteria are scenario-based, not deliverable-based.

When all six boxes are checked, the plan is auditable for completeness. It may still be wrong on technical details — that's what code review is for — but it will not be hiding a missing workflow.
