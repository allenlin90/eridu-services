---
name: tech-debt-delivery
description: Deliver an accepted docs/tech-debt item end to end - fix, verify, branch, PR, and review gate. Use when explicitly picking up tech debt.
---

# Tech Debt Delivery

Bridge to the canonical [tech debt delivery workflow](../../workflows/tech-debt-delivery.md). Do not duplicate its steps or verification commands here.

1. Read the workflow completely at the start of every invocation.
2. Resolve the target: an accepted entry under `docs/tech-debt/`, or the item the user named.
3. Execute every applicable step, verification command, and confirmation gate in the workflow.
4. Return the `pr-ready` verdict with the PR link and verification evidence.

Treat the workflow as the sole process source of truth. Update this skill only when its routing or bridge behavior changes.
