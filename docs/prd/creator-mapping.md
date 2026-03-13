# PRD: Creator Mapping & Talent Operations

> **Status**: Draft
> **Phase**: 4 — P&L Visibility & Creator Operations
> **Workstream**: 2
> **Depends on**: [RBAC Roles](./rbac-roles.md)

## Problem

Talent managers assign creators to shows one at a time through system-admin endpoints or via Google Sheets import. For 100+ shows per month this is slow, error-prone, and offers no visibility into creator availability or booking conflicts.

## Users

- **Talent managers**: map creators to shows, check availability, manage assignments
- **Studio admins**: oversight of creator-show assignments across the studio

## Requirements

### Bulk creator-to-show mapping

1. Assign multiple creators to multiple shows in a single operation
2. Idempotent — skip existing assignments, create missing ones
3. Summary response: assigned, skipped, failed
4. Shared API contract in `@eridu/api-types`
5. Accessible to: admin, manager, talent_manager

### Studio-scoped creator endpoints

1. View creators assigned to a show
2. Add/remove individual creator from a show
3. Studio-scoped authorization (not admin-only)

### Creator availability

1. Query creators not booked for overlapping shows in a date range
2. Simple conflict check against ShowCreator + show start/end times
3. Powers the assignment UI picker

### Creator mapping UI

1. Shows list bulk action: "Assign Creators" -> dialog with creator picker
2. Availability indicators in picker
3. Show detail: creator list with inline add/remove

## Acceptance Criteria

- [ ] Talent manager can bulk-assign creators to shows via studio endpoint
- [ ] Duplicate creator-show assignments are silently skipped
- [ ] Creator availability query returns only unbooked creators for the window
- [ ] Shows detail page displays assigned creators with add/remove actions
- [ ] Assignment dialog shows availability status per creator

## Product Decisions

- Creators are **not** studio-scoped (can work across studios)
- Creator profile/HR table for grooming/styling is future (use `metadata` for now)
- `metadata` must remain descriptive only; compensation formulas/bonus rules are out of this scope
- Assignment `metadata` is persisted as opaque JSON context for operations/audit (for example `source`, `operator_note`, `tags`) and is not used as execution logic
- HRMS for leaves/unavailability is future — start with show-booking conflict only

## Design Reference

- Backend feature doc: `apps/erify_api/docs/PHASE_4_PNL_BACKEND.md`
- Frontend feature doc: `apps/erify_studios/docs/PHASE_4_PNL_FRONTEND.md`
