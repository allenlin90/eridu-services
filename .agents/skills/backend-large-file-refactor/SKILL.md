---
name: backend-large-file-refactor
description: Refactor erify_api NestJS files over roughly 600 lines or mixing service, controller, repository, or orchestration concerns.
---

# Backend Large-File Refactor

When a service, repository, controller, or spec grows large enough to hide responsibilities, treat size as a design signal before adding more logic.

This skill adds the Nest backend decision rule for oversized files. Load layer-specific skills for the actual patterns.

## Refactor Boundary (Write Down Before Editing)

1. Files in scope + current line counts
2. Public contracts that must not change (method names, route behavior, response shape, transaction boundaries)
3. Verification target: focused tests + `erify_api` checklist

**Classify**: `pure extraction` (stateless helpers) | `provider extraction` (DI-needing collaborator) | `contract extraction` (schema/types files — higher risk)

## Nest-Compatible Concern Pattern

**Pure helper module** when: no DI needs, deterministic, takes all inputs as params, unit-testable without Nest.

**Injectable collaborator** when: needs injected services/repos/logger/`TransactionHost`, performs writes or multi-step effects.

**Avoid mixins/base classes** unless: multiple concrete classes with same lifecycle, inheritance is the local pattern, narrow stable template method.

If it sounds like a Rails concern → try pure helper, injectable provider, or local schema/types file first.

## Good Extraction Targets

- Prisma `where`, `orderBy`, `include`, `select` builders
- UID lookup map construction
- Relation synchronization blocks (create/update/soft-delete children)
- Return shape/type aliases making methods unreadable
- Plan-document parsing/transformation

Do NOT extract just to reduce line count if it makes domain flow harder to follow.

## Implementation Rules

1. Keep original public class as entry point
2. Preserve method signatures unless caller set is fully in scope
3. Keep transaction ownership in original service unless collaborator shares `TransactionHost`
4. Keep extracted helpers close to owning module
5. Move tests only when production behavior moves
6. Commit each scope separately: helpers, providers, contracts, docs
7. Check `git status` after each commit (hooks may auto-format)

## Raise Discussion Before Implementation When

- Helper starts needing DI
- Two domains look similar but have different invariants
- Shared code would couple independent modules
- Extraction changes transaction timing, errors, logging, or counters
