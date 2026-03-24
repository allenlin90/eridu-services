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

  it('applies studio list moderation filters server-side with deterministic sorting', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([]);
    prisma.taskTemplate.count.mockResolvedValue(0);

    await repository.findPaginated({
      skip: 10,
      take: 10,
      name: 'moderation',
      uid: 'ttpl_1',
      studioUid: 'std_123',
      taskType: 'ACTIVE',
      templateKind: 'moderation',
      isActive: true,
      includeDeleted: false,
      sort: 'name:asc',
    });

    expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      where: {
        deletedAt: null,
        name: {
          contains: 'moderation',
          mode: 'insensitive',
        },
        uid: {
          contains: 'ttpl_1',
          mode: 'insensitive',
        },
        studio: { uid: 'std_123' },
        isActive: true,
        AND: [
          {
            currentSchema: {
              path: ['metadata', 'task_type'],
              equals: 'ACTIVE',
            },
          },
          {
            currentSchema: {
              path: ['metadata', 'loops', '0'],
              not: expect.anything(),
            },
          },
        ],
      },
      orderBy: [
        { name: 'asc' },
        { updatedAt: 'desc' },
        { uid: 'asc' },
      ],
    });
    expect(prisma.taskTemplate.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isActive: true,
      }),
    });
  });

  it('treats standard templates as the inverse of the moderation loop filter', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([]);
    prisma.taskTemplate.count.mockResolvedValue(0);

    await repository.findPaginated({
      skip: 0,
      take: 10,
      templateKind: 'standard',
      includeDeleted: true,
      sort: 'updated_at:asc',
    });

    expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          {
            NOT: {
              currentSchema: {
                path: ['metadata', 'loops', '0'],
                not: expect.anything(),
              },
            },
          },
        ],
      },
      orderBy: [
        { updatedAt: 'asc' },
        { uid: 'asc' },
      ],
    }));
  });
});
