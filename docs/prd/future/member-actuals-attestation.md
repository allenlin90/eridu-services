# PRD: Member Actuals Attestation

> **Status**: ⏭️ Future target (Phase 5+ — deferred from Phase 4)
> **Phase**: Revisit when at least one hardware actuals source (fingerprint reader, dynamic-QR punch, geofence) is operationally available.
> **Workstream**: Studio shift actuals — broaden the writer set beyond manager data-entry without weakening the cost-model's strict-null semantic. This PRD is about member/shift attestation sources, not Phase 4 task-submission extraction for show, creator, or platform facts.
> **Depends on**: At least one of — fingerprint/biometric access-control log feed · dynamic-QR punch in/out client · geofence cross-event source. Cost-model semantic ([economics-cost-model.md](../../domain/economics-cost-model.md)) §2 strict-null on per-shift `actual_cost`.
> **Blocks**: Phase 4 PR 10 "flag missing actuals" affordance is the temporary path until this lands.

## Problem

Today, `StudioShiftBlock.actualStartTime` / `actualEndTime` can only be written by a studio ADMIN or MANAGER via `PATCH /studios/:id/shifts/:id/blocks/:blockId`. Consequences:

- Members who completed a shift on time but had no manager edit their block stay `Pending — actuals not recorded yet` indefinitely, even when authoritative evidence exists in adjacent systems (door swipe, punch log).
- Late or absent member self-knowledge is not captured anywhere structured — only as out-of-band Slack/email asking a manager to record it.
- The cost-model treats the absence of actuals as "unknowable," but operationally the truth is "knowable from another source we don't read yet."
- Manager time spent on data entry scales linearly with shift count; for studios running dozens of shifts a day, this is a real productivity tax.

The naive fix — "let members type their own actuals" — would weaken the cost-model's audit story: self-reported actuals are subject to memory error and incentive bias (cost flows downstream of these timestamps). The right fix attaches actuals to an evidence source and reconciles when sources disagree.

## Users

- **Studio MEMBER**: self-attests their actuals when no hardware source is available; flags missing actuals (PR 10's temporary affordance).
- **Studio MANAGER / ADMIN**: still the final arbiter on conflicts; reviews reconciliation queue.
- **Finance**: needs to know which actuals are reconciled vs. self-reported-only vs. manager-overridden, because downstream payouts and invoices depend on it.
- **Operations / IT**: owns the hardware feeds and the conflict-resolution policy.

## Constraints (lock these before any implementation work)

### 1. Attestation, not authoritative

Member self-report is a **signal**, not the source of truth. A shift block's `actual_cost` should not flip from pending to resolved on self-report alone unless explicit policy says so. The cost-model's strict-null semantic stays intact: only a *reconciled* source resolves the block.

### 2. Source tagging is required end-to-end

Today's `actualStartTime` / `actualEndTime` are unsourced. This PRD introduces per-timestamp source attribution:

- `SELF_REPORT` — member entered in app.
- `MANAGER` — manager-entered or manager-edited (current behavior).
- `PUNCH` — dynamic-QR punch event reconciled against shift window.
- `GEOFENCE` — entry/exit event from geofence-aware client.
- `BIOMETRIC` — door swipe / fingerprint from access-control system.
- `RECONCILED` — multiple sources agreed within tolerance.

Schema impact: separate timestamp + source columns per actual edge (`actual_start_time`, `actual_start_source`, `actual_start_recorded_at`, …) or a normalized side table of attestation events keyed by `(block_id, edge, source)`. Side table is more flexible for the conflict queue; column denorm is faster for the read path. **Decide during design, not during build.**

### 3. Conflict-resolution policy

When two sources disagree on the same edge:

- **Within tolerance** (e.g. ±5 min, studio-configurable): auto-accept the higher-trust source, mark as `RECONCILED`.
- **Outside tolerance**: queue for manager review; show both candidates and which source produced each.
- **Manager override always wins** but writes both the override and the override reason, mirroring the existing `override_reason` audit pattern for `hourly_rate`.

Source trust order proposed (revisit during design): `BIOMETRIC > PUNCH > GEOFENCE > MANAGER > SELF_REPORT`.

### 4. Privacy, retention, consent

- **Geofence / biometric data**: subject to access-control retention rules and require explicit consent on member onboarding. Cannot be retained beyond the shortest applicable retention window.
- **Self-report**: stays on the shift block forever as audit history.
- **PII isolation**: source-feed payloads (raw fingerprint hash, geofence coordinates) live in the source-system database, not in `studio_shifts`. We store the reconciled timestamp + the source identifier, not the raw evidence.

### 5. Don't break Phase 4

This PRD must not invalidate any Phase 4 contract:

- `actual_cost` strict-null per cost-model §2 stays correct: a block resolves only on a reconciled or manager-confirmed source.
- The `planned_cost` / `actual_cost` wire shapes don't change.
- Existing `PATCH …/blocks/:blockId` continues to work for manager edits; the new sources are additive.

## Why deferred from Phase 4

The deepest blocker is **no hardware feed currently exists in production**. Without at least one authoritative source, the whole reconciliation pipeline reduces to "member self-report vs. manager edit" — and that's just renaming today's manager-edit path. Phase 4 PR 10 ships a "flag missing actuals" affordance as the temporary unblocker for members; this PRD becomes actionable when the first hardware feed is online.

Phase 4 may still add task-submission extraction for `Show`, `ShowCreator`, and `ShowPlatform` facts. That work does not replace this PRD because it reads operator-entered task submissions and manager review, while this PRD covers external evidence sources such as punch, geofence, biometric, or creator-app flows for shift/member actuals.

## Open questions to answer before scheduling

- Which hardware source(s) land first, and on what timeline?
- Is the conflict queue a new surface, or does it live inside the existing ShiftCompensationDialog?
- Does self-report require manager confirmation in all cases, or auto-resolve under specific conditions (e.g. matches scheduled window within ±2 min)?
- How do we expose source attribution to recipients (members) without leaking other members' attestation data?
- Notifications when manager overrides a self-report — Phase 5 deferral "Notifications when manager edits actuals" should be re-checked against this PRD when scheduled.

## Phase 4 stopgap

Until this PRD ships, the operational path is:

- Managers continue to be the only writers via the existing PATCH endpoint and the [ShiftCompensationDialog](../../../apps/erify_studios/src/features/studio-shifts/components/shift-compensation-dialog.tsx).
- Members get a "flag missing actuals" affordance from Phase 4 PR 10 (`/me/compensation/*`) — a structured ping to a manager, not a write path.
- `/my-shifts` shows pending cells with `Pending — actuals not recorded yet` micro-copy (shipped in Phase 4 PR 3).

## References

- [`economics-cost-model.md`](../../domain/economics-cost-model.md) §2 — strict-null cost semantic this PRD must preserve.
- [`PHASE_4.md`](../../roadmap/PHASE_4.md) PR 10 — interim "flag missing actuals" affordance.
- [`PHASE_4.md`](../../roadmap/PHASE_4.md) Phase 5 deferrals — "Hardware / creator-app actuals sources beyond task submissions" and "Notifications when manager edits actuals" rows.
