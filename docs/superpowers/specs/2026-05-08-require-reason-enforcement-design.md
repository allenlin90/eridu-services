# Design: `require_reason` Enforcement on Task Submission

> **Status:** Spec — implementation pending.
> **Targets:** `codex/task-template-report-extras-export` (PR #49) until that PR merges; auto-retargets to `master` after.

## Problem

PR #49 fixes the **capture** half of `require_reason`: the `JsonForm` now renders a reason `Textarea` when a triggering value is selected, persists it as `<contentKey>__reason`, and shows it on review. The shared validator schema (`buildTaskContentSchema`) accepts `__reason` as an optional string.

The **enforcement** half is still missing: nothing blocks an operator (or an API client) from submitting a task where the answer triggers `require_reason` but the reason field is empty. This was confirmed against `ttpl_OtVn1kdHi_V_8TZftv52`, where 1,008 historical submissions exist with zero `__reason` keys despite multiple fields where the rule is effectively always-on.

## Goal

When `validateContent` runs on a content payload whose snapshot uses the v2 engine, reject the payload if any field's `require_reason` rule triggers against the submitted answer but no non-empty `<contentKey>__reason` text is present.

## Non-goals

- **No back-fill of historical data.** The 1,008 existing submissions stay as-is.
- **No enforcement on v1 snapshots.** v1 historical tasks (including the 1,008 above) continue to be approvable through the normal flow. v1 templates stay unenforced until they migrate to v2 — matching the v2 cutover trajectory landed in master.
- **No new error-recovery UI in the action sheet.** Existing form-level `<FormMessage />` rendering already shows refinement errors next to the offending field; that's enough.

## Approach

### 1. Lift reason logic into `@eridu/api-types`

`shouldShowReasonField`, `hasReasonEvaluableValue`, and `compareScalarValue` currently live inline in [json-form.tsx](../../../apps/erify_studios/src/components/json-form/json-form.tsx). Move them into a new module — e.g. `packages/api-types/src/task-management/require-reason.ts` — and re-export from the package barrel. The validator (backend + frontend) and the form will both import from there, avoiding duplicated logic.

### 2. Refine `buildTaskContentSchema`

Append a `superRefine` to the schema returned by [buildTaskContentSchema](../../../packages/api-types/src/task-management/task-content-validator.ts). Inside the refine:

1. If `getSchemaEngine(schema) !== 'task_template_v2'`, return early — v1 grandfather.
2. For each `item` in `schema.items`:
   - Resolve `contentKey = getFieldContentKey(schema, item)`.
   - Resolve `value = data[contentKey]`.
   - If `shouldShowReasonField(item, value)` is `false`, skip.
   - Resolve `reasonKey = getTaskContentReasonKey(contentKey)` and `reason = data[reasonKey]`.
   - If `reason` is missing or a blank/whitespace-only string, push a `z.ZodIssueCode.custom` issue at path `[reasonKey]` with a human-readable message (e.g. `Explanation is required for "<item.label>"`).

The shape entry for `reasonKey` stays optional — the refinement is what enforces it conditionally.

### 3. No frontend wiring needed

`JsonForm` already uses `zodResolver(buildTaskContentSchema(schema))` for both `mode: 'onChange'` validation and `form.handleSubmit`. The refinement issues surface automatically through `<FormMessage />` next to the reason `FormField` PR #49 added.

### 4. Backend reuse is automatic

`TaskValidationService.validateContent` calls the same `buildTaskContentSchema(schema)` on every content PATCH and again on `→ COMPLETED`. The refinement runs uniformly. Any v2 submission missing a triggered reason is rejected with `TaskValidationError` and the `<reasonKey>` field path so clients can target the right input.

## Tests

| Layer | Coverage |
|---|---|
| `@eridu/api-types` | Refinement unit tests: v2 triggering value + missing reason → fails; v2 triggering value + filled reason → passes; v2 non-triggering value + missing reason → passes; v1 schema + triggering value + missing reason → passes (grandfathered); blank/whitespace reason rejected. |
| `erify_api` | `task-validation.service.spec.ts`: extend with v2 + `require_reason` cases; v1 cases unchanged. |
| `erify_studios` | `json-form.test.tsx`: selecting a triggering value with the reason left empty surfaces a form error and `form.handleSubmit` does not call `onSubmit`. |

## Backwards compatibility

- v1 snapshots (engine `null` or `task_template_v1`): no behavioral change. The 1,008 existing tasks for `ttpl_OtVn1kdHi_V_8TZftv52` remain approvable.
- v2 snapshots authored before this change but submitted before it merges: same — they get the existing optional schema. After merge, any *new* PATCH against a v2 snapshot is enforced.
- No DB migration. No data fix. Forward-only.

## Rollout

1. Land PR #49 on master (capture + render).
2. Merge this PR (`fix/require-reason-enforcement`) — at that point GitHub auto-retargets it to master.
3. No feature flag. The behavior change is bounded to v2 snapshots, and the only operator-visible effect is "reason field that already shows up now also blocks submit when empty," which matches the explicit author intent of the `require_reason` rule.

## Out-of-scope follow-ups

- A separate audit / report flagging historical v2 tasks with missing reasons (none exist today, but would be useful as v2 templates ramp).
- A back-fill workflow for managers who want to add reasons retroactively to historical v1 tasks. Not required for this fix.
