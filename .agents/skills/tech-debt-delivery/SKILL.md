---
name: tech-debt-delivery
description: End-to-end workflow to select, fix, verify, commit, push, create a GitHub PR with diagrams if needed, and run /pr-ready for tech debt items.
---

# Tech Debt Delivery

Bridge to the canonical [Tech Debt Resolution and PR Delivery Workflow](../../workflows/tech-debt-delivery.md).

1. Read the workflow completely at the start of every invocation.
2. Pick up an accepted tech debt from `docs/tech-debt/` or fix the target specified by the user.
3. Implement surgical fixes and update/reconcile tech debt docs and skills.
4. Execute verification commands (`typecheck`, `lint`, `test`, `agents:validate`, `lint:markdown`, `sherif`).
5. Commit, push branch to origin, and create the PR using `gh pr create` with diagrams when needed.
6. Execute the `/pr-ready` review gate and output the final readiness verdict.
