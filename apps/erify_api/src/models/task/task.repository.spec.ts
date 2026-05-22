import type { TransactionHost } from '@nestjs-cls/transactional';
import { Prisma, TaskType } from '@prisma/client';

import { TaskRepository } from './task.repository';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaTaskDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('taskRepository', () => {
  let repository: TaskRepository;
  const prismaTaskDelegate = createPrismaTaskDelegateMock();
  const txTaskDelegate = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      task: prismaTaskDelegate,
    } as unknown as PrismaService;

    const txHost = {
      tx: {
        task: txTaskDelegate,
      },
    } as unknown as TransactionHost<any>;

    repository = new TaskRepository(prisma, txHost);
  });

  describe('updateActiveTaskSnapshot', () => {
    it('successfully updates snapshot and merges metadata on active task', async () => {
      txTaskDelegate.findFirst.mockResolvedValueOnce({
        id: BigInt(1000),
        version: 5,
        metadata: { existing_key: 'value' },
      });

      txTaskDelegate.update.mockResolvedValueOnce({
        id: BigInt(1000),
        version: 6,
        snapshotId: BigInt(101),
        description: 'New Description',
        type: TaskType.SETUP,
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        metadata: { existing_key: 'value', new_key: 'new_value' },
      });

      const result = await repository.updateActiveTaskSnapshot(
        BigInt(1000),
        5,
        {
          snapshotId: BigInt(101),
          description: 'New Description',
          type: TaskType.SETUP,
          dueDate: new Date('2026-03-01T00:00:00.000Z'),
          version: 6,
          metadata: { new_key: 'new_value' },
        },
      );

      expect(txTaskDelegate.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(1000), deletedAt: null },
        select: { metadata: true, version: true },
      });

      expect(txTaskDelegate.update).toHaveBeenCalledWith({
        where: { id: BigInt(1000), version: 5, deletedAt: null },
        data: {
          snapshotId: BigInt(101),
          description: 'New Description',
          type: TaskType.SETUP,
          dueDate: new Date('2026-03-01T00:00:00.000Z'),
          version: 6,
          metadata: { existing_key: 'value', new_key: 'new_value' },
        },
      });

      expect(result.version).toBe(6);
    });

    it('throws "Task not found" if task does not exist or is soft-deleted on pre-read', async () => {
      txTaskDelegate.findFirst.mockResolvedValueOnce(null);

      await expect(
        repository.updateActiveTaskSnapshot(
          BigInt(1000),
          5,
          {
            snapshotId: BigInt(101),
            description: 'New Description',
            type: TaskType.SETUP,
            dueDate: new Date('2026-03-01T00:00:00.000Z'),
            version: 6,
          },
        ),
      ).rejects.toThrow('Task not found');

      expect(txTaskDelegate.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(1000), deletedAt: null },
        select: { metadata: true, version: true },
      });
      expect(txTaskDelegate.update).not.toHaveBeenCalled();
    });

    it('throws VersionConflictError if concurrent update changed the version', async () => {
      txTaskDelegate.findFirst
        // First call: pre-read (active task exist)
        .mockResolvedValueOnce({
          id: BigInt(1000),
          version: 5,
          metadata: {},
        })
        // Second call: check existence after error (returns different version)
        .mockResolvedValueOnce({
          id: BigInt(1000),
          version: 6,
        });

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: PRISMA_ERROR.RecordNotFound,
          clientVersion: '5.0.0',
        },
      );
      txTaskDelegate.update.mockRejectedValueOnce(prismaError);

      await expect(
        repository.updateActiveTaskSnapshot(
          BigInt(1000),
          5,
          {
            snapshotId: BigInt(101),
            description: 'New Description',
            type: TaskType.SETUP,
            dueDate: new Date('2026-03-01T00:00:00.000Z'),
            version: 6,
          },
        ),
      ).rejects.toThrow(VersionConflictError);

      expect(txTaskDelegate.findFirst).toHaveBeenCalledTimes(2);
      expect(txTaskDelegate.findFirst.mock.calls[1][0]).toEqual({
        where: { id: BigInt(1000), deletedAt: null },
        select: { version: true },
      });
    });

    it('rethrows original Prisma RecordNotFound error if task was deleted concurrently', async () => {
      txTaskDelegate.findFirst
        // First call: pre-read
        .mockResolvedValueOnce({
          id: BigInt(1000),
          version: 5,
          metadata: {},
        })
        // Second call: check existence after error (returns null because deleted)
        .mockResolvedValueOnce(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: PRISMA_ERROR.RecordNotFound,
          clientVersion: '5.0.0',
        },
      );
      txTaskDelegate.update.mockRejectedValueOnce(prismaError);

      await expect(
        repository.updateActiveTaskSnapshot(
          BigInt(1000),
          5,
          {
            snapshotId: BigInt(101),
            description: 'New Description',
            type: TaskType.SETUP,
            dueDate: new Date('2026-03-01T00:00:00.000Z'),
            version: 6,
          },
        ),
      ).rejects.toThrow(prismaError);
    });
  });
});
