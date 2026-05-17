# Design: Shift hourly-rate editing in compensation dialog (Phase 4 PR 3.5)

> **Status:** Spec — implementation pending.
> **Branch:** `codex/phase4-shift-rate-in-comp-dialog` (off `master` after [PR #72](https://github.com/allenlin90/eridu-services/pull/72) merged).
> **Roadmap row:** [`docs/roadmap/PHASE_4.md`](../../roadmap/PHASE_4.md) PR 3.5.
> **Cost contract:** [`docs/domain/economics-cost-model.md`](../../domain/economics-cost-model.md) §1.

## Problem

Managers edit per-shift money fields across two surfaces today:

- **Edit-shift dialog** (`studio-shifts-table.tsx`): `hourly_rate` lives in the form alongside member / date / blocks / status. On Save, a separate FE-only modal pops up to collect `override_reason` when the rate changed, then PATCHes.
- **Shift compensation dialog** (`shift-compensation-dialog.tsx`): a read-only `Hourly rate` tile alongside line-item panels and block actuals.

Two consequences:

1. **Conceptual split.** "Manage money for this shift" is split across two dialogs, even though both call the same `PATCH /studios/:id/shifts/:id` endpoint.
2. **Trustless BE enforcement.** The "reason required when rate changes" rule is only enforced client-side. A direct API call could PATCH `hourly_rate` without `override_reason` and the audit log would silently omit the justification. The audit helper `appendSnapshotAudit` enforces the *reverse* (reason without change → 400) but not this direction.

## Goal

The compensation dialog becomes the single canonical surface for all per-shift money fields (rate, line items, block actuals view). The edit-shift dialog goes back to who/when/blocks/status. BE rejects rate-change PATCHes that omit `override_reason`.

## Non-goals

- **No member self-input on actuals.** Deeper attestation work stays in [`member-actuals-attestation.md`](../../prd/future/member-actuals-attestation.md).
- **No wire-type migration for `hourly_rate`.** It already moved to `z.string()` end-to-end in PR 1 (#69) for the response and in the schema input as `z.coerce.number()` for the request — `StudioMembership.baseHourlyRate` is PR 8's scope.
- **No new endpoint, no new mutation hook, no DB change.** This PR reuses `PATCH /studios/:id/shifts/:id` and `useUpdateStudioShift`.

## Approach

### 1. Backend — service-layer guard

**File:** [`apps/erify_api/src/models/studio-shift/studio-shift.service.ts`](../../../apps/erify_api/src/models/studio-shift/studio-shift.service.ts) (`updateShift` method).

After deriving `snapshotChanges` and before calling `appendSnapshotAudit`, insert:

```ts
// Cost-model §1: an explicit hourly_rate edit (rate present in PATCH and different
// from stored) must be justified. Rate changes driven by user reassignment (inherited
// from the new member's base rate) are out of scope and continue to flow through.
if (
  payload.hourlyRate !== undefined
  && snapshotChanges.length > 0
  && !payload.overrideReason?.trim()
) {
  throw HttpError.badRequest(
    'override_reason is required when hourly_rate changes',
  );
}
```

This mirrors the reverse check that already lives in [`snapshot-audit.helper.ts:29-34`](../../../apps/erify_api/src/lib/audit/snapshot-audit.helper.ts) (reason without change → 400). Together they enforce: **explicit rate edit ⇔ reason**.

**Why the `payload.hourlyRate !== undefined` predicate.** The brief in [`PHASE_4.md`](../../roadmap/PHASE_4.md) PR 3.5 specifies the guard fires *"when hourly_rate is present in the PATCH body and differs from the stored value"*. Reassignment (`payload.userId` to a different user) also produces a `snapshotChanges` entry because the service overwrites `hourlyRate` from the new membership's base rate. Per the brief, that path is out of scope — managers reassigning a shift shouldn't be forced to write a justification for the inherited rate. A follow-up could tighten reassignment-driven rate changes; that's not this PR.

`updateStudioShiftSchema` is **unchanged**. The brief suggested a "Zod cross-field validation", but Zod can't read the stored DB value at parse time, so a Zod-only refinement would either be over-strict (rejecting valid same-rate re-sends) or wrong (passing rate-change with no reason). The service is the only layer that knows both inputs.

**Tests** in [`studio-shift.service.spec.ts`](../../../apps/erify_api/src/models/studio-shift/studio-shift.service.spec.ts):

| # | Scenario | Expected |
|---|---|---|
| a | PATCH with same rate, no reason | 200, no snapshot entry appended |
| b | PATCH with different rate, no reason | 400 `'override_reason is required when hourly_rate changes'` |
| c | PATCH with different rate + reason | 200, snapshot entry appended with reason |

Cases (a) and (c) are likely already covered indirectly; verify and tighten messages. Case (b) is the new behaviour to add.

### 2. Frontend — inline rate edit in compensation dialog

**File:** [`apps/erify_studios/src/features/studio-shifts/components/shift-compensation-dialog.tsx`](../../../apps/erify_studios/src/features/studio-shifts/components/shift-compensation-dialog.tsx).

Convert the existing read-only `Hourly rate` tile (lines 56-62) into a stateful toggle:

- **Display mode (default).** Tile shows `$X.XX/hr` (today's layout) + a small `Edit` icon button (pencil) top-right of the tile.
- **Edit mode (after Edit click).** Inside the same tile:
  - Money input (`type="number"`, `min="0"`, `step="0.01"`, prefilled with current `shift.hourly_rate`).
  - `override_reason` `<Textarea>` (placeholder: *"Why is this rate being changed?"*).
  - `Save` (primary) and `Cancel` buttons in a row.
- **Wiring.** `useUpdateStudioShift(studioId)` (already exists), called with `{ shiftId, payload: { hourly_rate, override_reason } }`. Rate normalised via `toMoneyString` (existing util) before `Number()` conversion, matching the existing pattern in `studio-shifts-table.tsx:307`.
- **Save-enable rules:**
  - Disabled when rate field is blank.
  - Disabled when reason field is blank **and** the entered rate differs from the stored rate.
  - If the entered rate equals the stored rate (same value): reason is not required, Save just closes edit mode without firing a PATCH. This matches the existing FE convention from `studio-shifts-table.tsx:319-325` and avoids the BE 400 from `appendSnapshotAudit`.
- **On success:** flip back to display mode. The existing `setQueriesData` patch inside `useUpdateStudioShift` refreshes the tile and the table.
- **On error:** surface `getApiErrorMessage(...)` inside the tile; stay in edit mode.

No new mutation hook, no new file. The `ShiftCompensationDialog` component grows from ~130 LOC to roughly ~180 LOC — still well under the 200-LOC route-component threshold from `AGENTS.md`.

### 3. Frontend — remove rate editing from edit-shift dialog

**File:** [`apps/erify_studios/src/features/studio-shifts/components/shift-form-fields.tsx`](../../../apps/erify_studios/src/features/studio-shifts/components/shift-form-fields.tsx).

Add `includeHourlyRate?: boolean` prop (default `true`). When `false`, do not render the Hourly Rate grid cell (lines 133-144). Matches the existing `includeStatus` pattern in the same file.

**File:** [`apps/erify_studios/src/features/studio-shifts/components/studio-shifts-table.tsx`](../../../apps/erify_studios/src/features/studio-shifts/components/studio-shifts-table.tsx).

- Pass `includeHourlyRate={false}` to the edit `StudioShiftFormDialog`. The create dialog keeps the default (`true`).
- In `handleUpdateShift` (lines 304-325): delete the `formState.hourlyRate.trim()` branch, the `normalizeRate`/`previousHourlyRate` diff check, and the `setPendingSnapshotUpdate(...)` short-circuit. The PATCH payload for edit no longer carries `hourly_rate`.
- Remove the now-unreachable snapshot-override modal and its support:
  - State: `pendingSnapshotUpdate`, `snapshotOverrideReason`, `setPendingSnapshotUpdate`, `setSnapshotOverrideReason`.
  - Callback: `handleConfirmSnapshotUpdate`.
  - JSX: the `Dialog` block starting around line 582.
  - Helpers/types: `normalizeRate`, `PendingSnapshotUpdate` type.
- `ShiftFormState.hourlyRate` (in `shift-form.types.ts`) and `createEditFormState`'s `hourlyRate: shift.hourly_rate ?? ''` stay as-is — create still uses them, and edit just won't render the field. Keeping the type stable avoids touching shared utils outside of what this PR needs.

### 4. Tests

**Frontend tests to add/update:**

| File | Change |
|---|---|
| `shift-compensation-dialog.test.tsx` | Add: (i) editing rate + reason → mutate called with both fields; (ii) Save disabled until reason filled when rate changed; (iii) saving with unchanged rate → no mutation; (iv) error path surfaces inline. |
| `shift-form-fields.test.tsx` | Add: `includeHourlyRate={false}` hides the Hourly Rate input; default renders it. |
| `studio-shifts-table.test.tsx` | Remove assertions about the snapshot-override modal in the edit flow (modal is gone). Edit save no longer triggers the override step. |
| `studio-shift-form-dialog.test.tsx` | Spot-check: passing `includeHourlyRate={false}` through to `ShiftFormFields` doesn't render the input. |

**Backend tests** — covered in §1 above.

## Risk and rollout

- **Single-PR cutover.** BE guard, FE move, and FE delete all ship in the same PR. No flag.
- **Backwards-compat concern.** Any external script PATCHing `hourly_rate` without `override_reason` will start receiving 400. The endpoint is studio-scoped manager-only and not currently consumed by anything besides the UI; the audit-trail contract requires the reason regardless, so the break is intentional.
- **Data:** none. No migration, no backfill.

## Verification

Per `AGENTS.md`:

```bash
pnpm --filter erify_api    lint && pnpm --filter erify_api    typecheck && pnpm --filter erify_api    test && pnpm --filter erify_api    build
pnpm --filter erify_studios lint && pnpm --filter erify_studios typecheck && pnpm --filter erify_studios test && pnpm --filter erify_studios build
```

## Doc updates landed with the PR

- `docs/roadmap/PHASE_4.md`: flip row 3.5 status to `✅`, replace the brief with the PR link.
- `docs/features/` and `apps/*/docs/` if anything in those files still references rate editing from the edit-shift dialog (audit during implementation).
