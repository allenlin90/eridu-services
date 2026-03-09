# Proposal: Studio MC Roster (`StudioMc`)

> **Status**: Draft (Phase 4 verdict candidate)
> **Prerequisite**: Core Phase 4 features delivered (MC operations, compensation model, P&L views)
> **Scope**: Phase 4 re-baseline extension — additive schema change, no breaking changes

## Problem

The current MC model is global — MCs exist system-wide with no studio association. This works for Phase 4's single-studio P&L (costs derive correctly via `ShowMC → Show.studioId`), but creates gaps as the system scales:

1. **No studio talent pool** — availability queries return all system MCs, not "our MCs"
2. **Compensation defaults are global** — `MC.defaultRate` applies everywhere; if an MC works for two studios at different base rates, every assignment needs manual per-show overrides
3. **No roster management** — no way to express "these MCs belong to Studio X"
4. **MC utilization reporting** — can't report "spend on our talent pool" without deriving it from ShowMC → Show each time

## Proposed Solution

Add a `StudioMc` join table that associates MCs with studios and carries studio-specific default compensation.

### Schema

```prisma
model StudioMc {
  id                    BigInt    @id @default(autoincrement())
  uid                   String    @unique
  studioId              BigInt    @map("studio_id")
  studio                Studio    @relation(fields: [studioId], references: [id], onDelete: Cascade)
  mcId                  BigInt    @map("mc_id")
  mc                    MC        @relation(fields: [mcId], references: [id], onDelete: Cascade)
  defaultRate           Decimal?  @map("default_rate") @db.Decimal(10, 2)
  defaultRateType       String?   @map("default_rate_type")
  defaultCommissionRate Decimal?  @map("default_commission_rate") @db.Decimal(10, 2)
  isActive              Boolean   @default(true) @map("is_active")
  metadata              Json      @default("{}")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  deletedAt             DateTime? @map("deleted_at")

  @@unique([studioId, mcId])
  @@index([studioId, deletedAt])
  @@index([mcId, deletedAt])
  @@map("studio_mcs")
}
```

### 3-Tier Compensation Fallback

Replaces the current 2-tier (`ShowMC → MC`) with:

```
ShowMC.compensationType  → StudioMc.defaultRateType       → MC.defaultRateType
ShowMC.agreedRate        → StudioMc.defaultRate            → MC.defaultRate
ShowMC.commissionRate    → StudioMc.defaultCommissionRate  → MC.defaultCommissionRate
```

Each field resolves independently: the first non-null value wins.

### Behavior Changes

| Area                    | Current                             | Proposed                                           |
| ----------------------- | ----------------------------------- | -------------------------------------------------- |
| Availability query      | Returns all non-booked MCs globally | Filters to MCs in the studio's roster              |
| Creator listing under studio | N/A                             | `GET /studios/:studioId/creators` returns roster   |
| Assignment              | Any MC assignable to any show       | Same, but auto-creates `StudioMc` entry if missing |
| Compensation defaults   | `ShowMC → MC` (2-tier)              | `ShowMC → StudioMc → MC` (3-tier)                  |
| P&L calculation         | Unchanged formula                   | Same formula, richer fallback for default rates    |

## Why Not a StudioMembership MC Role?

The roster mirrors `StudioMembership`'s structural pattern (entity ↔ studio) but is a separate domain concept:

| Concern                         | StudioMembership                                                     | StudioMc                                         |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| Virtual MCs (no User)           | Cannot model — `userId` is required                                  | Supported — references `MC`, not `User`          |
| Dual roles (e.g., MANAGER + MC) | Blocked by `@@unique([userId, studioId])`                            | Independent — membership and roster are separate |
| MC domain fields                | Pollutes auth model with `isBanned`, `aliasName`, compensation types | Clean separation                                 |
| ShowMC references               | Would require refactoring ShowMC → StudioMembership                  | No change — ShowMC still references MC entity    |

`StudioMembership` answers "what can this **user** do in this studio?"
`StudioMc` answers "what **talent** is available to this studio and at what rates?"

## Migration Strategy

### Backfill (one-time, in migration SQL)

1. For each distinct `(Show.studioId, ShowMC.mcId)` pair where both are non-null and non-deleted, insert a `StudioMc` record
2. Copy `MC.defaultRate`, `MC.defaultRateType`, `MC.defaultCommissionRate` to each `StudioMc` entry (one studio currently, so global = studio-specific)

### Local HITL Workflow (Branch Iterations)

Use deterministic local reset for each schema iteration:

1. `pnpm --filter erify_api db:migrate:reset`
2. `pnpm --filter erify_api db:migrate:deploy`
3. `pnpm --filter erify_api db:seed`
4. Optional cross-app auth mapping sync:
   - `pnpm --filter erify_api db:extid:sync`

Branch rule: keep one consolidated feature-branch migration directory for this initiative until merge.

### Why P&L Numbers Don't Change

The 3-tier fallback produces identical results to the current 2-tier because `StudioMc` defaults are initialized from `MC` globals. The new middle tier is only additive — it never removes a fallback path.

### Code Changes

| Change                              | Files                                     | Risk                         |
| ----------------------------------- | ----------------------------------------- | ---------------------------- |
| Prisma schema: add `StudioMc` model | `schema.prisma` + migration               | Zero — additive              |
| Backfill migration                  | migration SQL                             | Low — scripted               |
| `computeMcCost` fallback            | `studio-economics.service.ts`             | Low — add middle tier lookup |
| Availability query                  | `mc.repository.ts` (`findAvailableMcs`)   | Low — add roster filter      |
| Auto-roster on assignment           | `studio-show-mc.orchestration.service.ts` | Low — upsert convenience     |
| Roster CRUD endpoints               | `studio-creator.controller.ts`                 | Low — new endpoints          |

## Docs to Update (When Implemented)

- `docs/roadmap/PHASE_4.md` — add workstream, update design decisions table
- `apps/erify_api/docs/MC_OPERATIONS.md` — add roster section, update compensation model
- `apps/erify_api/docs/SHOW_ECONOMICS.md` — update computation to show 3-tier fallback
- `docs/product/BUSINESS.md` — update MC section, add `studio_mcs` to ER diagram
- `docs/product/ROLE_ACCESS_MATRIX.md` — add roster endpoint access rows
