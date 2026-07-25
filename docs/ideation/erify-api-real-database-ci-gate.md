# Ideation: Automated `erify_api` Real-Database Safety Gate

> **Status**: Deferred from the `erify_api` architecture-refactoring safety harness
> **Origin**: [PR #323](https://github.com/allenlin90/eridu-services/pull/323) review, July 2026
> **Related**: [`erify_api` architecture refactoring guide](../../apps/erify_api/docs/design/ARCHITECTURE_REFACTORING_GUIDE.md), [real-database test guide](../../apps/erify_api/test/README.md), [backend testing patterns](../../.agents/skills/backend-testing-patterns/SKILL.md)

## What

Add a repository CI job that runs the guarded `erify_api` real-database
integration suite for pull requests whose changes can affect Prisma,
PostgreSQL, Nest module wiring, or CLS transaction behavior. The job would make
the existing manual safety gate enforceable without changing its test
semantics.

## Why It Was Considered

- The harness protects behavior that mocked unit tests cannot prove.
- A package command makes the suite discoverable, but manual execution can
  still be omitted.
- Persistence and module refactors need durable evidence after the current
  architecture-refactoring stack is complete.

## Why It Was Deferred

1. The repository has no established GitHub Actions baseline, so its first
   workflow needs an explicit permissions, runtime-cost, caching, and ownership
   decision.
2. Correct path filters extend beyond `apps/erify_api/**`; shared packages,
   migrations, workspace configuration, and lockfile changes can affect the
   runtime.
3. Required-check and branch-protection policy must be decided before treating
   the workflow as an enforced merge gate.

## Decision Gates for Promotion

Promote this topic when **any** of these are true:

1. The repository adopts a standard GitHub Actions CI policy.
2. A gated pull request omits the documented manual real-database result.
3. The team requires a protected automated check for `erify_api` persistence,
   module wiring, or CLS transaction changes.

## Implementation Notes

- Run `pnpm -C apps/erify_api test:integration`; do not duplicate the runner
  logic in workflow YAML.
- Start PostgreSQL 17 with disposable storage and provide only the local
  `ERIFY_API_TEST_DATABASE_URL`. Never expose development or production
  database credentials.
- Include paths that can change the generated Prisma client, runtime module
  graph, or shared contracts, not only `apps/erify_api/**`.
- Keep opt-in performance measurements outside the normal safety job.
- Decide timeout, dependency caching, concurrency cancellation, fork security,
  and required-check policy in the promoted design.
