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
    count: jest.fn(),
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

  describe('reserveMaterialAssetUploadVersion', () => {
    it('successfully increments upload version without bumping task version', async () => {
      txTaskDelegate.findFirst.mockResolvedValueOnce({
        id: BigInt(1000),
        version: 5,
        metadata: {
          material_asset_upload_versions: {
            proof_photo: 2,
          },
        },
      });

      txTaskDelegate.update.mockResolvedValueOnce({
        id: BigInt(1000),
        version: 5,
        metadata: {
          material_asset_upload_versions: {
            proof_photo: 3,
          },
        },
      });

      const nextVersion = await repository.reserveMaterialAssetUploadVersion('task_abc', 'proof_photo');

      expect(txTaskDelegate.findFirst).toHaveBeenCalledWith({
        where: { uid: 'task_abc', deletedAt: null },
        select: { id: true, metadata: true, version: true },
      });

      expect(txTaskDelegate.update).toHaveBeenCalledWith({
        where: { id: BigInt(1000), version: 5, deletedAt: null },
        data: {
          metadata: {
            material_asset_upload_versions: {
              proof_photo: 3,
            },
          },
        },
      });

      expect(nextVersion).toBe(3);
    });

    it('throws "Task not found" if task does not exist', async () => {
      txTaskDelegate.findFirst.mockResolvedValueOnce(null);

      await expect(
        repository.reserveMaterialAssetUploadVersion('task_abc', 'proof_photo'),
      ).rejects.toThrow('Task not found');
    });

    it('throws VersionConflictError if concurrent update changed the version', async () => {
      txTaskDelegate.findFirst
        // Pre-read
        .mockResolvedValueOnce({
          id: BigInt(1000),
          version: 5,
          metadata: {},
        })
        // Post-error read to check active task version
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
        repository.reserveMaterialAssetUploadVersion('task_abc', 'proof_photo'),
      ).rejects.toThrow(VersionConflictError);

      expect(txTaskDelegate.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('findTaskReviewStats', () => {
    it('counts dated-in-range OR undated tasks whose show starts in range', async () => {
      txTaskDelegate.count.mockResolvedValue(0);

      await repository.findTaskReviewStats({
        page: 1,
        limit: 10,
        sort: 'due_date:asc',
        due_date_from: '2026-05-12T00:00:00.000Z',
        due_date_to: '2026-05-13T00:00:00.000Z',
      } as any);

      // Every tab count must be scoped so undated review tasks are not dropped.
      expect(txTaskDelegate.count).toHaveBeenCalled();
      for (const call of txTaskDelegate.count.mock.calls) {
        const where = call[0].where as Prisma.TaskWhereInput;
        const andClauses = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        const dateScope = andClauses.find((clause) => Array.isArray((clause as any)?.OR));
        expect(dateScope).toBeDefined();
        const orBranches = (dateScope as any).OR as any[];
        // Branch 1: tasks whose due date falls in range.
        expect(orBranches).toContainEqual(
          expect.objectContaining({ dueDate: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }) }),
        );
        // Branch 2: undated tasks attached to a show starting in range.
        expect(orBranches).toContainEqual(
          expect.objectContaining({
            dueDate: null,
            targets: expect.objectContaining({
              some: expect.objectContaining({
                show: expect.objectContaining({ startTime: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }) }),
              }),
            }),
          }),
        );
      }
    });
  });
});
