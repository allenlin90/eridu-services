---
name: backend-verified-conventions
description: Cross-cutting erify_api backend conventions confirmed correct/incorrect across many PR reviews (Prisma leakage, CLS/txHost, version field, StudioParam)
metadata:
  type: project
---

## Service Layer Rule: No Prisma.* Types
Services MUST NOT import `Prisma.*` types — including `Prisma.JsonValue`, `Prisma.ShowGetPayload`, etc.
Use `unknown` or a local structural type alias instead. A service selected for
shallow direct persistence may use its generated delegate privately, but
public signatures must remain schema/domain typed. Complex Prisma shapes stay
inside a private repository/query provider.
- `studio-shift.service.ts` — CLEAN. No Prisma imports; uses local JsonValue/JsonObject alias and repository pass-through.
- `shift-alignment.service.ts` — CLEAN (fixed in feat/studio-shift-schedule PR review). Replaced `Prisma.ShowGetPayload<>` with local `ShowWithPlanningContext` interface; replaced `TaskType` enum with `REQUIRED_SHOW_TASK_TYPES` string literal array.

## Schema Layer: Internal BigInt Risk Mitigated
Previously flagged `studioShiftBlockSchema` with `id: z.bigint()` — this was CORRECTED in the final branch.
The schema now uses `_internalShiftBlockShape` (prefixed with `_` to signal internal use only) which has no BigInt fields.
The BigInt PKs exist only in repository code (`StudioShiftWithRelations` type). No public Zod schemas expose BigInt.
Scene QC (PR #345) uses the same idiom without the `_` prefix but clearly commented "Internal entity shapes (DB row -> DTO
transform input)" — bigint id never actually serialized, always transformed to `uid` before `.pipe()` to the public response schema. Accept both spellings of this pattern.

## @StudioParam() vs @Param() in Studio Controllers
Established pattern: studio-scoped routes should use `@StudioParam()` to read from `req.studioMembership.studio.uid`.
`studio-shift.controller.ts` and `shift-calendar.controller.ts` use `@Param('studioId', UidValidationPipe)` instead.
This is a pattern inconsistency (not a security bypass — StudioProtected guard still validates membership).
**Note**: `@StudioParam()` decorator does not actually exist in the codebase — confirmed false positive. All studio controllers use `@Param('studioId', new UidValidationPipe(...))` consistently. Stop citing `@StudioParam()` as if it's a real decorator to check for.

## Universal Model Fields: version is mandatory
All writable models must have `version: number` for optimistic locking. Known deferred exceptions (do not re-flag as new
findings, they are tracked technical debt): `StudioShift`/`StudioShiftBlock` (feat/studio-shift-schedule), `Show`
(last-write-wins per Studio Show Management design decision 1).

## Persistence Pattern: CLS Transaction Participation
All transaction-dependent persistence—direct service or repository—must use `this.txHost.tx` (CLS transaction adapter)
instead of an unbounded `this.prisma` client. Exceptions confirmed acceptable: read-only lookup repositories that never
run inside a transaction (`TaskReportScopeRepository`, `ScheduleRepository.findActiveByStudioUid`) may use `this.prisma`
directly. Internal operator/script-only services (see `task-template-script-exceptions.md`) are also exempt.

## Repository method necessity: recurring judgment calls
- Single-caller shallow `findFirst`/`findMany` repository methods sometimes lack the literal `// Engineering decision:`
  tag even with a justifying docstring. Treat as WARNING, not blocking, when the method is the model's canonical
  findOne/findByUid-equivalent lookup or the reasoning is evident from the docstring — but note the inconsistency when
  sibling methods in the same file/PR do use the tag.
- A service-level named method that wraps `findMany` with a flat `where` (not on a repository) does NOT violate the
  repository-method-proliferation rule — e.g. `ScheduleService.listActiveSchedulesByStudioUid`. The rule targets
  repository classes specifically.
- Guarded real-DB integration gate (`apps/erify_api/test/`, self-contained docker-compose) applies whenever a diff adds
  a repository `extends BaseRepository` or wires a new module into `AppModule`/`McpAppModule`. Don't trust a PR's own
  "gate doesn't apply" self-assessment — check the diff and run it yourself; it's cheap (~15s).
