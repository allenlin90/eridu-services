# PRD: RBAC Roles

> **Status**: Draft
> **Phase**: 4 — P&L Visibility & MC Operations
> **Workstream**: 1 (prerequisite for all Phase 4 features)

## Problem

Studio membership has three roles (`admin`, `manager`, `member`) with no functional differentiation between admin and manager. Specialized functions — talent management, design, moderation management — cannot be scoped to the right people.

## Users

| Role                 | Responsibility                                   |
| -------------------- | ------------------------------------------------ |
| `TALENT_MANAGER`     | MC scheduling, assignment, availability, HR prep |
| `DESIGNER`           | Scene design, graphic assets, material creation  |
| `MODERATION_MANAGER` | Script management, moderation task oversight     |

## Requirements

1. Add `TALENT_MANAGER`, `DESIGNER`, `MODERATION_MANAGER` to `StudioMembership.role` enum
2. `manager` remains a general role above specific roles but below `admin`
3. Currently `admin` and `manager` have identical authorization — no behavioral regression
4. New roles must integrate with `@StudioProtected()` guards
5. Shared `@eridu/api-types` role constants updated

## Acceptance Criteria

- [ ] New roles can be assigned to studio memberships via admin API
- [ ] `@StudioProtected([STUDIO_ROLE.TALENT_MANAGER])` restricts endpoint access to the correct role
- [ ] Existing admin/manager/member behavior unchanged
- [ ] API types package exports new role constants

## Design Reference

- Technical design: [apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md](../../apps/erify_api/docs/design/AUTHORIZATION_GUIDE.md)
