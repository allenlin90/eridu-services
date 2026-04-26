# Compensation Line Items + Freeze + Actuals + Approval + Grace — Frontend Design (2.2)

> **Status: Visioning — may be misaligned.** This design doc was written against the pre-simplification version of the Phase 4 cost model. The Phase 4 stack has since been narrowed to a read-only viewer (see [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)). The corresponding sibling PRD is itself visioning. Treat this document as roadmap reference: it is **not committed**, may contain assumptions that no longer hold (freeze, settlement, grace, dispute flow — none in Phase 4), and will be rewritten when this workstream activates.

> **Status**: 🔲 Planned — design fills in when 2.2 starts
> **Phase scope**: Phase 4 — Wave 2 (Cost Foundation)
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
> **Cost-model authority**: [`docs/prd/economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
> **Backend counterpart**: [`COMPENSATION_LINE_ITEMS_DESIGN.md`](../../../erify_api/docs/design/COMPENSATION_LINE_ITEMS_DESIGN.md)

## Routes

| Route                                                      | Purpose                                                | Access                                              |
| ---------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `/studios/$studioId/compensation`                          | ADMIN/MANAGER compensation management workspace        | `ADMIN`, `MANAGER`                                   |
| `/studios/$studioId/creators/$creatorId/compensation`      | Creator compensation drill-in (cross-user)             | `ADMIN`, `MANAGER`, `TALENT_MANAGER`                 |
| `/studios/$studioId/members/$membershipId/compensation`    | Operator compensation drill-in (cross-user)            | `ADMIN`, `MANAGER`                                   |
| `/me/studios/$studioId/compensation`                       | Authed user's own compensation in the studio           | Authenticated                                        |
| `/studios/$studioId/settings/grace-and-corrections`        | Studio settings: grace windows + `allowManagerCorrections` | `ADMIN`                                              |
| `/studios/$studioId/shows/$showId` (existing, extended)    | Inline post-production show-actuals form + approval action  | `ADMIN`, `MANAGER`                              |
| `/studios/$studioId/shifts/$shiftId` (existing, extended)  | Inline shift-block actuals form + shift approval action | `ADMIN`, `MANAGER`                                   |
| `/studios/$studioId/members` (existing)                    | Inline member compensation summaries                   | existing member-roster roles                        |
| `/studios/$studioId/creators` (existing)                   | Inline creator compensation summaries                  | existing creator-roster roles                       |

`hasStudioRouteAccess` adds: `compensation`, `studio-settings-grace`. Self routes inherit auth-only access.

The `/me/...` route auto-resolves the authed user's role(s) in the studio: member-only shows operator view, creator-only shows creator view, dual-role shows both with tabs.

## Query-key families

- `compensation-items` — line-item list, scoped by studio + filter shape.
- `creator-compensation-view` — keyed by `studioId + creatorId + dateRange`.
- `member-compensation-view` — keyed by `studioId + membershipId + dateRange`.
- `me-compensation-view` — keyed by `studioId + dateRange + role` (creator/operator).
- `show-actuals` — keyed by `studioId + showId`.
- `shift-block-actuals` — keyed by `studioId + shiftId`.
- `studio-grace-settings` — keyed by `studioId`.

Mutations invalidate the relevant list / view / roster-summary queries. Show approval / reopen mutations invalidate compensation views and show-detail queries for the affected show. Shift approval / reopen mutations invalidate compensation views and shift-detail queries for the affected shift.

## UX rules

- **Frozen vs adjustment is always visible.** Compensation views surface frozen agreement total and adjustment total separately; never collapse.
- **Approval state is explicit.** Each show row shows `actuals_approval_state ∈ {PENDING_APPROVAL, APPROVED, REOPENED}` with distinct visual treatment. Rows with both show-time and shift-block components can expose component-level states or a row-level aggregate plus detail. Pre-approval values render with a "pending review" tag.
- **`actuals_source` is exposed.** Time-driven rows show which source drove the calculation (`PLATFORM_API` / `PLATFORM_UPLOAD` / `OPERATOR_RECORD` / `CREATOR_APP` / `PUNCH_CLOCK` / `PLANNED`) and the values from any other recorded sources for reference.
- **`grace_applied` is shown.** When grace normalizes a late start or early leave to scheduled, the row shows a small indicator with the grace-window value as a tooltip. Early arrival and late departure do not increase base paid duration.
- **Partial / unresolved states are explicit.** Never show `null` as `0`. `cost_state ∈ {PROJECTED, ACTUALIZED, PARTIAL_ACTUAL, UNRESOLVED}` drives row labeling; `unresolved_reason` populates explanatory copy.
- **Freeze is communicated, not hidden.** Once a show is past its `endTime`, the create-line-item dialog labels the result as an "Adjustment"; agreement-field forms (rate, type, commission rate) become read-only with a "Frozen at show-end" indicator. Same pattern at shift-end for shift agreement fields.
- **Manager corrections gated by studio setting.** When `Studio.allowManagerCorrections = false`, MANAGER cannot create post-freeze line items. The UI hides the "Add adjustment" action and surfaces a tooltip pointing to ADMIN.
- **Approval action is owner-specific.** Manager reviews show actuals and clicks **Approve show actuals** on the show. Manager reviews shift-block actuals and clicks **Approve shift actuals** on the shift. Reopen is ADMIN-only and requires a reason; UI uses a confirmation dialog with the required reason field.
- **Actuals entry is allowed pre-approval, blocked post-approval.** Show actuals are blocked after `Show.actualsApprovedAt`; shift-block actuals are blocked after parent `StudioShift.actualsApprovedAt`. When approved, the form is read-only with a "Reopen to edit" action (ADMIN only).
- **Roster default edits are forward-looking.** Creator roster rate edits warn that existing assignment snapshots do not change automatically; for already-assigned future shows, managers use an explicit update action.
- **`createdBy` is shown on every line item** so creators / members can see who entered each entry.
- **Audit-log access for ADMIN.** A small "View audit log" affordance on each show's actuals card links to a filtered view of `ActualsAuditLog` for that show.

## Component plan

- Compensation management route: filter bar + table + create/edit dialog + soft-delete confirmation.
- Compensation view (creator and member variants): agreement section + adjustments section + total + per-show breakdown with `actuals_source`, `actuals_approval_state`, and `grace_applied` indicators.
- `/me/...` self route: same compensation-view component, hydrated from the authed user's resolved associations.
- Inline summary cards on member / creator roster rows.
- Show detail extension: compact post-production show-actuals form + approve / reopen action + frozen-state indicator + audit-log link (ADMIN).
- Shift detail extension: compact shift-block actuals form + approve / reopen action + audit-log link (ADMIN).
- Grace + corrections settings page: simple form with the four grace ints + the toggle.

## Data Layer Rules

- Monetary values come from the API as strings (serialized `Prisma.Decimal`). Format for display only; never sum or compute locally.
- Version-guarded write paths handle `409 LINE_ITEM_FROZEN` / `409 SHOW_FROZEN` / `409 SHIFT_FROZEN` / `409 ACTUALS_APPROVED` as refetch + user-review flows. `ACTUALS_APPROVED` messaging names the relevant owner: show actuals or shift actuals.
- `400 REOPEN_REASON_REQUIRED` is enforced client-side before the request fires (form validation).
- `404 SELF_NOT_FOUND_IN_STUDIO` on `/me/...` shows a "no compensation in this studio" empty state.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke:
  - create / edit / delete pre-freeze line item;
  - create post-freeze adjustment as ADMIN; verify MANAGER blocked when setting off;
  - enter show actuals pre-approval; verify edit blocked after show approval;
  - enter shift-block actuals pre-approval; verify edit blocked after shift approval;
  - approve show actuals and shift actuals as MANAGER; reopen each as ADMIN with required reason;
  - verify pre-approval render shows "pending review" tag;
  - verify `grace_applied` indicator on a show with actuals within the grace window;
  - verify partial-actual rendering for COMMISSION creator without revenue;
  - verify `/me/...` self route resolves correctly for member-only / creator-only / dual-role users;
  - verify ADMIN audit-log access from show detail.

## Traceability

- Product PRD: [`compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
- Cost model: [`economics-cost-model.md`](../../../../docs/prd/economics-cost-model.md)
- Architecture guardrails: [`PHASE_4.md#architecture-guardrails`](../../../../docs/roadmap/PHASE_4.md#architecture-guardrails)
- Roadmap: [`PHASE_4.md`](../../../../docs/roadmap/PHASE_4.md)
