---
description: Audit a multi-PR implementation plan for workflow gaps before sign-off, before starting each task, and after discovering a gap in a shipped task. Pairs with `.agent/skills/plan-workflow-completeness/`.
---

# Plan Completeness Audit Workflow

Run this whenever a plan is being written, revised, signed off, or when an unexpected gap is discovered in implementation. Produces a structured gap report and a list of edits to apply to the plan before code is touched.

> **Companion**: read `.agent/skills/plan-workflow-completeness/SKILL.md` for the five invariants the audit checks.

---

## Step 0 — Identify the plan and the contract

A "plan" here means any document that breaks work into multiple PRs. In this repo that takes two shapes:

- A standalone plan at `docs/superpowers/plans/<date>-<feature>.md`.
- The **PR Roadmap** section of `docs/roadmap/PHASE_<n>.md` (consolidated tracker).

A "contract" means the truth source the plan is implementing against. In this repo:

- A PRD at `docs/prd/<feature>.md`.
- A locked operating contract at `docs/domain/<name>.md` (e.g., `economics-cost-model.md`).

```bash
# Find the plan (either shape)
ls docs/superpowers/plans/ 2>/dev/null | grep -i <feature>
rg -n "^## PR Roadmap|^### PR " docs/roadmap/

# Find the contract
ls docs/prd/ docs/domain/ | grep -i <feature>
```

You need both open at once. The plan is the candidate; the contract is the truth source.

## Step 1 — Build the actor-coverage matrix

Open the plan. Extract every actor named in the PRD (`ADMIN`, `MANAGER`, `TALENT_MANAGER`, operator, creator, system admin, ...). Open a scratch file and write the matrix header:

```
| Actor | Step 1 (e.g., assign) | Step 2 (e.g., edit terms) | Step 3 (e.g., enter actuals) | Step 4 (e.g., review costs) |
| --- | --- | --- | --- | --- |
```

Walk the PRD's user-story section. For each story, mark the actor's cell with `R` (reads), `W` (writes), or `RW`. Leave blank when the actor doesn't participate.

Walk the plan task-by-task. For each cell with `R` or `W` or `RW`, find the task line that ships the surface. Annotate the cell with the task number, e.g., `RW (T5)`. Leave the cell as `R` if no task is scheduled.

**Gaps** = cells with R/W/RW but no task number.

## Step 2 — Find orphaned deferrals

```bash
grep -nE "does( \*\*)?not( \*\*)? include|scoped out|deferred|out of scope" <plan-path>
```

For each match, look for a `Deferred to:` annotation in the same paragraph. If absent, the deferral is orphaned.

Write each orphan as `Task N defers X with no forwarding address`.

## Step 3 — Snapshot-field edit-path check

```bash
grep -nE "snapshot|agreedRate|hourlyRate|compensationType|commissionRate" <plan-path>
```

For each snapshot field named in the plan, locate:

- the **write row** (assignment endpoint that creates it)
- the **edit row** (PATCH endpoint that updates it post-creation, with snapshot audit)
- the **UI row** (the dialog or panel that exposes the edit to the right role)

Snapshot fields without an edit row are write-once data that managers cannot correct without admin intervention. Flag them.

## Step 4 — Read-view reachability check

Open the PRD. Find the section that lists read views (e.g., "three read-only views — creator, operator, operational").

For each view, find:

- The **read endpoint** in the plan (`GET /.../compensation-summary`)
- The **writes** that produce the fields the read shows (snapshots, line items, actuals)

A read view whose feeder writes are not scheduled in the same plan is an unreachable view. Flag it.

## Step 5 — Parallel-entity symmetry diff

Identify pairs that share an architectural pattern in the PRD's data section. Common pairs in this repo:

- `ShowCreator` vs `StudioShift` (snapshot + line items + actuals + audit)
- `Show` vs `StudioShiftBlock` (actuals + planned/actual time)

For each pair, list the surfaces each gets:

```
ShowCreator: assign(bulk), per-show edit ❓, per-target line items, per-show summary, per-creator summary
StudioShift:  per-shift create (with rate), per-shift edit (with rate), per-target line items, per-shift block actuals, ...
```

Diff: `per-show edit ❓` is missing on the `ShowCreator` side; the matching task either needs to ship it or the asymmetry needs a written reason in the plan ("creators don't get per-show edit because ...").

## Step 6 — Produce the gap report

Combine outputs from steps 1–5 into one markdown block:

```markdown
## Plan completeness audit: <plan-name>

**Audited against:** <PRD path>
**Audit date:** YYYY-MM-DD

### Gaps from actor coverage
- <actor> has no surface for <step>; expected in Task <N>.

### Orphaned deferrals
- Task <N> defers <X> with no forwarding address.

### Missing snapshot edit paths
- <field> has a write row (Task <N>) but no edit row.

### Unreachable read views
- <view> needs <field> writes that no task schedules.

### Unjustified asymmetries
- <entity A> gets <surface>; <entity B> does not. No reason documented.
```

## Step 7 — Land plan edits before resuming code

For each gap in the report, propose an edit to the plan:

- New task / task split / scope expansion
- Add `Deferred to:` annotation
- Add scenario-based DoD line
- Document the asymmetry reason

Apply the edits to the plan in a docs-only commit. Re-run the audit to confirm zero gaps. **Then** start or resume implementation.

## Step 8 — Update Definition of Done to scenarios

If the plan's completion criteria are deliverable-based ("X shipped"), convert each to a scenario:

- Bad: `[ ] 2.2 line items + actuals input surfaces shipped`
- Good: `[ ] A manager enters actuals on a finished show and the per-show summary moves out of ACTUALS_INCOMPLETE on next refetch`

A scenario cannot be partially satisfied; a deliverable can.

---

## Worked example

The Phase 4 compensation-line-items work was audited post-Task-5 (now PR 4 in [PHASE_4.md](../../docs/roadmap/PHASE_4.md) — git history preserves the original standalone plan). Audit against [economics-cost-model.md](../../docs/domain/economics-cost-model.md) produced three gaps:

1. **Snapshot edit path missing for `ShowCreator`.** Write row was the bulk-assign endpoint, but no edit row existed. → New PR 4 (per-show edit) + PR 5 (per-creator review).
2. **Actuals input UX orphaned.** Schema columns were added by an earlier task; UI was scoped out across two tasks with no forwarding address. → New PR 6 (show-actuals input) + PR 7 (missing-actuals queue).
3. **Read views unreachable from the operator perspective.** Contract named three views; plan shipped only the per-show creator view. → New PR 8 (per-member shifts) + PR 5 (per-creator shows).

All three would have been caught at plan time with this audit. They were caught at PR-review time instead, which cost one extra round trip. The 2026-05-15 plan→tracker consolidation absorbed all of these as named PR entries.
