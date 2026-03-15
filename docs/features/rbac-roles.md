# Feature: RBAC Roles

> **Status**: ✅ Shipped — Phase 4
> **Workstream**: 1 (prerequisite for all Phase 4 features)
> **Canonical docs**: [STUDIO_ROLE_USE_CASES_AND_VIEWS.md](../../apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md), [AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)

## Problem

Studio membership had three roles (`admin`, `manager`, `member`) with no functional differentiation between admin and manager. Specialized functions — talent management, design, moderation management — could not be scoped to the right people.

## Users

| Role                 | Responsibility                                   |
| -------------------- | ------------------------------------------------ |
| `TALENT_MANAGER`     | Creator scheduling, assignment, availability     |
| `DESIGNER`           | Scene design, graphic assets, material creation  |
| `MODERATION_MANAGER` | Script management, moderation task oversight     |

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

## Key Product Decisions

- `MANAGER` has the same access as `ADMIN` except for studio membership management.
- `TALENT_MANAGER` scope is creator operations only — catalog, roster, availability, show assignment/removal.
- `DESIGNER` and `MODERATION_MANAGER` have member-level access (own tasks and shifts only). Their role names exist to enable future feature gating without schema changes.
- Roles live on `StudioMembership.role`; all enforcement uses `@StudioProtected([...roles])` guards — no separate permission table.

## Acceptance Record

- [x] All three roles added to `STUDIO_ROLE` constant in `@eridu/api-types`
- [x] `@StudioProtected([STUDIO_ROLE.TALENT_MANAGER])` restricts creator endpoints correctly
- [x] `MANAGER` can access all studio features except membership management
- [x] Roles assignable via admin API
