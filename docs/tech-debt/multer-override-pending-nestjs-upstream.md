# Tech Debt: root `pnpm.overrides.multer` is a stopgap for a NestJS-lagging transitive dependency

## Current Issue

`@nestjs/platform-express` pins `multer@2.1.1` even at its latest 11.1.x release (verified: `npm view @nestjs/platform-express@11.1.27 dependencies.multer` → `2.1.1`). That version fixes 3 of 5 known `multer` advisories, but two DoS advisories (deeply nested field names; incomplete cleanup of aborted uploads) are only patched at `>=2.2.0`.

Added a root-level `pnpm.overrides.multer: ">=2.2.0"` to force the patched version workspace-wide, since NestJS hasn't caught up yet. `erify_api` doesn't use `multer`/`FileInterceptor` directly anywhere in its own code (file uploads go through the presigned-URL flow to R2, per the `file-upload-presign` skill) — multer is a fully transitive, unused-at-runtime dependency here, so the override carries no functional risk.

## Trigger To Fix

Remove the override once `@nestjs/platform-express` (any consumer, check with `npm view @nestjs/platform-express@latest dependencies.multer`) ships `multer >= 2.2.0` natively — the override becomes redundant at that point, not harmful, but should be cleaned up to avoid a stale/forgotten pin.

## Acceptance Criteria

- `npm view @nestjs/platform-express@<currently-installed> dependencies.multer` resolves to `>=2.2.0`.
- Remove `pnpm.overrides.multer` from root `package.json`, run `pnpm install`, confirm `pnpm list multer --filter erify_api` still resolves to `>=2.2.0` without the override.
