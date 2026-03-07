# PRD: MC Mapping & Talent Operations

> **Status**: Draft
> **Phase**: 4 — P&L Visibility & MC Operations
> **Workstream**: 2
> **Depends on**: [RBAC Roles](./rbac-roles.md)

## Problem

Talent managers assign MCs to shows one at a time through system-admin endpoints or via Google Sheets import. For 100+ shows per month this is slow, error-prone, and offers no visibility into MC availability or booking conflicts.

## Users

- **Talent managers**: map MCs to shows, check availability, manage assignments
- **Studio admins**: oversight of MC-show assignments across the studio

## Requirements

### Bulk MC-to-show mapping

1. Assign multiple MCs to multiple shows in a single operation
2. Idempotent — skip existing assignments, create missing ones
3. Summary response: created, skipped, errors (same pattern as task assignment)
4. Shared API contract in `@eridu/api-types`
5. Accessible to: admin, manager, talent_manager

### Studio-scoped MC endpoints

1. View MCs assigned to a show
2. Add/remove individual MC from a show
3. Studio-scoped authorization (not admin-only)

### MC availability

1. Query MCs not booked for overlapping shows in a date range
2. Simple conflict check against ShowMC + show start/end times
3. Powers the assignment UI picker

### MC mapping UI

1. Shows list bulk action: "Assign MCs" → dialog with MC picker
2. Availability indicators in picker
3. Show detail: MC list with inline add/remove

## Acceptance Criteria

- [ ] Talent manager can bulk-assign MCs to shows via studio endpoint
- [ ] Duplicate MC-show assignments are silently skipped
- [ ] MC availability query returns only unbooked MCs for the window
- [ ] Shows detail page displays assigned MCs with add/remove actions
- [ ] Assignment dialog shows availability status per MC

## Product Decisions

- MCs are **not** studio-scoped (can work across studios)
- MC profile/HR table for grooming/styling is future (use `metadata` for now)
- HRMS for leaves/unavailability is future — start with show-booking conflict only

## Design Reference

- Technical design: TBD → `apps/erify_api/docs/design/MC_MAPPING_DESIGN.md`
