import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { TaskReportDefinitionRepository } from './task-report-definition.repository';
import { TaskReportDefinitionService } from './task-report-definition.service';

import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

describe('taskReportDefinitionService', () => {
  const defaultReportScope = {
    date_from: '2026-03-01',
    date_to: '2026-03-31',
    show_standard_id: ['shsd_1'],
  };

  const defaultDefinition = {
    scope: { ...defaultReportScope, submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'] as ('REVIEW' | 'COMPLETED' | 'CLOSED')[] },
    columns: [{ key: 'gmv', label: 'GMV' }],
  };

  let service: TaskReportDefinitionService;
  let repository: jest.Mocked<TaskReportDefinitionRepository>;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskReportDefinitionService,
        {
          provide: TaskReportDefinitionRepository,
          useValue: {
            findPaginated: jest.fn(),
            findByUidInStudio: jest.fn(),
            createInStudio: jest.fn(),
            updateInStudio: jest.fn(),
            softDeleteById: jest.fn(),
          },
        },
        {
          provide: UtilityService,
          useValue: {
            generateBrandedId: jest.fn().mockReturnValue('trd_generated'),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserByExtId: jest.fn().mockResolvedValue({
              id: 101n,
              uid: 'user_1',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(TaskReportDefinitionService);
    repository = module.get(TaskReportDefinitionRepository);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists all studio definitions without creator filter', async () => {
    repository.findPaginated.mockResolvedValue({
      data: [
        {
          id: 1n,
          uid: 'trd_1',
          studioId: 1n,
          name: 'Weekly',
          description: 'Desc',
          definition: defaultDefinition,
          metadata: {},
          version: 1,
          createdById: 201n,
          createdBy: { uid: 'user_other' },
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          updatedAt: new Date('2026-03-02T00:00:00.000Z'),
          deletedAt: null,
        },
      ],
      total: 1,
    });

    const result = await service.listDefinitions('std_1', { skip: 0, take: 20, search: 'week' });
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({
      id: 'trd_1',
      name: 'Weekly',
      description: 'Desc',
      created_by_id: 'user_other',
    });
    expect(repository.findPaginated).toHaveBeenCalledWith(
      expect.not.objectContaining({ createdById: expect.anything() }),
    );
  });

  it('gets one definition in studio scope without creator filter', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: null,
      createdBy: null,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      deletedAt: null,
    });

    await expect(service.getDefinition('std_1', 'trd_1')).resolves.toMatchObject({
      id: 'trd_1',
      name: 'Weekly',
    });
    expect(repository.findByUidInStudio).toHaveBeenCalledWith('std_1', 'trd_1');
  });

  it('creates definition with generated uid', async () => {
    repository.createInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_generated',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: null,
      createdBy: null,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await service.createDefinition('std_1', 'ext_1', {
      name: 'Weekly',
      definition: defaultDefinition,
    });

    expect(result.id).toBe('trd_generated');
    expect(repository.createInStudio).toHaveBeenCalledWith(expect.objectContaining({
      studioUid: 'std_1',
      createdById: 101n,
      uid: 'trd_generated',
    }));
  });

  it('allows creator to update their own definition', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 101n,
      createdBy: { uid: 'user_1' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.updateInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly v2',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 101n,
      createdBy: { uid: 'user_1' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-03T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await service.updateDefinition('std_1', 'ext_1', 'manager', 'trd_1', { name: 'Weekly v2', version: 1 });
    expect(result.name).toBe('Weekly v2');
    expect(repository.updateInStudio).toHaveBeenCalledWith(expect.objectContaining({
      id: 1n,
      data: expect.objectContaining({ version: { increment: 1 } }),
    }));
  });

  it('allows admin to update any definition', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 999n,
      createdBy: { uid: 'user_other' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.updateInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Admin updated',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 999n,
      createdBy: { uid: 'user_other' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-03T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await service.updateDefinition('std_1', 'ext_1', 'admin', 'trd_1', { name: 'Admin updated', version: 1 });
    expect(result.name).toBe('Admin updated');
  });

  it('rejects non-creator non-admin from updating', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 999n,
      createdBy: { uid: 'user_other' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });

    await expect(
      service.updateDefinition('std_1', 'ext_1', 'manager', 'trd_1', { name: 'Hijack', version: 1 }),
    ).rejects.toThrow('Only the definition creator or a studio admin can modify this definition');
  });

  it('rejects update when version does not match (optimistic locking)', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 3,
      createdById: 101n,
      createdBy: { uid: 'user_1' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });

    await expect(
      service.updateDefinition('std_1', 'ext_1', 'manager', 'trd_1', { name: 'Stale update', version: 1 }),
    ).rejects.toThrow('Version mismatch. Expected 1, but definition is at version 3');
  });

  it('clears description when update payload sets description to null', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: 'Old description',
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 101n,
      createdBy: { uid: 'user_1' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.updateInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 101n,
      createdBy: { uid: 'user_1' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-03T00:00:00.000Z'),
      deletedAt: null,
    });

    await service.updateDefinition('std_1', 'ext_1', 'manager', 'trd_1', { description: null, version: 1 });

    expect(repository.updateInStudio).toHaveBeenCalledWith(expect.objectContaining({
      id: 1n,
      data: expect.objectContaining({
        description: null,
      }),
    }));
  });

  it('allows creator to soft delete their own definition', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 101n,
      createdBy: { uid: 'user_1' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.softDeleteById.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: {},
      metadata: {},
      version: 1,
      createdById: 101n,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: new Date('2026-03-05T00:00:00.000Z'),
    });

    await service.deleteDefinition('std_1', 'ext_1', 'manager', 'trd_1');
    expect(repository.softDeleteById).toHaveBeenCalledWith(1n);
  });

  it('allows admin to delete any definition', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 999n,
      createdBy: { uid: 'user_other' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.softDeleteById.mockResolvedValue({} as any);

    await service.deleteDefinition('std_1', 'ext_1', 'admin', 'trd_1');
    expect(repository.softDeleteById).toHaveBeenCalledWith(1n);
  });

  it('rejects non-creator non-admin from deleting', async () => {
    repository.findByUidInStudio.mockResolvedValue({
      id: 1n,
      uid: 'trd_1',
      studioId: 1n,
      name: 'Weekly',
      description: null,
      definition: defaultDefinition,
      metadata: {},
      version: 1,
      createdById: 999n,
      createdBy: { uid: 'user_other' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      deletedAt: null,
    });

    await expect(
      service.deleteDefinition('std_1', 'ext_1', 'manager', 'trd_1'),
    ).rejects.toThrow('Only the definition creator or a studio admin can modify this definition');
  });

  it('rejects when authenticated user profile is missing', async () => {
    userService.getUserByExtId.mockResolvedValueOnce(null);

    await expect(service.createDefinition('std_1', 'ext_missing', {
      name: 'Test',
      definition: defaultDefinition,
    })).rejects.toThrow('Authenticated user profile was not found');
  });
});
