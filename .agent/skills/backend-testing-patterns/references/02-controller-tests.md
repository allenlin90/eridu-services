# Controller Tests — Extended Patterns

## Studio Controller Test

Studio controllers operate in a studio scope. The `studioId` param is already validated by the guard — in tests, pass it directly.

```typescript
describe('StudioTaskController', () => {
  let controller: StudioTaskController;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [StudioTaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(StudioTaskController);
    taskService = module.get(TaskService);
  });

  it('should return task when found', async () => {
    const task = { uid: 'task_1', name: 'Setup' } as any;
    taskService.findOne.mockResolvedValue(task);

    const result = await controller.show('studio_1', 'task_1');

    expect(result).toEqual(task);
    expect(taskService.findOne).toHaveBeenCalledWith(expect.objectContaining({ uid: 'task_1' }));
  });
});
```

## Admin Controller Test (using helper)

Use `createAdminControllerTestModule` for admin controllers:

```typescript
import { createAdminControllerTestModule } from '@/testing/admin-controller-test.helper';

describe('AdminClientController', () => {
  let controller: AdminClientController;
  let clientService: jest.Mocked<ClientService>;

  const mockClientService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module = await createAdminControllerTestModule({
      controllerClass: AdminClientController,
      serviceMocks: new Map([[ClientService, mockClientService]]),
    });

    controller = module.get(AdminClientController);
    clientService = module.get(ClientService);
  });
});
```

## JWT-Protected Controller Test

Use `createJwtControllerTestModule` from `@/testing/jwt-controller-test.helper` for me-scoped controllers that require a JWT user on the request:

```typescript
import { createJwtControllerTestModule } from '@/testing/jwt-controller-test.helper';

// Sets up module with mocked JwtAuthGuard and injects user into request
const module = await createJwtControllerTestModule({
  controllerClass: MeTaskController,
  serviceMocks: new Map([[TaskService, mockTaskService]]),
  mockUser: { uid: 'user_1', ext_id: 'ext-123' },
});
```

## Asserting Delegation (Not Business Logic)

Controller tests verify that the controller delegates correctly:

```typescript
it('should call service with mapped payload', async () => {
  const dto = { name: 'Test', schema: { items: [] }, version: 1 };
  const expected = { uid: 'tmpl_1', name: 'Test' } as any;

  taskTemplateService.updateTemplateWithSnapshot.mockResolvedValue(expected);

  const result = await controller.update('studio_1', 'tmpl_1', dto);

  expect(result).toEqual(expected);
  expect(taskTemplateService.updateTemplateWithSnapshot).toHaveBeenCalledWith(
    'tmpl_1',
    'studio_1',
    expect.objectContaining({ name: 'Test', version: 1 }),
  );
});
```

Do **not** assert the internal service behavior — only that it was called with correct arguments.
