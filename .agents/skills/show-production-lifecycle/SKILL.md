---
name: show-production-lifecycle
description: Implement livestream Show relationships, readiness, transitions, cancellation, completion, and assignments.
---

# Show Production Lifecycle Procedure

Thin procedural skill for implementing Show status transitions and assignments. Canonical domain lifecycle rules live in [`knowledge/domain/show-production-lifecycle.md`](../../../knowledge/domain/show-production-lifecycle.md).

## Task Workflow

1. **Verify State Transition**: Check transition validity (`DRAFT` → `SCHEDULED` → `PREPARATION` → `LIVE` → `COMPLETED` / `CANCELLED`).
2. **Validate Invariants**: Ensure host creator and room assignments exist before transitioning to `SCHEDULED`.
3. **Task Snapshots**: Verify task generation captures versioned snapshots of Task Templates.
4. **Verification**: Run `pnpm --filter erify_api test` for show status service specs.

## Canonical Knowledge Reference

- [`knowledge/domain/show-production-lifecycle.md`](../../../knowledge/domain/show-production-lifecycle.md)
