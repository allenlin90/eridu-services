---
name: backend-large-file-refactor
description: Use when developing, auditing, or refactoring apps/erify_api NestJS files that are over roughly 600 lines, mix several backend concerns, hide duplicated logic, or invite Rails-style mixins/concerns.
---

# Backend Large-File Refactor

Use this skill as a development principle for `apps/erify_api`: when a service, repository, controller, or spec grows large enough to hide responsibilities, treat size as a design signal before adding more logic.

This skill does not replace layer-specific skills. Load the matching service, repository, controller, testing, or code-quality skill for the layer being changed.

## Relationship To Other Skills

- `engineering-best-practices-enforcer`: owns general refactor discipline, impact analysis, and review posture. This skill only adds the Nest backend decision rule for oversized files.
- `code-quality`: owns lint/typecheck/test/build verification and generic maintainability checks. This skill only names the large-file-specific verification targets.
- `service-pattern-nestjs`: owns service responsibilities, transaction boundaries, orchestration boundaries, and public service contracts. This skill helps decide when service internals should move to pure helpers or injectable collaborators.
- `repository-pattern-nestjs`: owns Prisma query ownership and repository contracts. Query helper extraction stays repository-owned; do not move repository concerns into services just to reduce line count.
- `backend-controller-pattern-nestjs`: owns route shape, response decorators, pipes, guards, and controller thinness. Controller refactors should preserve public API behavior and defer detailed route rules to that skill.
- `orchestration-service-nestjs`: owns cross-domain workflow design. Use this skill when an orchestration file is too large; use the orchestration skill to decide whether a collaborator belongs in orchestration or in a domain service.
- `package-extraction-strategy`: owns cross-package/shared library extraction. Start large-file refactors locally; promote to a package only when a real second consumer exists.
- `solid-principles`: owns general SRP/composition reasoning. This skill makes the Nest-specific call: prefer composition with providers or pure modules over mixin-style inheritance.

## Refactor Boundary

Before editing, write down:

1. Files in scope and their current line counts.
2. Public contracts that must not change: exported class names, method names, route behavior, response shape, transaction boundaries, and error messages.
3. Verification target: focused tests for touched modules plus the `code-quality` / repo verification checklist for `erify_api`.

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

If the proposed abstraction sounds like a Rails concern, first try one of:

- a pure helper module for deterministic transforms/query builders
- an injectable Nest provider for side effects, DI, transactions, or mocks
- a local schema/types file for payload shapes and return aliases

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
4. Keep extracted helpers close to the owning module unless package extraction is explicitly in scope.
5. Move tests only when the production behavior moves; do not create broad test churn.
6. Commit each coherent scope separately:
   - query/helper extraction
   - injectable collaborator extraction
   - validation or type-only extraction
   - skill/doc update
7. After each commit, check `git status` because repo hooks may run `eslint --fix`; amend hook-only formatting into the same scope commit.

## Review Questions

Raise a discussion before implementation when:

- a helper starts needing DI
- two domains look similar but have different invariants
- shared code would couple modules that are currently independent
- an extraction changes transaction timing, emitted errors, logging, or summary counters
- the only benefit is imitating a “concerns” structure without a clear Nest provider/helper boundary
