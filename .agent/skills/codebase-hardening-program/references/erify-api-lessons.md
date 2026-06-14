# erify_api hardening pass — lessons (reference)

The first application of `codebase-hardening-program` ran on `apps/erify_api` (backend), PRs #157–#200, baseline **130 suites / 1157 tests → 142 / 1254**, every PR green. The planning docs were retired into `docs/tech-debt/erify-api-refactor-residuals.md` when it closed. This is the distilled record so the next app's pass can translate each item to its analogue.

## Recurring anti-patterns found (translate to FE equivalents)

| Backend anti-pattern | Why it bites | FE analogue to look for |
| --- | --- | --- |
| Repository writes off the unbounded `PrismaService` instead of `txHost.tx` | escapes the ambient `@Transactional` → commits on rollback | mutations that don't invalidate/rollback the query cache atomically; optimistic updates without rollback |
| `Prisma.Decimal` / `Prisma.*` types in **public service signatures** | leaks ORM types across the layer boundary | `any`/untyped API responses crossing the api-layer into components; server types leaking into UI props |
| `as any` / `Record<string,any>` on persisted-JSON (`metadata`) reads | defeats type safety on exactly the volatile data | unparsed `fetch().json()` → `any`; DTOs not validated at the boundary |
| Whole-blob JSONB read-modify-write | last-write-wins clobbers sibling keys under concurrency | optimistic cache writes that replace an object instead of merging a field |
| Optimistic-lock `version` bumped on pre-submission bookkeeping | spurious 409s on the user's next real write | re-renders / refetch storms from over-broad cache keys |
| Blank numeric coerced to `0` (`Number('')===0`) | fabricates "0" instead of "not reported" | empty form input coerced to `0`/`''` instead of "unset"; `Number(input)` without a blank guard |
| God-files mixing concerns (1446 / ~930 / 672 LOC services) | hides responsibilities | route components > 200 LOC mixing fetch + state + layout + business logic |
| Thin pass-through wrappers | indirection with no leverage (deletion test) | wrapper hooks/components that only forward props |
| Convention drift (error types, decorators, param naming, duplicate files) | inconsistency tax | inconsistent component/file naming, duplicated UI primitives, ad-hoc form contracts |

(Original backend catalog: `erify-api-recurring-antipatterns` memory.)

## Divergences from the plan (the kind to expect & flag)

1. **A plan recommendation was infeasible as written.** Plan said "make `ScheduleSnapshotRepository` extend `BaseRepository`" — but that model has **no `deletedAt` column** and `BaseRepository` injects `deletedAt: null` filters, so extending it would break reads. Correct fix: txHost wiring only, keep hard delete. **Lesson: confirm every plan recommendation against source at ticket start; line-cited audit claims are not infallible.**
2. **Scope expanded on a grep-audit.** A "wire 3 repos" item became 7 once the mandated audit found 4 more with the same issue. Flag the expansion; keep it one coherent PR.
3. **A deeper root cause was found but deliberately left for a follow-up.** `BaseRepository` itself binds inherited base methods to the unbounded client; the canonical reference repo works around it by overriding the methods it uses in transactions. Following the convention (not rewriting the base) kept the PR safe; the base rewrite is logged as separate tech-debt.
4. **A decomposition target missed the LOC threshold and was signed off.** One sub-service stayed at 557 LOC (target <400) as a cohesion tradeoff; another proposed split was *declined* as over-decomposition. Both surfaced for explicit sign-off rather than forced.
5. **A planned race-fix became won't-fix.** The `actuals_source` whole-blob race wasn't reachable because actuals are written **sequentially by operational phase** — verified before building a fix, then documented as won't-fix. (`actuals-source-sequential-no-concurrency` memory.)
6. **A money-util consolidation turned out to need a design decision, not a sweep.** The three "duplicate" formatters had genuinely different semantics, and converting `Decimal` out of a public signature only *moved* the `new Decimal` to a math-doing consumer. Deferred pending a domain-`Money` direction call rather than forced. (Now in `docs/tech-debt/erify-api-refactor-residuals.md`.)

## Decision-handling pattern

- **Lock direction; defer detail.** e.g. "analytics services get a repository layer" was locked; the repo shape was decided in-ticket.
- **Frame decisions user-flow-first.** Lead with the concrete end-to-end flow + plain "why", then the one real fork — not an abstract A/B/C matrix. (`decision-framing-user-flow-first` memory.)
- **Resolved erify_api decisions, for reference:** accept-the-race on upload counter (D1); analytics repositories (D2); split review/compensation out of orchestration (D3); publish bumps `version` (D5); hard-delete immutable snapshots (D6); blank-numeric → null (D9); delete the soft-delete-bypassing override (D10); datetime actuals race won't-fix (D8/D12). Still open: domain-`Money` (D4), Sheets service-account identity (D7), `studioId`→`studioUid` rename (D11).

## What "done" looked like

Every theme either shipped behind-green, was won't-fixed with a documented reason, or was deferred into `docs/tech-debt/` with a concrete trigger-to-fix. Planning docs retired; methodology captured here so the next pass starts from the lessons, not from scratch.
