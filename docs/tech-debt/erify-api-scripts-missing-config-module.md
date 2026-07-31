# Accepted: Two operator scripts likely can't bootstrap (missing `ConfigModule.forRoot()`)

**Status:** Accepted (low priority, unconfirmed) · **Area:** `erify_api` standalone NestJS scripts
**Origin:** Scene QC main integration PR (#343) wrap-up, discovered while running `backfill-scene-qc-evidence-refs.ts`

## Context

`backfill-scene-qc-evidence-refs.ts` and `verify-scene-qc-evidence-bindings.ts` shipped with a
`@Module({ imports: [PrismaModule, ...] })` standalone bootstrap module but no
`ConfigModule.forRoot(...)` registration anywhere in that module graph.
`PrismaModule` only does a bare `imports: [ConfigModule]` (no `.forRoot()`), which
provides nothing on its own — it exists to receive whatever `ConfigModule.forRoot()`
registered globally elsewhere. In the real app that registration happens once in
`AppModule`. In a script whose only module is its own tiny `@Module(...)`, nothing
ever calls it, so `ConfigService` has no provider and `PrismaService`'s constructor
crashes with `TypeError: Cannot read properties of undefined (reading 'get')`.

Both Scene QC scripts have been fixed (they now include the same
`ConfigModule.forRoot({ isGlobal: true, validate: ... })` block `AppModule` uses).
While fixing them, two **other**, unrelated pre-existing scripts were found with the
identical `@Module({ imports: [PrismaModule, ...] })` shape and no `ConfigModule.forRoot()`:

- `apps/erify_api/scripts/consolidate-duplicate-mechanics.ts`
- `apps/erify_api/scripts/backfill-product-promotion-mechanics.ts`

Neither was run to confirm the failure (out of scope for this PR — they are unrelated
to Scene QC), so this is recorded as **likely, not confirmed**.

## Why accepted (not fixed now)

- Out of scope for the Scene QC program; fixing them here would be an unrelated
  drive-by change to two other capabilities' operator tooling.
- Both scripts are also documented with the *correct* invocation
  (`ts-node -r tsconfig-paths/register`, not `tsx` — see the related finding below),
  so if this bug is real, it would have been hit and presumably noticed the first
  time either script was actually run for real.

## Suggested resolution

Before next running either script, add the same `ConfigModule.forRoot({ isGlobal: true,
validate: ... })` block (mirroring `AppModule`, `apps/erify_api/src/app.module.ts`,
or the fixed Scene QC scripts) to its bootstrap `@Module(...)`.

## Related finding, already fixed for Scene QC

Both Scene QC scripts' own header comments documented `pnpm --filter erify_api exec
tsx <script>` as the invocation method. `tsx` (esbuild-based) does **not** emit
TypeScript's `emitDecoratorMetadata` output, so NestJS's implicit constructor-type
dependency injection silently receives `undefined` for every injected parameter —
confirmed via `Reflect.getMetadata('design:paramtypes', PrismaService)` returning
`undefined` under `tsx` (and this repo's `manual:*` npm scripts already establish
`ts-node -r tsconfig-paths/register` as the correct convention for exactly this kind
of standalone NestJS-context script). Both scripts' headers were corrected to
`ts-node -r tsconfig-paths/register` in the same PR as the `ConfigModule` fix.
This part does not apply to `consolidate-duplicate-mechanics.ts` /
`backfill-product-promotion-mechanics.ts` — both already document `ts-node` correctly.

## Fix trigger

Before either script is next run for a real operator task.
