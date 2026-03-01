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
5. Produce findings:
   - Order by severity (high -> medium -> low)
   - Include absolute file references
   - Separate correctness issues from structural/style issues
6. For each proposed refactor, provide:
   - Why: risk or maintainability gain
   - Evidence: local pattern + official docs reference
   - Cost: low/medium/high effort and blast radius
7. Execute small safe batches first, then verify each changed workspace:
   - `pnpm --filter <workspace> lint`
   - `pnpm --filter <workspace> typecheck`
   - `pnpm --filter <workspace> test`
   - `pnpm --filter <workspace> build` (only when package wiring/build behavior changed)

## Output Contract

For every review batch, output:

1. Findings first (severity ordered, with file refs)
2. Open questions and assumptions
3. Refactor plan (incremental batches)
4. Verification commands run and outcomes

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

## References

Load these only when needed:

- Official guidance index: [references/official-docs.md](references/official-docs.md)
