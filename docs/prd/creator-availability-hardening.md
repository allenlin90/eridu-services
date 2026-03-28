# PRD: Creator Availability Logic Hardening

> **Status**: Active
> **Phase**: 4 — Extended Scope
> **Workstream**: Creator operations — assignment correctness
> **Depends on**: Studio Creator Roster — ✅ **Complete** (`docs/features/studio-creator-roster.md` ships roster state and inactive enforcement)

## Problem

The `/studios/:studioId/creators/availability` endpoint is intentionally loose: it returns a broad searchable list for creator-mapping discovery without enforcing roster membership, overlap conflicts, or eligibility constraints. This was the right trade-off at launch, but it means the availability response cannot be trusted as a definitive "can assign" signal.

Consequences today:

- A creator can be assigned to overlapping shows with no conflict signal in the UI.
- A creator who is inactive in the studio roster can still appear as available.
- The creator-mapping UI has no way to surface conflict metadata (`is_conflicted`, `conflict_reason`) to guide the operator's assignment decision.
- Now that the creator roster feature ships and roster state is studio-operator-managed, availability behavior needs to reflect that state — otherwise the roster is a form with no enforcement consequence.

Key questions unanswered today:

- *"Is this creator already assigned to another show in the same time window?"*
- *"Should inactive roster creators be hidden, shown with a warning, or blocked from assignment?"*
- *"What error does the assignment endpoint return if a conflict exists — and is it distinguishable from a permission error?"*

## Users

- **Studio ADMIN / MANAGER**: use creator-mapping UI for assignment; need to see conflict metadata to make informed decisions
- **Backend**: assignment endpoint needs a consistent eligibility contract to enforce

## Existing Infrastructure

| Endpoint / Model | Current Behavior | Status |
| --- | --- | --- |
| `GET /studios/:studioId/creators/availability` | Broad discovery mode, no conflict enforcement | ✅ Exists (intentionally loose) |
| `ShowCreator` | Records current show–creator assignments | ✅ Exists |
| `Creator.deletedAt` / roster active status | Soft-delete exists; roster active/inactive is now studio-operator-managed on `StudioCreator` | ✅ Exists |
| Creator-mapping assignment endpoint | Accepts any creator without eligibility check | ✅ Exists |

## Requirements

### In Scope

1. **Dual-mode availability endpoint** — extend `GET /studios/:studioId/creators/availability` with an optional query param `strict=true`.

   - `strict=false` (default, current behavior): broad discovery list, no conflict enforcement. Preserves existing creator-mapping search UX.
   - `strict=true`: enforces roster membership, show-time overlap conflicts, and active status. Returns `is_conflicted` and `conflict_reason` per creator in the response.

2. **Conflict metadata in response** — when `strict=true`, each creator entry includes:
   - `is_conflicted: boolean` — true if any enforcement rule blocks assignment
   - `conflict_reason: "OVERLAP" | "NOT_IN_ROSTER" | "INACTIVE"` — first applicable reason (priority order: overlap > not in roster > inactive)
   - `conflicting_show_id?: string` — when `conflict_reason` is `OVERLAP`, the show causing the conflict

3. **Overlap detection logic** — a creator is flagged as `OVERLAP` when they are already assigned via `ShowCreator` to a show whose time window intersects with the target show's time window. Same-show assignments (creator already on the target show) are **not** flagged as conflicts.

4. **Roster membership enforcement in strict mode** — a creator is flagged as `NOT_IN_ROSTER` when they exist in the system catalog but are not in the studio's creator roster. Gate definition aligns with the shipped studio creator roster feature.

5. **Inactive roster creator handling in strict mode** — a creator who is soft-deleted or marked inactive in the studio roster is flagged as `INACTIVE` and excluded from the default response list unless an `include_inactive=true` param is passed.

6. **Assignment endpoint eligibility check** — the creator-mapping assignment endpoint enforces strict-mode rules at write time. If the creator has a conflict at assignment time, return a typed error:
   - `CREATOR_OVERLAP_CONFLICT` — creator already assigned to an overlapping show
   - `CREATOR_NOT_IN_ROSTER` — creator not in studio roster (enforced after creator roster feature ships)
   - These are distinct from 403 (authorization) and 404 (not found).

### Out of Scope

- Automatic conflict resolution or re-assignment suggestions
- Multi-creator batch conflict checking beyond per-creator flags
- Retroactive conflict detection on existing assignments (only new assignments are checked)
- Availability enforcement for task-helper assignment (out of scope for this PRD)
- Tiered/volume assignment policies (Phase 5+)

## Dual-Mode API Shape

```
GET /studios/:studioId/creators/availability?strict=false   ← current behavior, no change
GET /studios/:studioId/creators/availability?strict=true&show_id=show_xyz
  → per-creator: { uid, name, ..., is_conflicted, conflict_reason?, conflicting_show_id? }
```

The `show_id` param is required when `strict=true` (needed to evaluate time-window overlap).

## Sequencing Dependency

This PRD **must not be implemented before** the Studio Creator Roster feature ships the creator roster state to the studio-operator level. Reason: strict mode's `NOT_IN_ROSTER` rule is only meaningful once the roster is studio-operator-managed. Implementing the strict mode flag before the roster exists would gate on incomplete state.

Recommended sequencing:
1. Studio Creator Roster feature — implements roster CRUD and active/inactive state
2. This PRD — adds `strict=true` mode that enforces roster state

The `OVERLAP` check (requirement 3) can be implemented independently of the roster, so a phased approach is valid: ship overlap detection first, then add roster-based rules in a second iteration.

## Acceptance Criteria

- [ ] `GET /availability?strict=false` returns the existing broad list with no behavior change.
- [ ] `GET /availability?strict=true&show_id=<id>` requires `show_id`; returns 400 if omitted.
- [ ] Each creator in strict-mode response includes `is_conflicted`, `conflict_reason`, and `conflicting_show_id` (when applicable).
- [ ] Creators with overlapping `ShowCreator` assignments have `conflict_reason: "OVERLAP"` and `conflicting_show_id` set.
- [ ] Creators not in studio roster have `conflict_reason: "NOT_IN_ROSTER"` (after creator roster feature ships).
- [ ] Inactive/deleted roster creators have `conflict_reason: "INACTIVE"` unless `include_inactive=true`.
- [ ] Assignment endpoint returns typed `CREATOR_OVERLAP_CONFLICT` error (not 403) when overlap exists at write time.
- [ ] Error codes are defined in `@eridu/api-types`.
- [ ] Discovery mode (`strict=false`) is unchanged — no regression on existing creator-mapping flows.

## Product Decisions

- **Default stays loose** — `strict=false` is the default to preserve the existing broad-search UX. Operators must opt in to strict checking (creator-mapping UI will use `strict=true` on the confirmation step, not the search step).
- **First conflict wins** — priority order for `conflict_reason` is: overlap > not in roster > inactive. Only the highest-priority reason is returned to keep the contract simple.
- **No hard-block on discovery** — conflicted creators are still returned in `strict=true` responses with `is_conflicted=true`. The UI decides whether to visually disable, warn, or hard-block the action. The assignment endpoint is the authoritative enforcement point.

## API Contract

### Strict-Mode Response DTO

When `strict=true`, each creator entry in the response includes conflict metadata:

```json
{
  "creator_id": "crt_abc123",
  "name": "Creator Name",
  "is_conflicted": true,
  "conflict_reason": "OVERLAP",
  "conflicting_show_id": "show_xyz789"
}
```

When `is_conflicted=false`, `conflict_reason` and `conflicting_show_id` are omitted (not present in response).

### `include_inactive` Behavior

- Default (`include_inactive=false`): inactive/deleted roster creators are excluded from the response entirely — they do not count toward pagination totals.
- `include_inactive=true`: inactive creators are included with `conflict_reason: "INACTIVE"` and `is_conflicted: true`. They appear in the response and count toward totals.

### Error Codes (Assignment Endpoint)

| Code | HTTP Status | Condition |
| --- | --- | --- |
| `CREATOR_OVERLAP_CONFLICT` | 409 | Creator already assigned to show with overlapping time window |
| `CREATOR_NOT_IN_ROSTER` | 422 | Creator not in studio roster (enforced after creator roster feature ships) |

These are distinct from 403 (authorization) and 404 (not found). Defined in `@eridu/api-types`.

### Edge Cases

- **Same-show re-assignment**: a creator already assigned to the target show is **not** flagged as an overlap conflict. Re-assignment with different compensation terms is an update operation handled by the existing assignment endpoint.
- **Show without times**: if the target show has no `startTime`/`endTime`, overlap detection is skipped (no time window to compare). The creator is returned as non-conflicted for the overlap rule.
- **Multiple overlaps**: if a creator overlaps with more than one show, `conflicting_show_id` returns the first overlapping show found (deterministic by earliest `startTime`).

## Design Reference

- Backend API design: `apps/erify_api/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md`
- Frontend design: `apps/erify_studios/docs/design/CREATOR_AVAILABILITY_HARDENING_DESIGN.md`
- Creator roster dependency: `docs/features/studio-creator-roster.md`
- Authorization reference: `apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md`
