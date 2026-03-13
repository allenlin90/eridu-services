# PRD: RBAC Roles

> **Status**: Draft
> **Phase**: 4 — P&L Visibility & Creator Operations
> **Workstream**: 1 (prerequisite for all Phase 4 features)

## Problem

Studio membership has three roles (`admin`, `manager`, `member`) with no functional differentiation between admin and manager. Specialized functions — talent management, design, moderation management — cannot be scoped to the right people.

## Users

| Role                 | Responsibility                                   |
| -------------------- | ------------------------------------------------ |
| `TALENT_MANAGER`     | Creator scheduling, assignment, availability, HR prep |
| `DESIGNER`           | Scene design, graphic assets, material creation  |
| `MODERATION_MANAGER` | Script management, moderation task oversight     |

## Requirements

1. Add `TALENT_MANAGER`, `DESIGNER`, `MODERATION_MANAGER` to `StudioMembership.role` enum
2. `MANAGER` has the same access as `ADMIN` except for studio membership management
3. `TALENT_MANAGER` scope is creator mapping only — catalog, roster, availability, show assignment/removal
4. `DESIGNER` and `MODERATION_MANAGER` have member-level access (own tasks and shifts only)
5. New roles must integrate with `@StudioProtected()` guards
6. Shared `@eridu/api-types` role constants updated

## Role Access Matrix

| Feature                      | MEMBER | DESIGNER | MODERATION_MANAGER | MANAGER | TALENT_MANAGER | ADMIN |
| ---------------------------- | ------ | -------- | ------------------ | ------- | -------------- | ----- |
| Dashboard                    | ✅      | ✅        | ✅                  | ✅       | ✅              | ✅     |
| My Tasks                     | ✅      | ✅        | ✅                  | ✅       | ✅              | ✅     |
| My Shifts                    | ✅      | ✅        | ✅                  | ✅       | ✅              | ✅     |
| Tasks (assignment/ops)       | ❌      | ❌        | ❌                  | ✅       | ❌              | ✅     |
| Shifts (management)          | ❌      | ❌        | ❌                  | ✅       | ❌              | ✅     |
| Shows + creator mapping      | ❌      | ❌        | ❌                  | ✅       | ✅              | ✅     |
| Creator catalog/roster       | ❌      | ❌        | ❌                  | ✅       | ✅              | ✅     |
| Task templates               | ❌      | ❌        | ❌                  | ✅       | ❌              | ✅     |
| Studio membership management | ❌      | ❌        | ❌                  | ❌       | ❌              | ✅     |

## Acceptance Criteria

- [ ] New roles can be assigned to studio memberships via admin API
- [ ] `@StudioProtected([STUDIO_ROLE.TALENT_MANAGER])` restricts endpoint access to the correct role
- [ ] `MANAGER` can access all studio features except membership management
- [ ] API types package exports new role constants

## Design Reference

- Technical design: [apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)
