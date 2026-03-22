import { TaskTemplateRepository } from './task-template.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaServiceMock() {
  return {
    taskTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    task: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
}

describe('taskTemplateRepository', () => {
  let repository: TaskTemplateRepository;
  let prisma: ReturnType<typeof createPrismaServiceMock>;

  beforeEach(() => {
    prisma = createPrismaServiceMock();
    repository = new TaskTemplateRepository(prisma as unknown as PrismaService);
  });

  it('keeps admin usage list query lean and resolves task_type without loading full schema blobs', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: BigInt(101),
        uid: 'ttpl_101',
        name: 'Checklist',
        description: 'Lean row',
        isActive: true,
        version: 3,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        studio: {
          uid: 'std_123',
          name: 'Main Studio',
        },
      },
    ]);
    prisma.taskTemplate.count.mockResolvedValue(1);
    prisma.task.groupBy
      .mockResolvedValueOnce([{ templateId: BigInt(101), _count: { _all: 8 } }])
      .mockResolvedValueOnce([{ templateId: BigInt(101), _count: { _all: 5 } }])
      .mockResolvedValueOnce([{ templateId: BigInt(101), _max: { createdAt: new Date('2026-03-03T00:00:00.000Z') } }]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ template_id: BigInt(101), task_type: 'ACTIVE' }])
      .mockResolvedValueOnce([{ template_id: BigInt(101), show_count: BigInt(2) }]);

    const result = await repository.findPaginatedAdminWithUsage({
      skip: 0,
      take: 10,
    });

    expect(prisma.taskTemplate.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: {
        id: true,
        uid: true,
        name: true,
        description: true,
        isActive: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        studio: {
          select: {
            uid: true,
            name: true,
          },
        },
      },
    }));
    expect(prisma.taskTemplate.findMany.mock.calls[0]?.[0]?.select).not.toHaveProperty('currentSchema');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      data: [
        {
          id: 'ttpl_101',
          studio_id: 'std_123',
          studio_name: 'Main Studio',
          name: 'Checklist',
          description: 'Lean row',
          task_type: 'ACTIVE',
          is_active: true,
          version: 3,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z',
          usage_summary: {
            task_count_total: 8,
            task_count_active: 5,
            show_count_active: 2,
            last_used_at: '2026-03-03T00:00:00.000Z',
          },
        },
      ],
      total: 1,
    });
  });
});
