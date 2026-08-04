---
description: Standardized workflow to select, fix, verify, commit, push, document, and submit tech debt resolution PRs end-to-end.
---

# Tech Debt Resolution and PR Delivery Workflow

Use this workflow to pick up an accepted tech debt item from `docs/tech-debt/`, fix it surgically, verify it, push the branch, open a GitHub PR, and complete the `pr-ready` gate.

**Scope boundary.** This workflow owns the delivery path for one accepted tech debt item. `repository-health` owns periodic reconciliation of the tech-debt and ideation registers as a whole; [`pr-review.md`](pr-review.md) owns the merge-readiness verdict this workflow ends with. Run this workflow for a single item — do not also run a health pass in the same PR.

## Workflow Steps

### 1. Select Tech Debt Item

- Read [`docs/tech-debt/README.md`](../../docs/tech-debt/README.md) and the target entry doc under `docs/tech-debt/`.
- Confirm the trigger conditions and desired resolution specified in the tech debt doc.
- For `erify_api` targets, record the applicable [`REFACTORING_TARGETS.md`](../../apps/erify_api/docs/REFACTORING_TARGETS.md) IDs and trigger outcome in the plan and PR.

### 2. Branch Before Implementing

- Create the topic branch before editing: `git checkout -b fix/<topic-name>`.
- Never implement on `master`.

### 3. Surgical Implementation

- Apply minimal, surgical code changes addressing the tech debt item.
- Do not perform unrelated refactoring or introduce unrequested abstractions.

### 4. Reconcile Tech Debt Documentation & Skills

- Delete or update the tech debt doc under `docs/tech-debt/`.
- Update `docs/tech-debt/README.md` to reflect the change (remove or update the Active Issues table row).
- Reconcile any linked skills, rules, or docs (e.g. `.agents/skills/`) referencing the resolved tech debt item.
- If any skill frontmatter changed, regenerate the catalog with `pnpm agents:index`.

### 5. Run Verification Suite

Run verification across affected workspaces and monorepo standards:

```bash
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> lint
pnpm --filter <workspace> test
pnpm --filter <workspace> build
pnpm agents:validate
pnpm lint:markdown
pnpm sherif
```

- `build` is not optional when package wiring, dependencies, or build-time-only checks are in play. `typecheck` runs `tsc --noEmit` against the root tsconfig and misses stricter build configs — see AGENTS.md § Verification Checklist.
- Run `pnpm agents:validate` and `pnpm lint:markdown` whenever `.agents/` content or Markdown changed; run `pnpm sherif` whenever any `package.json` changed, and update `pnpm-lock.yaml` in the same change set.
- For `erify_api` changes affecting persistence transaction semantics, soft-delete/restore behavior, CLS participation, or Nest runtime composition, also run the guarded real-database gate from [`code-quality` § backend testing](../skills/code-quality/references/backend-testing-patterns.md#5-real-database-integration-tests) and record the result in the PR.

### 6. Commit

- Commit changes using standard Conventional Commit format (`fix(<scope>): ...`).

### 7. Push Remote & Create PR

- Confirm with the user before pushing, then push the branch: `git push -u origin fix/<topic-name>`.
- Create the GitHub PR using `gh pr create`.
- Diagram requirements are owned by [`pr-review.md` § PR description check](pr-review.md#pr-description-check) — follow that checklist item, including its delta-vs-baseline rule, instead of a second copy here. A PR touching only a single function's internals, a config value, or a copy change may skip diagrams.

### 8. Run PR Ready Review Gate

- Run the `pr-ready` skill, which executes [`pr-review.md`](pr-review.md) end-to-end.
- Output the explicit `READY` or `NOT READY` verdict with the PR link, diagram overview, and verification evidence.
