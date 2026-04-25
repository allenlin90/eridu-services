---
name: backend-large-file-refactor
description: Use when auditing or refactoring oversized NestJS backend files in apps/erify_api, especially files over roughly 600 lines. Guides behavior-preserving splits into pure helpers, typed query/lookup modules, or injectable collaborators while preserving public contracts and committing each scope separately.
---

# Backend Large-File Refactor

Use this skill for `apps/erify_api` refactors where a service, repository, controller, or spec has grown large enough to hide responsibilities or duplicate logic.

## Refactor Boundary

Before editing, write down:

1. Files in scope and their current line counts.
2. Public contracts that must not change: exported class names, method names, route behavior, response shape, transaction boundaries, and error messages.
3. Verification target: focused tests for touched modules plus `pnpm --filter erify_api lint`, `typecheck`, `test`, and build when build behavior could differ.

Classify the batch:

- `pure extraction`: moving stateless query builders, include/select shapes, UID collection, type aliases, or plan-document transforms.
- `provider extraction`: moving side-effectful work that needs DI, transaction host, logging, or UID generation into an injectable collaborator.
- `contract extraction`: moving shared API/domain contracts into schema/types files. Treat this as higher risk because imports may be wider.

## Nest-Compatible Concern Pattern

Prefer composition over Rails-style mixins.

Use a pure helper module when the extracted logic:

- has no DI needs
- takes all inputs as parameters
- is deterministic
- returns query objects, maps, DTO-ish values, or transformed documents
- can be unit-tested without a Nest testing module

Use an injectable collaborator when the extracted logic:

- needs injected services, repositories, logger, or `TransactionHost`
- performs writes or multi-step side effects
- owns a coherent workflow inside a larger orchestration
- should be mocked or replaced in a Nest `TestingModule`

Avoid mixins/base classes unless all are true:

- there are multiple concrete classes with the same lifecycle contract
- inheritance is already the local pattern
- the base class exposes a stable, narrow template method
- composition would create more indirection than it removes

## Good Extraction Targets

- Prisma `where`, `orderBy`, `include`, and `select` builders.
- UID lookup map construction used before validation or publishing.
- Relation synchronization blocks that create/update/soft-delete child rows.
- Return shape/type aliases that make service methods unreadable.
- Plan-document parsing/transformation where error messages must remain stable.

Do not extract logic just to reduce line count if it makes domain flow harder to follow.

## Implementation Rules

1. Keep the original public class as the entry point.
2. Preserve method signatures unless the caller set is fully in scope.
3. Keep transaction ownership in the original service unless the collaborator is deliberately injected with the same `TransactionHost`.
4. Move tests only when the production behavior moves; do not create broad test churn.
5. Commit each coherent scope separately:
   - query/helper extraction
   - injectable collaborator extraction
   - validation or type-only extraction
   - skill/doc update
6. After each commit, check `git status` because repo hooks may run `eslint --fix`; amend hook-only formatting into the same scope commit.

## Review Questions

Raise a discussion before implementation when:

- a helper starts needing DI
- two domains look similar but have different invariants
- shared code would couple modules that are currently independent
- an extraction changes transaction timing, emitted errors, logging, or summary counters
- the only benefit is imitating a “concerns” structure without a clear Nest provider/helper boundary
