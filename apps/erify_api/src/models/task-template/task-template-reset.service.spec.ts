import {
  extractTaskReportDefinitionReferences,
  readTemplateScopedColumnTemplateUid,
  TaskTemplateResetService,
} from './task-template-reset.service';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaServiceMock() {
  const tx = {
    task: {
      deleteMany: jest.fn(),
    },
    taskTemplate: {
      deleteMany: jest.fn(),
    },
    taskTemplateSnapshot: {
      count: jest.fn(),
    },
  };

  return {
    studio: {
      findFirst: jest.fn(),
    },
    taskTemplate: {
      findMany: jest.fn(),
    },
    task: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    taskReportDefinition: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    __tx: tx,
  };
}

describe('taskTemplateResetService', () => {
  let prisma: ReturnType<typeof createPrismaServiceMock>;
  let service: TaskTemplateResetService;

  beforeEach(() => {
    prisma = createPrismaServiceMock();
    service = new TaskTemplateResetService(prisma as unknown as PrismaService);
  });

  it('reads template-scoped column keys safely', () => {
    expect(readTemplateScopedColumnTemplateUid('ttpl_123:notes')).toBe('ttpl_123');
    expect(readTemplateScopedColumnTemplateUid('gmv')).toBeNull();
    expect(readTemplateScopedColumnTemplateUid('bad_prefix:notes')).toBeNull();
  });

  it('extracts saved report definition references from scope and template-scoped columns', () => {
    expect(extractTaskReportDefinitionReferences({
      scope: {
        source_templates: ['ttpl_1', 'ttpl_2', 'show_1'],
      },
      columns: [
        { key: 'ttpl_1:notes', label: 'Notes' },
        { key: 'gmv', label: 'GMV' },
      ],
    })).toEqual({
      sourceTemplateIds: ['ttpl_1', 'ttpl_2'],
      templateScopedColumnTemplateIds: ['ttpl_1'],
    });
  });

  it('plans reset inventory in a studio-scoped way and counts tasks via templateId or snapshot.templateId', async () => {
    prisma.studio.findFirst.mockResolvedValue({
      id: BigInt(11),
      uid: 'std_11',
      name: 'Reset Studio',
    });
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: BigInt(101),
        uid: 'ttpl_101',
        name: 'Template A',
        description: null,
        isActive: true,
        deletedAt: null,
        _count: { snapshots: 3 },
      },
    ]);
    prisma.task.count.mockResolvedValue(0);
    prisma.task.findMany.mockResolvedValue([
      {
        id: BigInt(501),
        createdAt: new Date('2026-03-20T00:00:00.000Z'),
        deletedAt: null,
        templateId: BigInt(101),
        snapshot: { templateId: BigInt(101) },
        targets: [{ showId: BigInt(7001) }],
      },
      {
        id: BigInt(502),
        createdAt: new Date('2026-03-22T00:00:00.000Z'),
        deletedAt: new Date('2026-03-22T12:00:00.000Z'),
        templateId: null,
        snapshot: { templateId: BigInt(101) },
        targets: [{ showId: BigInt(7002) }],
      },
    ]);
    prisma.taskReportDefinition.findMany.mockResolvedValue([]);

    const plan = await service.planReset({
      studioUid: 'std_11',
      templateUids: ['ttpl_101'],
    });

    expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        studioId: BigInt(11),
        uid: { in: ['ttpl_101'] },
      },
    }));
    expect(prisma.task.count).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            OR: [
              { templateId: { in: [BigInt(101)] } },
              { snapshot: { is: { templateId: { in: [BigInt(101)] } } } },
            ],
          },
          {
            NOT: {
              studioId: BigInt(11),
            },
          },
        ],
      },
    });
    expect(plan.templates).toEqual([
      {
        id: BigInt(101),
        uid: 'ttpl_101',
        name: 'Template A',
        description: null,
        isActive: true,
        isSoftDeleted: false,
        snapshotCount: 3,
        taskCountTotal: 2,
        taskCountActive: 1,
        boundShowCount: 2,
        lastUsedAt: '2026-03-22T00:00:00.000Z',
      },
    ]);
    expect(plan.totalTaskCount).toBe(2);
    expect(plan.totalActiveTaskCount).toBe(1);
    expect(plan.totalSnapshotCount).toBe(3);
    expect(plan.taskIdsToDelete).toEqual([BigInt(501), BigInt(502)]);
  });

  it('aborts execution when saved report definitions reference target templates', async () => {
    prisma.studio.findFirst.mockResolvedValue({
      id: BigInt(11),
      uid: 'std_11',
      name: 'Reset Studio',
    });
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: BigInt(101),
        uid: 'ttpl_101',
        name: 'Template A',
        description: null,
        isActive: true,
        deletedAt: null,
        _count: { snapshots: 1 },
      },
    ]);
    prisma.task.count.mockResolvedValue(0);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.taskReportDefinition.findMany.mockResolvedValue([
      {
        uid: 'trd_1',
        name: 'Report 1',
        definition: {
          scope: {
            source_templates: ['ttpl_101'],
          },
          columns: [{ key: 'ttpl_101:notes', label: 'Notes' }],
        },
      },
    ]);

    await expect(service.executeReset({
      studioUid: 'std_11',
      templateUids: ['ttpl_101'],
    })).rejects.toThrow(
      'Task template reset aborted because saved task report definitions reference target templates: trd_1',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes tasks and templates for the selected studio and verifies snapshot cascade', async () => {
    prisma.studio.findFirst.mockResolvedValue({
      id: BigInt(11),
      uid: 'std_11',
      name: 'Reset Studio',
    });
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: BigInt(101),
        uid: 'ttpl_101',
        name: 'Template A',
        description: null,
        isActive: true,
        deletedAt: null,
        _count: { snapshots: 2 },
      },
    ]);
    prisma.task.count.mockResolvedValue(0);
    prisma.task.findMany.mockResolvedValue([
      {
        id: BigInt(501),
        createdAt: new Date('2026-03-20T00:00:00.000Z'),
        deletedAt: null,
        templateId: BigInt(101),
        snapshot: { templateId: BigInt(101) },
        targets: [{ showId: BigInt(7001) }],
      },
      {
        id: BigInt(502),
        createdAt: new Date('2026-03-21T00:00:00.000Z'),
        deletedAt: new Date('2026-03-21T08:00:00.000Z'),
        templateId: null,
        snapshot: { templateId: BigInt(101) },
        targets: [],
      },
    ]);
    prisma.taskReportDefinition.findMany.mockResolvedValue([]);
    prisma.__tx.task.deleteMany.mockResolvedValue({ count: 2 });
    prisma.__tx.taskTemplate.deleteMany.mockResolvedValue({ count: 1 });
    prisma.__tx.taskTemplateSnapshot.count.mockResolvedValue(0);

    const result = await service.executeReset({
      studioUid: 'std_11',
      templateUids: ['ttpl_101'],
    });

    expect(prisma.__tx.task.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [BigInt(501), BigInt(502)] },
        studioId: BigInt(11),
      },
    });
    expect(prisma.__tx.taskTemplate.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [BigInt(101)] },
        studioId: BigInt(11),
      },
    });
    expect(prisma.__tx.taskTemplateSnapshot.count).toHaveBeenCalledWith({
      where: {
        templateId: { in: [BigInt(101)] },
      },
    });
    expect(result.deletedTaskCount).toBe(2);
    expect(result.deletedTemplateCount).toBe(1);
  });

  it('deletes a template with no tasks cleanly', async () => {
    prisma.studio.findFirst.mockResolvedValue({
      id: BigInt(11),
      uid: 'std_11',
      name: 'Reset Studio',
    });
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: BigInt(101),
        uid: 'ttpl_101',
        name: 'Template A',
        description: null,
        isActive: false,
        deletedAt: new Date('2026-03-20T00:00:00.000Z'),
        _count: { snapshots: 1 },
      },
    ]);
    prisma.task.count.mockResolvedValue(0);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.taskReportDefinition.findMany.mockResolvedValue([]);
    prisma.__tx.taskTemplate.deleteMany.mockResolvedValue({ count: 1 });
    prisma.__tx.taskTemplateSnapshot.count.mockResolvedValue(0);

    const result = await service.executeReset({
      studioUid: 'std_11',
      templateUids: ['ttpl_101'],
    });

    expect(prisma.__tx.task.deleteMany).not.toHaveBeenCalled();
    expect(result.deletedTaskCount).toBe(0);
    expect(result.templates[0]?.isSoftDeleted).toBe(true);
  });
});
