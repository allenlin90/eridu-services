# Compensation Line Items Backend Design

> **Status**: Planning
> **Phase scope**: Phase 4 post-Wave 1
> **Owner app**: `apps/erify_api`
> **Product source**: [`docs/prd/compensation-line-items.md`](../../../../docs/prd/compensation-line-items.md)
> **Depends on**: Studio member roster ✅, studio creator roster 🔲, economics baseline revision ⏸️

## Purpose

Add manual supplemental compensation items for memberships and studio creators, using a polymorphic target table that can feed both compensation breakdown views and economics aggregation.

## API Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /studios/:studioId/compensation-items` | List/filter line items |
| `POST /studios/:studioId/compensation-items` | Create a line item plus target link |
| `PATCH /studios/:studioId/compensation-items/:uid` | Update mutable fields |
| `DELETE /studios/:studioId/compensation-items/:uid` | Soft-delete |
| `GET /studios/:studioId/members/:membershipId/compensation` | Member compensation breakdown |
| `GET /studios/:studioId/creators/:creatorId/compensation` | Creator compensation summary |

## Persistence Plan

- Add `CompensationLineItem` as the fact table.
- Add `CompensationTarget` as the polymorphic join (`targetType`, `targetId`, nullable typed FKs).
- Keep both tables additive and soft-delete aware.
- Follow the `TaskTarget` pattern for Prisma referential integrity.

## Aggregation Rules

- No implicit proration across shows in Phase 4.
- Show/client economics include show-scoped line items only.
- Schedule grouping includes show-scoped roll-up plus schedule-scoped items.
- Standing/global items remain visible in compensation breakdown endpoints but stay out of economics until a future allocation policy exists.
- Member economics use `calculatedCost ?? projectedCost` as the shift basis before line items.
- Creator responses expose line-item subtotal separately; unresolved commission/hybrid base cost remains `null`.

## Validation / Error Plan

- Validate `item_type`, amount sign, target type, studio ownership, and soft-delete state.
- Allow `show_id` and `schedule_id` to both be null.
- If both are provided, require `show.scheduleId == schedule_id`; otherwise return `SCOPE_MISMATCH`.
- Reject new items for inactive targets while preserving historical items on inactive targets.

## Authorization

- CRUD list/read: `ADMIN`, `MANAGER`
- Write: `ADMIN`
- Member self-review: `ADMIN` or self
- Creator summary: `ADMIN`, `MANAGER`, `TALENT_MANAGER`

## Verification

- `pnpm --filter erify_api lint`
- `pnpm --filter erify_api typecheck`
- `pnpm --filter erify_api build`
- `pnpm --filter erify_api test`
- Targeted smoke: membership target, studio-creator target, scope mismatch, economics roll-up, commission/hybrid creator subtotal

