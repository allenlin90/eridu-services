---
name: codebase-hardening-program
description: Run a multi-PR, behavior-preserving hardening program to audit, slice, verify, and reconcile quality work.
---

# Codebase Hardening Program

A repeatable way to take a large, mostly-healthy codebase and converge it onto its own canonical patterns — fixing transaction/type/convention debt and decomposing god-files — **without changing behavior**, as a stream of small reviewable PRs. Proven on `apps/erify_api` (PRs #157–#200, baseline 130/1157 → 142/1254, every PR green). The concrete erify_api findings, divergences, and recurring issues are in [references/erify-api-lessons.md](references/erify-api-lessons.md) — read it before the next app's pass.

This is a **process skill**: it tells you *how* to sequence and verify the work. Pair it with the implementation skills for the app you're hardening (backend: `service-pattern-nestjs`, `repository-pattern-nestjs`, `backend-large-file-refactor`; frontend: `frontend-code-quality`, `frontend-api-layer`, `frontend-state-management`, `table-view-pattern`, `frontend-testing-patterns`).

## When to use

- The user wants to audit + harden an existing app to its own conventions (not greenfield).
- A god-file / pervasive `as any` / convention drift needs a *program*, not a one-off fix.
- You're starting the `erify_studios` (or any) follow-on pass and want the same discipline.

## The operating model (non-negotiable)

1. **Direction now, details later.** Lock only direction-level decisions up front; decide structural details *in-ticket, with current code in view*. **Never pre-implement a deferred decision.**
2. **Converge on canonical patterns; improve only with sign-off.** Align divergent code onto the app's reference implementations. A *better* pattern may be **proposed**, but applied only after explicit approval — never silently introduced mid-refactor.
3. **One PR per work item.** Smallest reviewable unit. Independent items run as parallel branches.
4. **Baseline stays green.** Record the suite/test counts; re-run before and after every PR; it must never regress.
5. **Characterization-first.** Any PR that restructures behavior-bearing code is **blocked** until a test pins *today's* behavior. See "Characterization vs expectation" below.
6. **Verify the real scenario before hardening.** Before building a race/lock/guard fix, confirm the failure is reachable in the actual workflow. If the workflow can't hit it, it's won't-fix (document it) — don't build defensive machinery for an unreachable case.

## The lifecycle

```
audit (fan-out) → ranked themes + open decisions → work-item backlog (companion tracker)
   → execute one PR per item (baseline-green → characterization → review)
   → reconcile the tracker after merges → retire planning docs into tech-debt when done
```

1. **Audit.** Fan out readers over module slices; cluster findings into ranked **themes**; **verify keystone claims against source** (fast-pass audits produce false positives — record corrections).
2. **Two companion docs.** A static **plan** (themes + decisions) and a living **work-item backlog** (one WI per fix: scope, test strategy, acceptance, decision dependency, risk). Parallel PRs do **not** edit the tracker — reconcile after merges to avoid conflicts.
3. **Sequence:** bugs/security → transaction & type foundations → decomposition → convention sweep + tests. Restructure only on a correct, typed substrate.
4. **Execute.** Per PR: confirm the finding against source, make the minimal scoped change (no drive-by refactors), keep baseline green, run `lint`/`typecheck`/`test` (+`build` when wiring/deps change), update docs/skills in the same PR.
5. **Retire.** When the program is done, **move residual/deferred items into `docs/tech-debt/`** (don't lose open decisions), delete the planning docs, update memories/skills that referenced them, and run `/pr-ready`.

## Behavior-preserving techniques

- **Extract a sub-service without churning its spec:** wire the *real* new sub-service into the existing spec over the **same mocked leaf deps** (the facade/coordinator delegates to it). Old characterization tests then run facade → real sub-service → mocked repo and pass through unchanged. Move a `describe` to a new spec only for a clean standalone. (See `behavior-preserving-service-extraction-spec-pattern` memory / `backend-large-file-refactor`.)
- **Characterization vs expectation.** A *characterization* test asserts what the code does *today* (safety net). An *expectation* test asserts what it *should* do. For an intended correctness fix, write the characterization first (locks current behavior), then **flip it to the expectation in the same PR as the fix** — so the behavior change is visible in the diff.
- **Green tests don't prove every invariant.** They often don't assert transaction boundaries, ordering, or precision. **Verify those against the pre-refactor source** (`git show <sha>~1:<file>`), not just by re-running the suite.
- **Test at the right altitude.** Assert observable behavior/contracts, not implementation. Mock-argument assertions are a last resort, kept minimal (soft-delete exclusion, tenant scoping, real logic branches) — don't enumerate ORM/framework plumbing a refactor may freely change. (See `test-altitude-behavior-not-implementation` memory, `backend-testing-patterns` / `frontend-testing-patterns`.)
- **Flag divergences & sign-offs explicitly.** When execution diverges from the plan (a recommendation turns out infeasible, scope expands, a target threshold is missed), call it out in the PR + tracker and get sign-off — don't bury it.

## Applying this to the next app (e.g. `apps/erify_studios` FE)

The *process* is identical; the *canonical patterns and recurring issues differ*. Before the FE pass:

1. Read [references/erify-api-lessons.md](references/erify-api-lessons.md) for the backend pattern of findings (what recurred, what diverged, what was won't-fixed) and translate each to its FE analogue.
2. Establish the FE baseline (lint + typecheck + test + build per the verification checklist) and the FE reference implementations.
3. Map the theme equivalents: god-files → large route components (>200 LOC, see `frontend-code-quality`); `Prisma/Decimal` leakage → untyped API responses / `any` in the api-layer (`frontend-api-layer`); transaction wiring → query/mutation + cache-invalidation correctness (`frontend-state-management`); convention drift → component/file naming, form contracts, refresh/pagination patterns (`frontend-ui-components`, `table-view-pattern`); persisted-JSON casts → API DTO parsing at the boundary.
4. Honor the standing project decisions (e.g. **inline-English i18n is intentionally deferred** to one later cross-app pass — don't flag it; see the `frontend-inline-english-i18n-deferral` memory).
