# `erify_api` Operator Scripts

One-off backfills, verifications, and data-repair scripts. Two kinds live here:

- **Standalone NestJS-context scripts** — bootstrap a real Nest injector with
  `NestFactory.createApplicationContext` so they can reuse the app's own services
  (and therefore its validation, snapshotting, and transaction semantics).
- **Raw Prisma scripts** — talk to the database directly with `PrismaClient` and
  no Nest involvement (e.g. `sync-ext-ids.ts`).

The two conventions below apply to the **standalone NestJS-context** kind only.
Both exist because their failure mode is a confusing `undefined` at runtime, not a
compile error.

## 1. Invoke with `ts-node`, never `tsx`

```bash
pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/<script>.ts
```

`tsx` is esbuild-based and does not emit TypeScript's `emitDecoratorMetadata`
output. Without that metadata, NestJS's implicit constructor-type injection
receives `undefined` for every injected parameter and fails in a way that looks
unrelated to the invocation method. Confirmed by
`Reflect.getMetadata('design:paramtypes', PrismaService)` returning `undefined`
under `tsx`. The repo's `manual:*` npm scripts already establish
`ts-node -r tsconfig-paths/register` as the convention for this script shape.

Raw Prisma scripts have no decorator metadata to lose, so `tsx` is fine for them —
`db:extid:sync` uses it deliberately.

## 2. Register `ConfigModule.forRoot()` in the script's bootstrap module

`PrismaService` injects `ConfigService`. `PrismaModule` only does a bare
`imports: [ConfigModule]` — that provides nothing on its own; it exists to receive
whatever `ConfigModule.forRoot()` registered globally elsewhere. In the running app
that registration happens once in `AppModule`. A script whose only module is its own
`@Module({ imports: [PrismaModule, ...] })` never calls it, so `ConfigService` has no
provider and `PrismaService`'s constructor crashes with
`TypeError: Cannot read properties of undefined (reading 'get')`.

Copy the block from any existing script here (they are all identical, and mirror
[`src/app.module.ts`](../src/app.module.ts)) so a missing or invalid `DATABASE_URL`
fails loudly the same way it does in the real app. Note that `envSchema` also
requires `ERIDU_AUTH_URL`, so a database-only `.env` is not enough to boot a script
even when the script never touches auth.

## Related

- [`apps/erify_api/docs/SCENE_QC.md`](../docs/SCENE_QC.md) — Scene QC's own operator scripts and their usage.
- [`docs/tech-debt/erify-api-lint-excludes-scripts-dir.md`](../../../docs/tech-debt/erify-api-lint-excludes-scripts-dir.md) — this directory is outside the workspace `lint` glob.
