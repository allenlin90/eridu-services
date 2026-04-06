# Known Issues & Technical Debt

> Last updated: 2026-03-11

## Current Status

As of Feb 2026, the major service-layer violations have been resolved. The patterns are now stable.

## Phase 4 Completion Note (March 2026)

- Phase 4 (creator mapping + assignment) is complete and merged.
- Merge policy was direct creator cutover (alpha environment, low external-user risk).
- New temporary `mc` compatibility layers should not be introduced unless a blocker is explicitly documented.

> **Note**: `CLAUDE.md` previously stated "14/18 models violate patterns" — this was accurate
> before the Feb 2026 refactor. The claim has since been superseded by the resolutions below.
> If you encounter a model that still violates patterns, file it here.

---

## ✅ RESOLVED: Service Layer Violations (Feb 2026)

All services now follow correct patterns:
- Payload types defined in schema files (not inline in service)
- No `Prisma.*` types in service method signatures
- Repository handles where-clause building

**Do NOT copy patterns from these models** (they were the worst offenders, now fixed but not yet verified as fully clean):
- `user.service.ts` — had inline Prisma types; verify before copying
- `studio.service.ts` — similar history; verify before copying
- `show.service.ts` — verify before copying

**Safe to copy from:**
- ✅ `task.service.ts` — best model service example
- ✅ `task-template.service.ts` — best service with business logic
- ✅ `membership/schemas/studio-membership.schema.ts` — best schema example
- ✅ `task-orchestration.service.ts` — best orchestration service example

---

## ✅ RESOLVED: Module Export Policy (Feb 2026)

All modules now strictly export Services only. Repositories are internal implementation details.
Join tables (e.g. `TaskTarget`) now have their own thin services that wrap their repositories.

---

## ✅ RESOLVED: TaskOrchestration Pattern (Feb 2026)

The `TaskOrchestrationService` + `TaskGenerationProcessor` pattern is now established:
- Orchestration Service coordinates model services
- Processor Service holds `@Transactional()` boundary (required for NestJS DI proxy)
- See skill: [orchestration-service-nestjs](../skills/orchestration-service-nestjs/SKILL.md)

---

## Active: Models Needing Verification

These models have not been reviewed post-refactor. Do not copy from them until verified:

| Model           | Files                    | Risk    |
| --------------- | ------------------------ | ------- |
| `client`        | client.service.ts        | Unknown |
| `mc`            | mc.service.ts            | Unknown |
| `platform`      | platform.service.ts      | Unknown |
| `show-standard` | show-standard.service.ts | Unknown |
| `show-status`   | show-status.service.ts   | Unknown |
| `show-type`     | show-type.service.ts     | Unknown |
| `studio-room`   | studio-room.service.ts   | Unknown |

If you edit one of these and find a violation, fix it and move it to RESOLVED above.

---

## Known Good Patterns to Reference

When in doubt, refer to these files:

| Type                  | File                                                    | Why                                 |
| --------------------- | ------------------------------------------------------- | ----------------------------------- |
| Model Service         | `models/task/task.service.ts`                           | Clean pass-through + business logic |
| Service with logic    | `models/task-template/task-template.service.ts`         | Snapshot creation, validation       |
| Orchestration Service | `task-orchestration/task-orchestration.service.ts`      | Multi-service coordination          |
| Schema                | `models/membership/schemas/studio-membership.schema.ts` | Payload types, DTO transforms       |
| Repository            | Any repository file                                     | All follow the pattern correctly    |

---

## Deferred: StudioShift / StudioShiftBlock missing `version` field (March 2026)

Neither `StudioShift` nor `StudioShiftBlock` has a `version Int @default(1)` column for optimistic locking. Concurrent admin edits to the same shift will silently apply last-write-wins semantics.

**Risk**: Low — concurrent dual-admin edits of the same shift are an unlikely user scenario for this domain.
**Action**: Add `version` to both models in the next schema migration pass that already requires a migration for another reason. Do not add a standalone migration for this alone.
**Tracked**: March 2026 — deferred from `feat/studio-shift-schedule` PR review.

---

## Deferred: Studio shared-fields metadata write race (March 2026)

Shared fields settings currently persist to `Studio.metadata.shared_fields` using a read-modify-write flow. Concurrent `ADMIN` updates can overwrite each other (last-write-wins), causing lost updates.

**Risk**: Low for current MVP usage — updates are rare and limited to a small set of studio admins.
**Action**: Move shared fields to a dedicated normalized model/table with DB-level constraints or add optimistic concurrency control on metadata writes when the settings surface expands.
**Tracked**: March 2026 — task submission reporting shared-fields settings rollout.
**Canonical design reference**: `apps/erify_api/docs/TASK_SUBMISSION_REPORTING.md` section `12.8 Shared fields metadata write race (known issue, accepted for MVP)`.

---

## Related Documentation

- [Schema Patterns](./schema-patterns.md) — Three-tier schema architecture
- [Tech Stack](./tech-stack.md) — Module organization standards
- [Ideal Pattern](./ideal-pattern.md) — Complete model template
