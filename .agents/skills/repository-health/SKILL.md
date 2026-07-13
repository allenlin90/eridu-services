---
name: repository-health
description: Run the canonical periodic repository health review. Use when explicitly auditing cross-repo quality, architecture, and knowledge drift.
---

# Repository Health

Bridge to the canonical [repository health workflow](../../workflows/repository-health.md). Do not copy its audit procedure here.

1. Read the workflow completely at the start of every invocation.
2. Execute its baseline, implementation audit, knowledge audit, reconciliation, and sequencing steps.
3. Keep broad implementation cleanup in separate scoped work as the workflow requires.
4. Return the workflow's severity-ordered report and completion-checklist status.

Treat the workflow as the sole process source of truth. Update this skill only when its routing or bridge behavior changes.
