---
description: Periodic repository health review for code, architecture, dependencies, tests, documentation, and agent guidance; converts verified drift into the canonical debt and ideation registers.
---

# Repository Health Workflow

Run this workflow at least once per phase, before starting a hardening program, or when repository growth makes conventions, documentation, or ownership hard to navigate. This is a review and bookkeeping workflow. Do not mix broad cleanup into an unrelated feature PR.

## Output contract

Produce one severity-ordered report containing:

1. verified findings with file references;
2. current architecture signals compared with the previous recorded snapshot when one exists;
3. existing register entries that already cover each finding;
4. impact, risk, and a measurable trigger to fix;
5. the smallest reviewable work-item sequence;
6. verification commands and outcomes;
7. documentation, skill, workflow, and register updates made during bookkeeping.

Classify proposed changes as behavior-preserving, adjacent, or behavior-changing. A periodic review may update bookkeeping artifacts, but implementation work should land as separate scoped PRs.

## Step 1 — Establish the baseline

```bash
git status --short
pnpm lint
pnpm typecheck
pnpm test
pnpm build
bash .agents/skills/engineering-best-practices-enforcer/scripts/scan-quality-signals.sh
```

Record failures by workspace. A script that prints `No tests specified` is a coverage gap, not a passing test suite. Do not run fix-mode lint against a dirty worktree unless the resulting edits are in scope.

Record a lightweight architecture snapshot in the review report or PR description. Compare it with the last available snapshot rather than treating an isolated count as a finding. Include, where applicable:

- module nodes, local edges, cycles, and `forwardRef` usage;
- shallow modules and modules that primarily re-export providers;
- behavior-bearing backend files above roughly 600 LOC and frontend route/feature modules above roughly 200 LOC;
- services with roughly more than eight injected collaborators;
- exported repositories and cross-capability persistence imports;
- REST, MCP, and worker runtime import closures;
- public service signatures that expose ORM query types.

If a signal is not mechanically measurable yet, record the sampled files and manual evidence. Do not invent precision.

## Step 2 — Audit the implementation

Read `AGENTS.md`, the affected layer skills, `docs/domain/`, and applicable ADRs before judging patterns. Review representative entry points in every app and shared package; do not infer repository-wide conclusions from counts alone.

Check:

- **Correctness and safety** — authorization, validation, transactions, soft delete, optimistic locking, audit history, sensitive-data handling.
- **Architecture** — repository/service/controller separation, deep modules with small interfaces, domain locality, duplicated orchestration, and speculative seams with only one adapter.
- **Type and contract integrity** — `any` at production seams, unvalidated JSON, ORM types in service interfaces, UID-only external contracts, snake_case/camelCase transformations.
- **Efficiency** — N+1 reads, sequential independent work, unbounded lists, oversized payloads, cache invalidation, bundle/chunk warnings, and missing performance baselines.
- **Maintainability** — behavior-bearing backend files above 600 LOC, frontend route or feature modules above 200 LOC, thin wrappers, generated-file noise, and testability through public interfaces.
- **Workspace/package health** — `workspace:*` dependencies, lockfile alignment, runtime exports from `dist`, build declarations/maps, script parity, and shared-package consumer validation.

Confirm every candidate against source. Counts and scanners are discovery tools, not findings.

For each changed signal, classify it using the PR review vocabulary: hard invariant, local design signal, existing decision trigger, strategic architecture gate, or repository trend. Reconcile only verified triggers; do not turn every threshold crossing into an implementation project.

## Step 3 — Audit knowledge alignment

Cross-check:

- `docs/README.md`, app doc indexes, feature docs, and roadmap status;
- `docs/tech-debt/README.md` for implementation gaps;
- `docs/ideation/README.md` for future mechanisms and architecture ideas;
- active `apps/*/docs/design/` and `docs/prd/` artifacts against shipped code;
- `.agents/skills/`, `.agents/workflows/`, `.agents/rules/`, and `AGENTS.md` for ownership, routing, duplication, and stale links;
- `.claude/CLAUDE.md` remains a thin adapter of at most 30 lines.

Run `knowledge-sync.md`, the `doc-lifecycle` skill, and `ideation-lifecycle.md` only for artifacts whose trigger conditions are met.

## Step 4 — Reconcile findings

For each verified finding:

1. Link the existing tech-debt or ideation entry when one exists.
2. Update that canonical entry when evidence, scope, risk, or trigger has drifted.
3. Create a `docs/tech-debt/` entry only for a real implementation gap with affected surface, current behavior, desired behavior, risk, trigger, and acceptance criteria.
4. Create a `docs/ideation/` entry only for a future mechanism that still needs discovery or a decision gate.
5. Fix broken links, incorrect indexes, and contradictory agent guidance in the bookkeeping PR when the correction is unambiguous and behavior-neutral.

Do not create a parallel repository-health backlog. The canonical registers own open work.

## Step 5 — Rank and sequence work

Rank by: correctness/security, data integrity, transaction/type foundations, performance with measured impact, decomposition, convention cleanup, then cosmetic consistency.

Turn accepted work into small items. Each item must state scope, invariant, characterization or expectation test strategy, acceptance criteria, risk, rollback unit, and affected verification commands. Use `codebase-hardening-program` for a multi-PR behavior-preserving pass.

## Step 6 — Close the review

- Re-run link checks for every touched documentation tree.
- Re-run targeted lint/typecheck/test/build for every changed workspace.
- Update `docs/tech-debt/README.md` and `docs/ideation/README.md` when entries changed.
- Keep dated evidence in the PR description or an explicitly requested report; keep canonical docs written as current truth.
- Schedule the next review at the next phase boundary or within three months, whichever comes first.

A lightweight read-only signal scan may also run monthly as a scheduled task. It should report changes from the previous snapshot and invoke `$repository-health`; it must not automatically refactor code or create a second backlog. The full human review remains phase-boundary or at least quarterly work.

## Completion checklist

- [ ] Baseline and workspace-specific failures recorded.
- [ ] Architecture signals compared with the previous snapshot where available.
- [ ] All apps and shared packages sampled against their canonical patterns.
- [ ] High-severity findings verified against source.
- [ ] Trigger crossings classified without treating advisory thresholds as automatic failures.
- [ ] Existing registers reconciled before new entries were created.
- [ ] Documentation and agent guidance checked for lifecycle drift.
- [ ] Work items are independently reviewable and behavior changes are explicit.
- [ ] Touched artifacts pass targeted verification and link checks.
