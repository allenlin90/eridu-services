# Role Access Matrix

> Canonical cross-app RBAC reference for studio-scoped roles.
>
> Purpose: make role policy discoverable in one place for engineering, QA, and agent workflows.

## Scope and Source of Truth

- Role definitions: `packages/api-types/src/memberships/schemas.ts` (`STUDIO_ROLE`)
- Backend enforcement (runtime): `@StudioProtected([roles])` on `erify_api` controllers
- Frontend enforcement (navigation/route policy): `apps/erify_studios/src/lib/constants/studio-route-access.ts` + route guards

This matrix is the canonical policy summary. Runtime behavior is always determined by backend guards and frontend route checks in code.

## Studio Roles

- `ADMIN`
- `MANAGER`
- `MEMBER`
- `TALENT_MANAGER`
- `DESIGNER`
- `MODERATION_MANAGER`

## Backend Access Matrix (Current)

| Capability / Endpoint Group                                     | ADMIN | MANAGER | MEMBER | TALENT_MANAGER | DESIGNER | MODERATION_MANAGER | Evidence                                                     |
| --------------------------------------------------------------- | ----- | ------- | ------ | -------------- | -------- | ------------------ | ------------------------------------------------------------ |
| Studio show list/detail/tasks (`GET /studios/:studioId/shows*`) | Yes   | Yes     | Yes    | Yes            | Yes      | Yes                | Base `@StudioProtected()` on show controller                 |
| Show creator list (`GET /studios/:studioId/shows/:showId/creators`) | Yes | Yes | No | Yes | No | No | `@StudioProtected([ADMIN, MANAGER, TALENT_MANAGER])` on show-creator controller |
| Show creator add/remove                                         | Yes   | Yes     | No     | Yes            | No       | No                 | `@StudioProtected([ADMIN, MANAGER, TALENT_MANAGER])`         |
| Bulk creator assignment (append `PATCH`, replace `PUT`)        | Yes   | Yes     | No     | Yes            | No       | No                 | `@StudioProtected([ADMIN, MANAGER, TALENT_MANAGER])`         |
| Creator availability (`GET /studios/:studioId/creators/availability`) | Yes | Yes | No | Yes | No | No | `@StudioProtected([ADMIN, MANAGER, TALENT_MANAGER])` on studio-creator controller |
| Studio membership roster (`GET /studios/:studioId/studio-memberships`) | Yes | No | No | No | No | No | `@StudioProtected([ADMIN])` on studio-membership controller |
| Studio membership invite (`POST /studios/:studioId/studio-memberships`) | Yes | No | No | No | No | No | `@StudioProtected([ADMIN])` + studio-scoped create endpoint |
| Studio membership role update (`PATCH /studios/:studioId/studio-memberships/:id/role`) | Yes | No | No | No | No | No | Method-level `@StudioProtected([ADMIN])` override on role management endpoint |
| Helper roster toggle (`PATCH /studios/:studioId/studio-memberships/:id/helper`) | Yes | No | No | No | No | No | `@StudioProtected([ADMIN])` + helper endpoint |
| Economics/performance overview endpoints                        | Yes   | Yes     | No     | No             | No       | No                 | `@StudioProtected([ADMIN, MANAGER])` on economics controller |

Notes:
- Talent managers are intentionally included for creator staffing + compensation/cost inputs.
- Talent managers are intentionally excluded from consolidated financial overview endpoints.
- Task assignment helper-readiness is now enforced in backend task orchestration:
  - assignee must be helper-enabled in studio membership metadata, or
  - assignee role is `ADMIN`/`MANAGER`.
- Implementation caveat:
  - helper readiness is currently persisted in `studio_memberships.metadata.task_helper_enabled`.
  - helper toggle path uses optimistic concurrency (`updatedAt` guarded retry) to minimize metadata overwrite conflicts.

## Frontend Route/Workflow Matrix (Current `erify_studios`)

Source map: `apps/erify_studios/src/lib/constants/studio-route-access.ts`

| Route key       | Minimum role in FE policy | Effective access  |
| --------------- | ------------------------- | ----------------- |
| `dashboard`     | `MEMBER`                  | all member+ roles |
| `myTasks`       | `MEMBER`                  | all member+ roles |
| `myShifts`      | `MEMBER`                  | all member+ roles |
| `tasks`         | `MANAGER`                 | manager+          |
| `members` (`Member Roster`) | `ADMIN` | admin only |
| `shifts`        | `ADMIN`                   | admin only        |
| `shows`         | allow-list (`ADMIN`, `MANAGER`) | admin/manager |
| `creators`      | allow-list (`ADMIN`, `MANAGER`, `TALENT_MANAGER`) | admin/manager/talent-manager |
| `taskTemplates` | `ADMIN`                   | admin only        |

Important FE note:
- Current FE role-level map is numeric for `MEMBER`, `MANAGER`, `ADMIN` only.
- New roles (`TALENT_MANAGER`, `DESIGNER`, `MODERATION_MANAGER`) require explicit FE policy mapping before they can be treated as first-class in route-level access.

Current sidebar grouping (FE concern only):
- `Studio Manager`: manager/admin operational workflows (`Review Queue`, `Show Operations`, `Shift Schedule`, `Task Templates`)
- `Studio Admin`: admin-only membership governance (`Member Roster`)
- `Studio Creators`: creator staffing area with two scoped entries
  - `Creator Roster` on `/studios/:studioId/creators`
  - `Creator Mapping` on `/studios/:studioId/creators/mapping`
- The grouping is a UX/navigation concern; backend route permissions remain the canonical enforcement boundary.

Phase 4 status:
- Member roster FE workflow is implemented and scoped to `ADMIN` (`/studios/:studioId/members`).

## Related Docs

- Product overview: `docs/product/README.md`
- Phase scope/status: `docs/roadmap/PHASE_4.md`
- Backend MC operations behavior: `apps/erify_api/docs/MC_OPERATIONS.md`
- Backend economics behavior: `apps/erify_api/docs/SHOW_ECONOMICS.md`
- FE studio role use cases: `apps/erify_studios/docs/STUDIO_ROLE_USE_CASES_AND_VIEWS.md`

## Change Rule (Keep Sync Cost Low)

When changing role policy, update this file in the same PR if either is touched:

1. Any `@StudioProtected([roles])` usage on studio-scoped backend endpoints.
2. `apps/erify_studios/src/lib/constants/studio-route-access.ts` or studio route guard policy.

Do not duplicate full matrices in multiple docs. Other docs should link here.
