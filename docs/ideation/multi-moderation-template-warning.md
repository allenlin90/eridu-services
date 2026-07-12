# Multi-Moderation-Template Assignment Warning

**Status:** Deferred. Captured during the task-template v2 design review (historically `docs/ideation/task-template-redesign.md`, now shipped; see [Task Templates](../features/task-templates.md)) when row-grain refactor was explicitly kept out of v2 scope.
**Scope:** A user-facing warning at task assignment time when a show is about to be assigned multiple ACTIVE templates whose `shared_field_key` sets overlap. Plus a small correctness fix to the existing `DUPLICATE_SOURCE` report warning.

---

## TL;DR

Today, two ACTIVE templates assigned to one show with overlapping shared fields silently collide in the report (first-write-wins; second task's data is dropped from the export). v2 does not change this behavior. Empirically only **1 production show** hits the case today, but the misuse pattern is invisible to the user — they have no signal at assignment time, and the existing `DUPLICATE_SOURCE` report warning only fires for same-template duplicates, not cross-template collisions.

This ideation captures the warning surfaces and the small correctness fix so they can ship together when product calls for it.

---

## The Problem

Operationally legitimate: assigning multiple ACTIVE templates to one show (e.g., "live moderation" + "post-show audit" — distinct purposes, often non-overlapping shared fields). 149/802 ACTIVE shows in production do this; 148 of them have non-overlapping shared field sets and are working as intended.

Operationally problematic: assigning multiple ACTIVE templates whose shared field sets overlap. The two tasks both contribute to the same `(shared_field_key, group)` report column for the same show. Today's report aggregator at [task-report-run.service.ts:212-214](../../apps/erify_api/src/models/task-report/task-report-run.service.ts#L212-L214) is first-write-wins:

```typescript
if (!(columnKey in row)) {
  row[columnKey] = this.normalizeFieldValue(...);
}
```

The second task's value is silently dropped from the CSV export. The user has no warning at assignment time, no warning at submission time, and no warning at report generation time (the existing `DUPLICATE_SOURCE` warning at [task-report-run.service.ts:347-360](../../apps/erify_api/src/models/task-report/task-report-run.service.ts#L347-L360) only fires for `(show, same template)` duplicates, not cross-template column collisions).

Production scope today: 1 show. Future scope: unbounded as templates evolve.

---

## Premises

- **Don't change row grain.** v2 keeps show-grain row aggregation. This ideation is about *warning* against the misuse pattern, not refactoring the report to handle it.
- **Don't block assignment.** "Two ACTIVE templates with overlapping shared fields" is sometimes a legitimate intent (an admin actively wants both inputs to merge into one canonical column). Block-with-override is acceptable; hard-block is not.
- **Don't change `shared_field_key` semantics.** The same canonical metric across templates should still merge by default. Distinct-purpose-same-metric is a separate product decision (template-purpose attribute) tracked in the v2 redesign doc's Deferred section.

---

## Proposed Surfaces

### 1. Assignment-time warning

When a task is being assigned to a show (or vice-versa), check whether any other live ACTIVE task on that show has a template whose `shared_field_key` set overlaps with this template's. If yes, warn:

> "Show *X* is already assigned a task using template *Y*, which collects the same canonical metrics (`gmv`, `mc_count`, …). Reports will retain the first-submitted value per column. Assign anyway?"

Implementation surface: assignment endpoints in `apps/erify_api/src/task-orchestration/` and the studio UI's assignment flow. Likely a new helper that diff's two templates' shared field sets.

### 2. Report-time warning extension

Extend `buildWarnings` at [task-report-run.service.ts:347-360](../../apps/erify_api/src/models/task-report/task-report-run.service.ts#L347-L360) to surface cross-template column collisions, not just same-template duplicates. New warning code: `CROSS_TEMPLATE_COLUMN_COLLISION` with `show_id`, `column_key`, and the list of contributing template UIDs.

### 3. Existing-warning correctness fix

The current `DUPLICATE_SOURCE` warning message says *"latest values were used"* but the code is first-write-wins. Either change the code to last-write-wins (semantically more useful — a resubmission overrides a stale draft), or change the message to *"the first submitted value was retained"*. The fix should be intentional, not incidental to this work.

---

## Out of Scope

- **Row-grain refactor** (separating multi-template-on-show into multiple rows). Tracked separately; would be a CSV-shape change visible to all consumers of the export.
- **Template-purpose attribute** (so "live moderation" GMV and "post-show audit" GMV become distinct columns even when they share `shared_field_key`). Future product decision; not driven by current production data.
- **Auto-resolution** of column collisions (sum, average, latest). Should require an explicit aggregation contract per column type, not silent behavior.

---

## Triggering Conditions

This ideation should be promoted to a PRD when any of the following hold:

- A user reports missing data in a task report and triage traces it to the cross-template collision case.
- The 1 known production show with overlapping templates grows to a number that operations cares about.
- Product introduces a workflow that intentionally requires multiple ACTIVE templates with overlapping shared fields per show, and the silent-drop behavior becomes a correctness issue.
- The `DUPLICATE_SOURCE` warning's incorrect "latest values were used" text is reported as a bug.

Until then, the design intent is: keep the v2 redesign focused on the schema decoupling, document the deferred warning explicitly so it isn't forgotten, and revisit when there's a concrete product driver.
