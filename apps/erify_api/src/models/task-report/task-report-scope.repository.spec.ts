import { TaskReportScopeRepository } from './task-report-scope.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaServiceMock() {
  return {
    show: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    taskTemplate: {
      findMany: jest.fn(),
    },
    taskTemplateSnapshot: {
      findMany: jest.fn(),
    },
  };
}

describe('taskReportScopeRepository', () => {
  let repository: TaskReportScopeRepository;
  let prisma: ReturnType<typeof createPrismaServiceMock>;

  beforeEach(() => {
    prisma = createPrismaServiceMock();
    repository = new TaskReportScopeRepository(prisma as unknown as PrismaService);
  });

  it('hydrates source snapshots without excluding soft-deleted templates', async () => {
    prisma.task.groupBy.mockResolvedValue([
      {
        templateId: BigInt(101),
        snapshotId: BigInt(501),
        _count: { _all: 4 },
      },
    ]);
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: BigInt(101),
        uid: 'ttpl_deleted',
        name: 'Deleted Template',
      },
    ]);
    prisma.taskTemplateSnapshot.findMany.mockResolvedValue([
      {
        id: BigInt(501),
        version: 7,
        schema: { items: [], metadata: { task_type: 'CLOSURE' } },
      },
    ]);

    const result = await repository.findSourceSnapshotsInScope('std_123', {
      submittedStatuses: ['COMPLETED'],
    });

    const templateWhere = prisma.taskTemplate.findMany.mock.calls[0]?.[0]?.where as { deletedAt?: null };
    expect(templateWhere.deletedAt).toBeUndefined();
    expect(result).toEqual([
      {
        templateUid: 'ttpl_deleted',
        templateName: 'Deleted Template',
        snapshotVersion: 7,
        snapshotSchema: { items: [], metadata: { task_type: 'CLOSURE' } },
        taskCount: 4,
      },
    ]);
  });
});
