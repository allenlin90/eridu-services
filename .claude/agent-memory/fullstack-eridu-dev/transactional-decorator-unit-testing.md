---
name: transactional-decorator-unit-testing
description: "@Transactional()-decorated erify_api service methods need Test.createTestingModule + ClsPluginTransactional in unit tests, not plain `new Service(...)`."
metadata:
  type: feedback
---

A service method decorated with `@Transactional()` (from `@nestjs-cls/transactional`)
only works through NestJS's DI-based AOP proxy. Constructing the service with
plain `new ShowIssueWorkflowService(...)` in a unit test throws at call time:

```
TransactionHost not initialized, Make sure that the `ClsPluginTransactional`
is properly registered and that the correct `connectionName` is used.
```

**Fix**: mirror `studio-show-management.service.spec.ts`'s harness —
`Test.createTestingModule` with a real `ClsModule.forRoot` + `ClsPluginTransactional`
wired to a mock `PrismaModule` whose `$transaction` immediately invokes the
callback, plus every collaborator provided via `{ provide: X, useValue: mockX }`:

```ts
const mockPrismaForCls = { $transaction: jest.fn(async (cb: any) => cb({})) };

@Module({ providers: [{ provide: PrismaService, useValue: mockPrismaForCls }], exports: [PrismaService] })
class MockPrismaModule {}

const module = await Test.createTestingModule({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: false },
      plugins: [new ClsPluginTransactional({
        imports: [MockPrismaModule],
        adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
      })],
    }),
  ],
  providers: [RealServiceUnderTest, { provide: Collaborator, useValue: collaboratorMock }, ...],
}).compile();
service = module.get(RealServiceUnderTest);
```

Plain unmocked services (no `@Transactional()` in the class) can still use
`new Service(mockA, mockB)` directly — this only applies when the class under
test itself carries the decorator on a method the test calls.

Caught this on the `ShowIssueWorkflowService` unit spec after adding
`@Transactional()` to its five write methods (Phase 5 item 9 manual workflow,
2026-08-01) — see [[show-issue-ownership-implementation]].
