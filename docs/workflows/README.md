# Workflows

Cross-feature end-to-end flow guides. Each document describes a complete operational flow — who does what, in what order, across which features and apps.

These are **navigation guides**, not specs or API references. They orient a developer or operator to the full journey before they dive into feature docs or technical implementation.

## Available Workflows

| Workflow | Description |
| --- | --- |
| [Creator Operations](./creator-operations.md) | RBAC roles → creator roster → show assignment → economics |
| [Shift Operations](./shift-operations.md) | Member roster → shift creation → actuals entry → cost review (operator side) |
| [Task & Operations Review](./task-and-operations-review.md) | Template field bindings → task generation → operator execution → bulk approval → daily review/export |

## When to Add a Workflow Doc

Add one when a user journey meaningfully spans two or more features and would be confusing to understand by reading each feature doc in isolation. A workflow doc should describe actor sequences and cross-feature data flow — not re-document API contracts.
