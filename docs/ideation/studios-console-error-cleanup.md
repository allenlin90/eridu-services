# erify_studios console.error Cleanup in Component try/catch Blocks

**Origin**: PR #16 task submission reporting review (2026-03-21)
**Status**: Deferred — not introduced by PR #16, pre-existing pattern

## Context

Two `console.error` calls remain in component-level `try/catch` blocks in `erify_studios`:

- [`report-builder.tsx`](../../apps/erify_studios/src/features/task-reports/components/report-builder.tsx) — inside `handleSaveDefinition`'s catch block
- [`task-report-definitions-viewer.tsx`](../../apps/erify_studios/src/features/task-reports/components/task-report-definitions-viewer.tsx) — inside `handleDelete`'s catch block

These components call `mutateAsync` directly (rather than `mutate`) and handle errors in `try/catch` with a manual `toast.error()` + `console.error(error)`. This pattern exists across `erify_studios` wherever mutations are awaited inline.

## Why Deferred

- Not introduced by PR #16 — pre-existing across the codebase
- Not a correctness or security issue (unlike `onError`-level `console.error` which fires on every production error)
- Component try/catch `console.error` is a lower-severity annoyance (it fires only when the developer chooses `mutateAsync` and the component explicitly catches)

## What to Fix

Audit all `mutateAsync` call sites in `erify_studios` that have a companion `console.error` in the catch block. For each:

1. Remove `console.error(error)` — the toast is sufficient for the user
2. If the error needs logging for debugging, consider a structured logger or Sentry capture rather than `console.error`

## Decision Gate

Promote during a UI polish pass, a Sentry/observability integration phase, or a `mutateAsync` → `mutate` refactor. No functional blocker.
