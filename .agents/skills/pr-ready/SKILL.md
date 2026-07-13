---
name: pr-ready
description: Run the canonical pre-merge review and return a READY or NOT READY verdict. Use when explicitly checking whether a PR can merge.
---

# PR Ready

Bridge to the canonical [PR review workflow](../../workflows/pr-review.md). Do not duplicate its gates or checklists here.

1. Read the workflow completely at the start of every invocation.
2. Resolve the requested PR or default to the current branch against `origin/master`.
3. Execute every applicable gate, verification step, and Wrap-up requirement in the workflow.
4. Return the workflow's explicit READY or NOT READY verdict with blockers and evidence.

Treat the workflow as the sole process source of truth. Update this skill only when its routing or bridge behavior changes.
