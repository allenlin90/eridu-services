---
description: Standardized workflow to select, fix, verify, commit, push, document, and submit tech debt resolution PRs end-to-end.
---

# Tech Debt Resolution and PR Delivery Workflow

Use this workflow to pick up an accepted tech debt item from `docs/tech-debt/`, fix it surgically, verify it, push the branch, open a GitHub PR with diagrams when applicable, and complete the `/pr-ready` review gate.

## Workflow Steps

### 1. Select Tech Debt Item
- Read [`docs/tech-debt/README.md`](../../docs/tech-debt/README.md) and the target entry doc under `docs/tech-debt/`.
- Confirm the trigger conditions and desired resolution specified in the tech debt doc.

### 2. Surgical Implementation
- Apply minimal, surgical code changes addressing the tech debt item.
- Do not perform unrelated refactoring or introduce unrequested abstractions.

### 3. Reconcile Tech Debt Documentation & Skills
- Delete or update the tech debt doc under `docs/tech-debt/`.
- Update `docs/tech-debt/README.md` to reflect the change (remove or update the Active Issues table row).
- Reconcile any linked skills, rules, or docs (e.g. `.agents/skills/`) referencing the resolved tech debt item.

### 4. Run Verification Suite
Run verification across affected workspaces and monorepo standards:

```bash
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> lint
pnpm --filter <workspace> test
pnpm agents:validate
pnpm lint:markdown
pnpm sherif
```

### 5. Branch & Commit
- Create a dedicated topic branch: `git checkout -b fix/<topic-name>`.
- Commit changes using standard Conventional Commit format (`fix(<scope>): ...`).

### 6. Push Remote & Create PR
- Push branch to remote: `git push -u origin fix/<topic-name>`.
- Create GitHub PR using `gh pr create`.
- Embed Mermaid diagrams in the PR description **only when needed** by the nature of the change:
  - **Sequence Diagram**: For inter-service runtime flow or `@Transactional` boundary changes.
  - **Flowchart / Workflow Diagram**: For complex branching decision logic or state transitions.
  - **ERD Diagram**: For schema, entity, or relationship updates.
  - *Skip diagrams* for simple single-function internal edits, copy changes, or basic config tweaks.

### 7. Run PR Ready Review Gate
- Execute `.agents/workflows/pr-review.md` end-to-end.
- Output the explicit `READY` or `NOT READY` verdict with PR link, diagram overview, and verification evidence.
