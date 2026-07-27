# PR Quality Gate - Persistent Memory

## Index of Topic Files
- `data-table-patterns.md` — DataTable component, system route migration, admin-table removal
- `upload-presign-patterns.md` — R2/S3 upload patterns, USE_CASE_RULES, browser-upload package
- `studio-scoped-patterns.md` — Studio lookup, membership endpoint, IDOR guard, @StudioParam
- `studio-shift-schedule-patterns.md` — Shift schedule feature patterns (feat/studio-shift-schedule)
- `moderation-workflow-patterns.md` — Moderation loop, idb-keyval draft persistence
- `studio-member-roster-patterns.md` — Studio member roster CRUD (PR #28), isSelf logic, version descope, filterFn dead code
- `studio-creator-roster-patterns.md` — Creator roster CRUD (PR #30), duplicate validation, updateWithVersionCheck 3-query pattern
- `scene-qc-child-pr-patterns.md` — Scene QC program (PR #343 umbrella); Child PR 1 was rescoped 2026-07-27 (no Material/Assignment tables, no repository, no Studio.timezone column) — read the scope-correction note before reviewing
- `backend-verified-conventions.md` — Cross-cutting erify_api conventions confirmed across many reviews: Prisma leakage, CLS/txHost, version field, repo-method necessity judgment calls
- `task-template-script-exceptions.md` — Internal operator/script services' accepted Prisma-in-service exception; templateKind JSONB filter

## Quick-Reference Rules (read topic files for detail/evidence)
- Services must never import `Prisma.*` types in public signatures; repositories may use Prisma internally. See `backend-verified-conventions.md`.
- All writable models need `version: number`; known accepted exceptions are tracked per-feature, don't re-flag them.
- CLS transactions: use `this.txHost.tx`, not raw `this.prisma` — except confirmed read-only/never-transactional repos and internal operator scripts.
- `@StudioParam()` does not exist in this codebase — all studio controllers use `@Param('studioId', new UidValidationPipe(...))`. Stop citing it as a real decorator.
- Repository method necessity is a judgment call, not mechanical: single-caller shallow finders without an `// Engineering decision:` tag are usually WARNING not BLOCKING when they're the model's canonical findOne-equivalent.
- Always independently verify a PR's self-reported test/gate results — re-run commands yourself rather than trusting checkboxes (see `scene-qc-child-pr-patterns.md` and `backend-verified-conventions.md` for a concrete example where a PR's own gate-applicability claim was wrong).
