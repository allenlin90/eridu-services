# Workflow: Shift Operations

End-to-end flow for how a studio plans, runs, records, and reviews operator/member shifts — from member roster setup through shift execution, actuals collection, and cost review.

> **Companion**: [Creator Operations](./creator-operations.md) covers the talent-side workflow. The two workflows share the same compensation line-item model and snapshot-audit pattern but apply different time semantics: shift labor is `hourlyRate × duration`, creator pay is flat per show.

## Actors

| Actor          | Role             | Key Capability                                                   |
| -------------- | ---------------- | ---------------------------------------------------------------- |
| Studio Admin   | `ADMIN`          | Manages member roster, creates/edits shifts, full access.        |
| Manager        | `MANAGER`        | Same as Admin except membership management.                      |
| Member / Operator | studio member  | Performs the shift. Reads own actual-backed compensation on `/me/compensation/operator`. Cannot edit shifts or actuals; can flag missing actuals back to studio. |

## Flow Overview

```
1. Admin assigns a user to the studio with a member role + baseHourlyRate
       ↓
2. Admin/Manager creates a shift on a date with one or more shift blocks
   (snapshot persists hourlyRate from member.baseHourlyRate at create time)
       ↓
3. Member performs the shift
       ↓
4. Admin/Manager enters Show / StudioShiftBlock actualStartTime / actualEndTime
       ↓
5. Admin/Manager attaches STUDIO_SHIFT or STUDIO_SHIFT_BLOCK compensation line items
   (bonus, allowance, overtime, deduction, other)
       ↓
6. ADMIN/MANAGER reviews shift cost in `/studios/:studioId/shifts/by-member/:membershipId`
   and operator self-reads `/me/compensation/operator`
       ↓
7. Wave 2 economics service (2.3) reads block actuals + snapshots + line items
   to produce operator compensation rows; commission/HYBRID stays unresolved
   (operator pay does not use commission components)
```

## Step-by-Step

### 1. Member roster maintenance

The studio admin maintains the member roster at `GET /studios/:studioId/members` and the matching write APIs:

- `POST /studios/:studioId/members`
- `PATCH /studios/:studioId/members/:membershipId`

Business effect:

- `StudioMembership.baseHourlyRate` becomes the maintained studio-scoped fallback rate for future shift snapshots.
- Editing `baseHourlyRate` does **not** retroactively update existing `StudioShift.hourlyRate` snapshots. The member-roster edit dialog must display the inline notice that existing shifts remain on their original rate unless an admin explicitly edits the shift snapshot (Task 11 in the 2.2 plan).

### 2. Shift creation

ADMIN and MANAGER create shifts at `POST /studios/:studioId/shifts`:

```
POST /studios/:studioId/shifts
{
  "user_id": "user_abc",
  "date": "2026-03-05",
  "hourly_rate": 25,         // optional; falls back to member.baseHourlyRate snapshot
  "is_duty_manager": false,
  "blocks": [
    { "start_time": "2026-03-05T09:00:00.000Z", "end_time": "2026-03-05T12:00:00.000Z" }
  ]
}
```

- `StudioShift.hourlyRate` is snapshotted at create time. Editing the snapshot post-creation requires the snapshot-warning dialog and captures `override_reason` per the cost-model PRD (shipped in PR #65 / Task 6).
- Shifts can carry multiple blocks; each block has independent planned and actual times.

### 3. Shift execution

The operator performs the shift. Phase 4 has no operator-facing input — actuals are entered by ADMIN/MANAGER after the fact. The operator self-view (`/me/compensation/operator`, shipped in 2.3) exposes pending events when actuals are still missing.

### 4. Actuals entry (ADMIN/MANAGER)

Admin/manager opens the shift compensation dialog and enters per-block `actualStartTime` / `actualEndTime` through the existing block PATCH route:

```
PATCH /studios/:studioId/shifts/:shiftId/blocks/:blockId
{
  "actual_start_time": "2026-03-05T09:05:00.000Z",
  "actual_end_time":   "2026-03-05T12:10:00.000Z"
}
```

- One-sided actuals are accepted but surface as `ACTUALS_INCOMPLETE` in the 2.3 calculator. Inverted ranges are rejected on the client and the server.
- Same role contract as show actuals: `ADMIN`/`MANAGER` only. The `actuals_source: OPERATOR_RECORD` wire label means *typed-into-the-system-by-authorized-user* — not the literal operator.

### 5. Compensation adjustments

ADMIN/MANAGER attaches `STUDIO_SHIFT` (shift-level) or `STUDIO_SHIFT_BLOCK` (block-level) compensation line items via the flat studio line-item API:

```
POST /studios/:studioId/compensation-line-items
{
  "target_type": "STUDIO_SHIFT_BLOCK",
  "target_id": "ssb_xyz",
  "amount": "25.00",
  "item_type": "BONUS",
  "reason": "Late handover"
}
```

Item types: `BONUS`, `ALLOWANCE`, `OVERTIME`, `DEDUCTION`, `OTHER`. Amounts are signed decimals; sign is not type-enforced in Phase 4.

### 6. Cost review

ADMIN/MANAGER reviews per-member compensation at `/studios/:studioId/shifts/by-member/:studioMembershipId/compensation-summary?from=...&to=...` (Task 10). The view aggregates:

- shift base labor (`StudioShift.hourlyRate × duration`, where duration uses block actuals when both are present, else planned with a warning),
- `STUDIO_SHIFT` line items applied at the shift level,
- `STUDIO_SHIFT_BLOCK` line items applied per block (with show-overlap allocation when blocks span multiple shows).

Operators self-read at `/me/compensation/operator` (2.3) and see pending events when actuals are still missing. Each pending row exposes the "Flag missing actuals" affordance (Task 11) that POSTs to `/me/compensation/pending-events/:eventKey/flag-missing-actuals`. Flagged rows appear in the studio's missing-actuals queue (Task 9 collection view) with a "Recipient flagged" badge.

### 7. Cost visibility (Wave 2.3)

Once 2.3 ships, the economics service reads `StudioShift.hourlyRate` snapshots + block actuals + supplemental line items to produce stable operator compensation rows. Commission-based pay does not apply to operator labor: operators are paid `hourlyRate × duration` plus signed line-item adjustments.

## Data Flow

```
StudioMembership.role = MANAGER / member
        ↓ guards
GET/POST/PATCH /members  →  baseHourlyRate
        ↓ snapshot on create
StudioShift { hourlyRate, blocks[] }
        ↓ actuals (ADMIN/MANAGER)
StudioShiftBlock { actualStartTime, actualEndTime }
        ↓                              ↘
        ↓                               POST/PATCH/DELETE /compensation-line-items
        ↓                               (target_type = STUDIO_SHIFT | STUDIO_SHIFT_BLOCK)
        ↓                              ↙
GET /shifts/by-member/:membershipId/compensation-summary
        ↓  [economics merge target]
GET /me/compensation/operator  →  pending events + countable totals
GET /studios/:studioId/economics  →  operational rollups (3.1 consumer)
```

## Key Business Rules

- Shift labor **is** time-multiplied: `StudioShift.hourlyRate × block duration`. This contrasts with creator pay, which is flat per show.
- `StudioShift.hourlyRate` is a snapshot from `StudioMembership.baseHourlyRate` at shift-create time. Roster-default edits do not retroactively rewrite shift snapshots.
- ADMIN/MANAGER may edit `StudioShift.hourlyRate` post-creation through the normal update endpoint; the FE shows the snapshot-warning dialog and records `override_reason` in `metadata.audit.snapshot_overrides[]` (shipped in PR #65).
- Block actuals follow the actuals-vs-planned cascade: both present → use actuals; absent → planned fallback with warning; one-sided → unresolved `ACTUALS_INCOMPLETE` for the recipient self-view, planned fallback with warning for manager surfaces.
- Operator pay never uses commission components. The `compensationType` enum applies to creators only; shift labor is always `hourlyRate × duration` plus line-item adjustments.
- Actuals are typed by ADMIN/MANAGER only in Phase 4. The wire label `OPERATOR_RECORD` is the *source category* in the priority cascade and does not imply the operator typed it.

## Related Docs

| Layer                       | Document                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Feature (Member roster)     | [docs/features/studio-member-roster.md](../features/studio-member-roster.md)                           |
| Feature (RBAC)              | [docs/features/rbac-roles.md](../features/rbac-roles.md)                                               |
| Workflow (Creator side)     | [docs/workflows/creator-operations.md](./creator-operations.md)                                        |
| PRD (Cost model)            | [docs/prd/economics-cost-model.md](../prd/economics-cost-model.md)                                     |
| Tracker (remaining 2.2-2.3) | [docs/roadmap/PHASE_4.md](../roadmap/PHASE_4.md)                                   |
| Phase 4 roadmap             | [PHASE_4.md](../roadmap/PHASE_4.md)                                                                    |
