---
description: Pre-merge quality gate — pattern compliance, code review, and verification before a PR is merged to master
---

# PR Review Workflow

Run this workflow before merging any PR. Scope the changed layers first, then run only the gates that apply.

> **Companion**: Run `knowledge-sync.md` after merge when behavior, contracts, or architecture changed.

---

## Step 1 — Identify scope

```bash
git diff --name-only origin/master...HEAD
```

Map each changed path to its review gate:

| Path prefix | Gate |
| --- | --- |
| `apps/erify_api/src/` | [§ erify\_api gate](#erify_api-gate) |
| `apps/eridu_auth/src/` | [§ eridu\_auth gate](#eridu_auth-gate) |
| `apps/erify_studios/src/` · `apps/erify_creators/src/` | [§ Frontend gate](#frontend-gate) |
| `packages/api-types/` · `packages/auth-sdk/` · `packages/ui/` · `packages/i18n/` | [§ Shared package gate](#shared-package-gate) |
| `apps/*/docs/` · `docs/` | [§ Documentation gate](#documentation-gate) |

Multiple gates apply when a PR spans layers. Run all that match.

---

## erify_api gate

### Repository checks

For **every new named repository method** (beyond `findOne`/`findByUid`):

1. **Necessity test** — can the body be replaced by `findMany({ where: {...} })` called from the service? If yes → delete the method, inline at the service. **BLOCKING.**
2. **Exception justification** — if the method IS necessary (non-trivial query, multi-step op, reused complex logic), it must have an `// Engineering decision:` comment in code explaining why `findMany` is insufficient.
3. **Feature doc record** — the same decision must appear in the relevant feature doc (Key Product Decisions or Design Decisions) so it is traceable.

- [ ] Every new named repository method has passed the necessity test or carries a documented exception (code comment + feature doc entry).
- [ ] All custom queries filter `deletedAt: null` unless `includeDeleted` is explicit.
- [ ] No `Prisma.*` types leaking into service method signatures — payload types defined in schema files.
- [ ] No `findByUidOrThrow` — return `null`, let the controller call `ensureResourceExists()`.
- [ ] No Prisma query-building in services — `where` clauses belong in repositories.

Full reference: `.agent/skills/repository-pattern-nestjs/SKILL.md`

### Service checks

- [ ] Service method signatures use payload types, not `Prisma.*` input types.
- [ ] Multi-step writes use `@Transactional()` — no manual `tx` passing.
- [ ] Orchestration services throw `HttpError`; model services return `null` for not-found.

Full reference: `.agent/skills/service-pattern-nestjs/SKILL.md`, `.agent/skills/orchestration-service-nestjs/SKILL.md`

### Controller checks

- [ ] Studio-scoped routes use `@StudioProtected([...roles])` and `@StudioParam()`.
- [ ] Path params use `UidValidationPipe`.
- [ ] Response decorators used (`@ZodResponse`, `@AdminResponse`, etc.) — no manual `res.json()`.
- [ ] Controllers are transport-only: no business logic, no Prisma, no finance arithmetic.
- [ ] Studio-scoped writes enforce role (`ADMIN` or `MANAGER`) — not just membership.
- [ ] Delete endpoints restricted to `ADMIN` unless explicitly approved.
- [ ] No internal BigInt IDs exposed in API responses.

Full reference: `.agent/skills/backend-controller-pattern-nestjs/SKILL.md`, `.agent/skills/erify-authorization/SKILL.md`

---

## eridu_auth gate

`eridu_auth` is a Hono app with Drizzle ORM — NestJS patterns do not apply here.

- [ ] Route handlers use Hono context (`c.req`, `c.json()`) — no NestJS decorators.
- [ ] DB access goes through Drizzle queries, not Prisma.
- [ ] Auth flows (session creation, JWT issuance, JWKS) follow the patterns in `.agent/skills/authentication-authorization-nestjs/SKILL.md` § eridu_auth section.
- [ ] No secrets or signing keys hardcoded — environment variables only.
- [ ] SSO flows follow the integration pattern in `.agent/skills/ssr-auth-integration/SKILL.md`.

---

## Frontend gate

Applies to `erify_studios` and `erify_creators`.

### API layer

- [ ] Server state uses TanStack Query — no manual `useState` + `useEffect` for fetches.
- [ ] Query keys follow the project key factory pattern (see `.agent/skills/frontend-api-layer/SKILL.md`).
- [ ] Mutations use `onMutate`/`onError`/`onSettled` for optimistic updates where the UX requires it.
- [ ] No direct `fetch`/`axios` calls outside the API layer module.
- [ ] Searchable lookup inputs/filters have an explicit per-field data-source contract (`scoped endpoint` vs documented local filter) and matching query-key scope discrimination where applicable.
- [ ] Hook files with two or more lookup hooks extract a shared internal search-query helper — no copy-pasted `useState`/`useQuery`/`staleTime`/`gcTime`/`enabled` blocks across hooks in the same file.

### State management

- [ ] URL/search params own filterable/shareable state — not component `useState`.
- [ ] No `useCallback` on small local handlers without a documented stability reason.
- [ ] No `useMemo` wrapping simple object shaping without a measured perf or correctness need.

Full reference: `.agent/skills/frontend-state-management/SKILL.md`

### Components and UI

- [ ] Shared primitives come from `@eridu/ui` — no local re-implementations of Radix/Tailwind primitives.
- [ ] Form/dialog field inventory matches the intended product/API contract; any intentionally excluded fields (for example `external_id`) are documented in the design doc and called out near form/schema composition.
- [ ] Date and datetime editing uses `DatePicker` / `DateTimePicker` from `@eridu/ui`; native `type="date"` / `type="datetime-local"` inputs only appear with a documented exception.
- [ ] `AsyncCombobox` / `AsyncMultiCombobox` search wiring is complete: no `onSearch={() => {}}`, no dead “search” affordances, and no undocumented mixed remote/local behavior across fields in the same form.
- [ ] Forms with 2+ async lookup fields use isolated `memo()` field components — async lookup hooks are not called at the parent-form level when two or more exist.
- [ ] Review evidence exists for searchable fields: either tests or direct verification that typing changes the intended query state or the documented local-filter state.
- [ ] Nullable prop guards: explicit non-null guard before dereference — no `a?.x === b?.y` then `a.x`.
- [ ] Route guards and sidebar visibility reference the same access policy source.
- [ ] i18n strings go through Paraglide — no hardcoded UI copy.

Full reference: `.agent/skills/frontend-ui-components/SKILL.md`, `.agent/skills/frontend-i18n/SKILL.md`

### PWA (erify_studios only)

- [ ] Service worker cache boundaries respected — no dynamic data cached at the app-shell layer.
- [ ] SW registration and update flows follow `.agent/skills/pwa-best-practices/SKILL.md`.

---

## Shared package gate

Applies to any change under `packages/*`.

- [ ] Package exports from `dist/` only — never from `src/`.
- [ ] `package.json` exports map has both `types` and `default` fields for every entrypoint.
- [ ] Internal cross-package dependencies use `workspace:*` — never `file:` or pinned versions.
- [ ] `tsconfig.json` includes `declaration: true`, `declarationMap: true`, `sourceMap: true`, `outDir: "dist"`.
- [ ] No path mappings to workspace `src/` in consuming apps — TS resolves via `package.json` exports.
- [ ] If `package.json` changed: `pnpm install` was re-run and `pnpm-lock.yaml` is committed in the same change.
- [ ] Sherif passes: `pnpm sherif` — no version mismatches across the workspace.

Full reference: `.claude/memory/monorepo-package-rules.md`

---

## Documentation gate

- [ ] Any implemented design doc in `apps/*/docs/design/` has been promoted (stripped of task lists, moved to `docs/` root, indexes updated). See `doc-lifecycle.md` § **Design Doc Promotion**.
- [ ] Shipped feature docs and roadmap/index tables point to canonical `apps/*/docs/*.md` files, not deleted `apps/*/docs/design/*.md` paths.
- [ ] PRD for shipped features promoted to `docs/features/` and deleted from `docs/prd/`.
- [ ] `apps/*/docs/README.md` Features table lists promoted docs with `✅` and correct paths (not `design/` paths).
- [ ] `apps/*/docs/design/README.md` contains only active design proposals; no shipped/implemented items remain in the design index.
- [ ] No stale links to deleted or moved files.

---

## Verification gate

Run for **each changed workspace**:

```bash
pnpm --filter <workspace> lint
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> test
pnpm --filter <workspace> build   # required when package wiring, exports, or tsconfig changed
```

Workspaces: `erify_api` · `eridu_auth` · `erify_studios` · `erify_creators` · `@eridu/api-types` · `@eridu/auth-sdk` · `@eridu/ui` · `@eridu/i18n`

All checks must pass before merge.

---

## PR description check

- [ ] Title is concise (under 70 characters) and describes the change, not the implementation.
- [ ] Summary matches what was actually delivered — no references to deleted files or stale paths.
- [ ] Docs section lists canonical paths (not `design/` paths for promoted docs).
- [ ] Validation section reflects current pass/fail state for all affected workspaces.

---

## Completion Checklist

- [ ] All applicable gates run (erify_api / eridu_auth / frontend / packages / docs).
- [ ] Every new named repository method: necessity tested; exceptions documented in code and feature doc.
- [ ] No Prisma types in service signatures; no business logic in controllers.
- [ ] All implemented design docs promoted; no `✅` items remaining in any Design table.
- [ ] All PRDs for shipped features promoted to `docs/features/`.
- [ ] lint ✅ · typecheck ✅ · test ✅ · build ✅ for all affected workspaces.
- [ ] PR description references canonical paths and reflects current state.
