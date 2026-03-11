# Service Tests — Extended Patterns

## Adding Extra Service Dependencies

When a model service depends on more than just a repository and UtilityService, use `additionalProviders`:

```typescript
const module = await createModelServiceTestModule({
  serviceClass: ShowService,
  repositoryClass: ShowRepository,
  repositoryMock,
  utilityMock,
  additionalProviders: [
    {
      provide: ShowStatusService,
      useValue: { findByKey: jest.fn().mockResolvedValue({ uid: 'status_1' }) },
    },
    {
      provide: ClientService,
      useValue: { findOne: jest.fn() },
    },
  ],
});
```

## Mocking nanoid

Services that call `this.generateUid()` (which calls `nanoid` internally) must mock `nanoid` at the module level:

```typescript
jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));
```

Place this at the top of the test file, before imports.

## Testing Version-Guarded Updates

```typescript
it('should increment version on update', async () => {
  const existing = createBaseMockEntity({ uid: 'tmpl_1', version: 2 });
  repositoryMock.updateWithVersionCheck = jest.fn().mockResolvedValue({
    ...existing,
    version: 3,
    name: 'Updated',
  });

  const result = await service.update('tmpl_1', 2, { name: 'Updated' });

  expect(repositoryMock.updateWithVersionCheck).toHaveBeenCalledWith(
    { uid: 'tmpl_1', version: 2 },
    expect.objectContaining({ name: 'Updated', version: 3 }),
  );
});
```

## Testing Soft Delete

```typescript
it('should soft delete the record', async () => {
  const record = createBaseMockEntity({ uid: 'tmpl_1' });
  repositoryMock.findOne = jest.fn().mockResolvedValue(record);
  repositoryMock.softDelete = jest.fn().mockResolvedValue({ ...record, deletedAt: new Date() });

  await service.softDelete({ uid: 'tmpl_1' });

  expect(repositoryMock.softDelete).toHaveBeenCalledWith({ uid: 'tmpl_1' });
});

it('should throw 404 when record does not exist', async () => {
  repositoryMock.findOne = jest.fn().mockResolvedValue(null);

  await expect(service.softDelete({ uid: 'missing' })).rejects.toThrow(NotFoundException);
});
```

## Repository Mock Helpers

`createMockRepository<T>()` scaffolds these methods by default (all return `jest.fn()`):
- `create`
- `findByUid`
- `findOne`
- `update`
- `softDelete`
- `findMany`
- `count`

For extra repository methods (e.g. `findPaginated`, `findAll`, `findByStudio`), pass them as `additionalMethods`:

```typescript
const repositoryMock = createMockRepository<ShowRepository>({
  findPaginated: jest.fn(),
  findByStudio: jest.fn(),
});
```
