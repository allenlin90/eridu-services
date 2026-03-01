---
name: engineering-best-practices-enforcer
description: Enforces repo-aligned engineering best practices for review and refactoring. This skill should be used when auditing or refactoring code across eridu-services with priority on local architecture/context, then official framework docs, then principles such as SOLID.
---

# Engineering Best Practices Enforcer

Use this skill to run large, staged code quality reviews and refactors that stay aligned with the existing monorepo architecture.

## Priority Model

Use this order for decisions:

1. Repo context and established patterns (`AGENTS.md`, `.agent/rules/*`, local module conventions)
2. Official framework/library guidance
3. Design principles (SOLID, clean code heuristics)

If guidance conflicts, document the trade-off explicitly and choose the lower-risk path for current architecture.

## When to Use

- Reviewing a feature, workspace, or the full monorepo for refactor opportunities
- Planning progressive cleanups without destabilizing production behavior
- Creating actionable, severity-ordered engineering findings with clear file references
- Standardizing review output so multiple engineers can follow the same process

## Workflow

1. Identify scope (`single feature`, `workspace`, `cross-workspace`).
2. Load relevant skills from `.agent/skills/*` for affected layer(s).
3. Read local implementation patterns in the target area before proposing changes.
4. Run the quality signal scanner:
   - `bash .agent/skills/engineering-best-practices-enforcer/scripts/scan-quality-signals.sh`
5. Perform impact and risk assessment before editing (required):
   - List impacted entry points (routes/pages/controllers/jobs)
   - List shared components/hooks/libs touched by those entry points
   - List likely dependents (imports + reuse in sibling features)
   - Classify change type:
     - `behavior-preserving refactor`
     - `behavior-adjacent refactor` (possible runtime impact)
     - `behavior-changing refactor`
   - Assign risk tier:
     - `low`: local, strongly typed, no shared component contract changes
     - `medium`: shared hook/component logic, state/data-flow rewiring
     - `high`: cross-workspace contracts, API shape, persistence or auth paths
6. Produce findings:
   - Order by severity (high -> medium -> low)
   - Include absolute file references
   - Separate correctness issues from structural/style issues
7. For each proposed refactor, provide:
   - Why: risk or maintainability gain
   - Evidence: local pattern + official docs reference
   - Cost: low/medium/high effort and blast radius
8. Execute small safe batches first, then verify each changed workspace:
   - `pnpm --filter <workspace> lint`
   - `pnpm --filter <workspace> typecheck`
   - `pnpm --filter <workspace> test`
   - `pnpm --filter <workspace> build` (only when package wiring/build behavior changed)

## Documentation Lifecycle and Placement (Repository Convention)

Use this convention when creating or refactoring docs in any app/package:

1. `docs/` root contains implemented/canonical documentation only.
   - architecture overviews
   - current feature behavior
   - runbooks/playbooks that match shipped behavior
2. `docs/design/` contains unimplemented or partially implemented artifacts.
   - design proposals
   - implementation plans
   - TODO/follow-up requirements
3. `docs/README.md` is the index and source of truth for status.
   - each document listed with explicit status (`implemented`, `in progress`, `planned`, `deprecated`)
   - do not leave design docs in root once a `docs/design/` structure exists
4. When a feature is implemented:
   - move/merge relevant content from `docs/design/*` into canonical `docs/*` files
   - either delete stale design docs or keep them with explicit archival/deprecated note
5. Apply the same pattern consistently across `apps/*` and `packages/*` where docs exist.

### Review Gate for Documentation Changes

For design-heavy feature work, include this gate in review:

1. Is this describing current behavior? -> place in `docs/` root.
2. Is this proposing future behavior or outstanding TODOs? -> place in `docs/design/`.
3. Is status discoverable from `docs/README.md`? -> required before merge.

## Refactor Impact Protocol (Mandatory)

Before implementation:

1. Define explicit refactor boundary:
   - in-scope files
   - out-of-scope files
   - expected invariants that must not change (UI behavior, API contracts, side effects)
2. Create a mini risk register for the batch:
   - risk
   - trigger condition
   - mitigation
   - detection method (test, typecheck, smoke path)
3. Prefer smallest viable batch that can be reverted independently.

During implementation:

1. Refactor one axis at a time (state, data, rendering, side effects), not all at once.
2. Preserve external contracts first; improve internal structure second.
3. If shared component behavior is touched, add/adjust tests in the same batch.

After implementation:

1. Run verification matrix for impacted workspace(s):
   - lint
   - typecheck
   - test
   - build (for bundling/wiring confidence)
2. Execute runtime smoke checks for affected entry points:
   - open primary page/route
   - open each dialog/sheet touched by the batch
   - execute key action path once (save/update/delete)
3. Confirm no new warnings/errors in browser console for touched flows.

## Output Contract

For every review batch, output:

1. Findings first (severity ordered, with file refs)
2. Open questions and assumptions
3. Impact summary:
   - impacted entry points
   - impacted shared modules
   - risk tier and rationale
4. Refactor plan (incremental batches)
5. Verification commands run and outcomes
6. Residual risk + rollback unit:
   - smallest commit(s) to revert safely
   - any untested edge paths

## Implementation Micro-Decisions

### `useCallback` Decision Rule

Default to **not** using `useCallback` for small local handlers.

Reason this is often overkill:

1. Inline handlers are usually clearer and easier to maintain.
2. Stable function identity does not improve performance unless a downstream consumer depends on it.
3. `useCallback` adds dependency-array overhead and can introduce stale-closure bugs during refactors.

Use `useCallback` only when at least one condition is true:

1. Callback is passed to a memoized child (`React.memo`) where unstable references cause measurable re-renders.
2. Callback is part of hook dependency semantics (`useEffect`, `useMemo`, custom hook API) and stability is required for correctness or churn control.
3. Callback is reused in multiple places and extracting/memoizing improves readability more than inline lambdas.

Review expectation:

1. If adding `useCallback`, state why identity stability matters in that exact call path.
2. If not adding `useCallback`, treat this as the preferred baseline, not a missed optimization.

### Derived Table State Memoization Rule

Default to **not** memoizing small derived table state objects (for example `tablePagination`, `filters`, `sorting model`) in route/page components.

Reason:

1. These values are cheap to recompute and are already derived from current render state.
2. Unnecessary `useMemo` introduces dependency-array coupling and increases stale-state risk during refactors.
3. In table-heavy UIs, stale memoized objects can desynchronize advanced filters/pagination from live URL/query state.

Use `useMemo` for derived table state only when at least one condition is true:

1. The derivation is computationally expensive (not simple object shaping).
2. A memoized downstream consumer has proven churn issues tied to unstable references.
3. You can demonstrate complete dependency coverage and add a regression test for stale-state behavior.

Review expectation:

1. If `useMemo` wraps simple pagination/filter object shaping, challenge it by default.
2. Prefer plain inline derivation unless there is measured performance evidence or correctness need.
3. For advanced filter flows, treat stale-state risk as higher priority than theoretical render micro-optimizations.

### Null-Safety Guard Rule (Shared Components)

For shared components (dialogs, sheets, reusable form controls), treat nullable props as hostile inputs.

Required rule:

1. Never rely on optional-chain equality checks (`a?.x === b?.y`) as a guard before dereferencing one side (`a.x`).
2. First establish an explicit non-null object guard (`if (!task) return ...`), then dereference.
3. Helper functions that accept nullable entities must return safely on `null`/`undefined` before reading nested fields.
4. If the component can render before data hydration (query + initial null state), test that open/render paths do not crash.

Known anti-pattern (causes runtime crashes):

1. `if (draft?.taskId === task?.id) return draft.value;`
2. When both sides are `undefined`, branch passes and dereferences `draft` while `draft` is null.

Review expectation:

1. For each nullable prop path, verify the first dereference is dominated by a concrete non-null guard.
2. Prefer defensive fallback values at boundaries (`''`, `[]`, `null`) over conditional dereference chains deep in render logic.

## References

Load these only when needed:

- Official guidance index: [references/official-docs.md](references/official-docs.md)
