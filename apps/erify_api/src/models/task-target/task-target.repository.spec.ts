import type { TransactionHost } from '@nestjs-cls/transactional';

import { TaskTargetRepository } from './task-target.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createTaskTargetDelegateMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
}

describe('taskTargetRepository', () => {
  let repository: TaskTargetRepository;
  const txDelegate = createTaskTargetDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {} as unknown as PrismaService;
    const txHost = { tx: { taskTarget: txDelegate } } as unknown as TransactionHost<any>;
    repository = new TaskTargetRepository(prisma, txHost);
  });

  describe('countActiveByShowId', () => {
    it('excludes COMPLETED and CLOSED tasks from the count', async () => {
      txDelegate.count.mockResolvedValue(2);

      const result = await repository.countActiveByShowId(7n);

      expect(txDelegate.count).toHaveBeenCalledWith({
        where: {
          showId: 7n,
          deletedAt: null,
          task: { deletedAt: null, status: { notIn: ['COMPLETED', 'CLOSED'] } },
        },
      });
      expect(result).toBe(2);
    });
  });
});
