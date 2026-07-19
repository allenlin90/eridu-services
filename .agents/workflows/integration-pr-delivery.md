---
description: Coordinate several reviewed breakdown PRs through one main integration PR when a large committed scope must land to master atomically.
---

# Integration PR Delivery

Use this workflow for a large committed scope that needs several reviewable PRs but should become visible on `master` only as one complete unit. It is an execution overlay on the normal PRD, review, knowledge-sync, and [doc-lifecycle](../skills/doc-lifecycle/SKILL.md) flows—not a separate artifact lifecycle.

## Use It When

- The work is too large for one reviewable implementation PR.
- Partial merges to `master` would leave an incomplete workflow, incompatible intermediate state, or misleading current-truth documentation.
- One or more committed PRDs share a coherent release and acceptance boundary.

If each slice is independently safe and useful on `master`, use normal direct-to-`master` PRs instead.

## Invariants

1. **Requirements stay canonical.** Each committed product question remains owned by its PRD. A Superpowers spec or implementation plan may map slices and dependencies, but must not become a second requirements source.
2. **One release boundary.** A main integration PR may span several PRDs only when they are all committed and must ship together under one acceptance boundary.
3. **Breakdown PRs stay reviewable.** Each child has a narrow scope, tests, acceptance criteria, and a normal `pr-ready` review before merging into the integration branch.
4. **Nothing lands partially.** Breakdown PRs target the integration branch, not `master`. Only the main integration PR merges the combined result to `master`.
5. **Final bookkeeping happens once.** Child PRs do not retire shared PRDs, specs, or plans. The main PR owns final roadmap status, current-truth promotion, and planning-artifact retirement.

## Workflow

1. **Confirm the commitment.** Identify the owning PRD or PRDs and the combined acceptance boundary. Keep uncommitted possibilities in ideation.
2. **Audit the breakdown.** Use [plan-workflow-completeness](../skills/plan-workflow-completeness/SKILL.md) to map each acceptance outcome to a breakdown PR and record dependencies or ordering.
3. **Open the main PR early.** Create an integration branch from current `master` and open a draft main PR back to `master`. Link the PRDs, transient plan, acceptance boundary, and breakdown checklist.
4. **Open breakdown PRs.** Branch each slice from the integration branch and target its PR back to that branch. Rebase dependent or parallel branches onto the updated integration branch when required.
5. **Review and merge each breakdown.** Run the normal verification and [PR review](pr-review.md) for each child. Merge approved children into the integration branch and update the main PR checklist and plan status.
6. **Verify the complete program.** After all children merge, update the integration branch from latest `master`, run combined tests and scenario-based acceptance checks, and review the full main PR diff against `master`.
7. **Run final wrap-up.** In the main PR, run [knowledge sync](knowledge-sync.md) and doc lifecycle bookkeeping. Promote current truth, update roadmap status, and retire completed PRDs, designs, specs, and plans only when the full acceptance boundary is satisfied.
8. **Merge once.** Mark the main PR ready, obtain final review, and merge it to `master` as the single delivery event.

## Scope Changes

- A newly discovered requirement updates its owning PRD if the team commits to it.
- An uncommitted possibility goes to ideation, even if the transient plan mentions it.
- If a breakdown becomes independently shippable and no longer belongs to the atomic acceptance boundary, remove it from the integration program and use the normal PR workflow.

## Completion Signal

The program is complete when every breakdown PR is merged into the integration branch, the main PR satisfies the combined acceptance boundary and normal merge-readiness checks, lifecycle bookkeeping is included in that main PR, and the combined result merges to `master` once.
