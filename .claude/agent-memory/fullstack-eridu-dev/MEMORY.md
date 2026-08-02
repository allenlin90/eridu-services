# Memory Index

- [prisma-migration-drift-workaround.md](prisma-migration-drift-workaround.md) — generate a migration via `prisma migrate diff` + disposable shadow DB when local dev DB has untracked drift blocking `prisma migrate dev`
- [transactional-decorator-unit-testing.md](transactional-decorator-unit-testing.md) — `@Transactional()`-decorated service methods need `Test.createTestingModule` + `ClsPluginTransactional`, not plain `new Service(...)`, or they throw "TransactionHost not initialized"
- [optimistic-lock-expected-version-bug-pattern.md](optimistic-lock-expected-version-bug-pattern.md) — a workflow service that re-fetches "current" for auth/state checks must NOT reuse `current.version` as the optimistic-lock expected version; caught only by real-DB integration tests, not mocked unit tests
- [show-issue-ownership-implementation.md](show-issue-ownership-implementation.md) — Phase 5 item 9 Delivery Sequence steps 1-2 implementation notes: files, route shape, module layout, deferred pieces
- [show-issue-reconciliation-step4.md](show-issue-reconciliation-step4.md) — Phase 5 item 9 step 4 (automated ShowIssue reconciliation): open decisions I made (severity default, manual-resolution-is-sticky rule, ShowPlatformViolationSummary.id addition), and a NestJS TestingModule exports gotcha
- [verify-branch-before-commit.md](verify-branch-before-commit.md) — always confirm checked-out branch right before/after `git commit`; integration-PR child branches start at the same tip as their parent and are easy to conflate
