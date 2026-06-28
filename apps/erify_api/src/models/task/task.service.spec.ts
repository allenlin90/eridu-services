import { Module } from '@nestjs/common';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { TaskStatus, TaskType } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import { TaskRepository } from './task.repository';
import { TaskService } from './task.service';
import { TaskValidationService } from './task-validation.service';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { ShowService } from '@/models/show/show.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('taskService', () => {
  let service: TaskService;
  let repository: jest.Mocked<TaskRepository>;

  beforeEach(async () => {
    const repositoryMock = createMockRepository<TaskRepository>({
      updateWithVersionCheck: jest.fn(),
    });
    const utilityMock = createMockUtilityService('task_test123');
    const taskValidationServiceMock = {};
    const showServiceMock = {};

    const module = await createModelServiceTestModule({
      serviceClass: TaskService,
      repositoryClass: TaskRepository,
      repositoryMock,
      utilityMock,
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
          plugins: [
            new ClsPluginTransactional({
              imports: [MockPrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
      ],
      additionalProviders: [
        {
          provide: TaskValidationService,
          useValue: taskValidationServiceMock,
        },
        {
          provide: ShowService,
          useValue: showServiceMock,
        },
      ],
    });

    service = module.get<TaskService>(TaskService);
    repository = module.get<TaskRepository>(TaskRepository) as jest.Mocked<TaskRepository>;
  });

  describe('reconcileTaskDueDates', () => {
    const showId = BigInt(1);
    const oldTimes = {
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T12:00:00Z'),
    };
    const newTimes = {
      startTime: new Date('2024-01-01T11:00:00Z'),
      endTime: new Date('2024-01-01T13:00:00Z'),
    };

    it('should reconcile due date for eligible generated tasks whose due date matches old derived formula', async () => {
      const mockTasks = [
        {
          id: BigInt(10),
          uid: 'task_1',
          type: TaskType.SETUP,
          templateId: BigInt(100),
          status: TaskStatus.PENDING,
          version: 1,
          dueDate: new Date(oldTimes.startTime.getTime() - 60 * 60 * 1000),
        },
        {
          id: BigInt(11),
          uid: 'task_2',
          type: TaskType.ACTIVE,
          templateId: BigInt(101),
          status: TaskStatus.IN_PROGRESS,
          version: 1,
          dueDate: new Date(oldTimes.endTime.getTime() + 60 * 60 * 1000),
        },
        {
          id: BigInt(12),
          uid: 'task_3',
          type: TaskType.CLOSURE,
          templateId: BigInt(102),
          status: TaskStatus.REVIEW,
          version: 2,
          dueDate: new Date(oldTimes.endTime.getTime() + 6 * 60 * 60 * 1000),
        },
        {
          id: BigInt(13),
          uid: 'task_4',
          type: TaskType.OTHER,
          templateId: BigInt(103),
          status: TaskStatus.PENDING,
          version: 1,
          dueDate: new Date(oldTimes.startTime.getTime()),
        },
      ];

      repository.findMany.mockResolvedValue(mockTasks as any);
      repository.updateWithVersionCheck.mockResolvedValue({} as any);

      const count = await service.reconcileTaskDueDates(showId, oldTimes, newTimes);

      expect(count).toBe(4);
      expect(repository.findMany).toHaveBeenCalledWith({
        where: {
          targets: {
            some: {
              showId,
              targetType: 'SHOW',
              deletedAt: null,
            },
          },
          templateId: { not: null },
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CLOSED] },
        },
      });

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { id: BigInt(10), version: 1 },
        { dueDate: new Date(newTimes.startTime.getTime() - 60 * 60 * 1000), version: 2 },
      );
      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { id: BigInt(11), version: 1 },
        { dueDate: new Date(newTimes.endTime.getTime() + 60 * 60 * 1000), version: 2 },
      );
      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { id: BigInt(12), version: 2 },
        { dueDate: new Date(newTimes.endTime.getTime() + 6 * 60 * 60 * 1000), version: 3 },
      );
      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { id: BigInt(13), version: 1 },
        { dueDate: new Date(newTimes.startTime.getTime()), version: 2 },
      );
    });

    it('should ignore terminal tasks (COMPLETED/CLOSED)', async () => {
      repository.findMany.mockResolvedValue([]);
      const count = await service.reconcileTaskDueDates(showId, oldTimes, newTimes);
      expect(count).toBe(0);
      expect(repository.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('should preserve manual due date overrides', async () => {
      const mockTasks = [
        {
          id: BigInt(20),
          uid: 'task_overridden',
          type: TaskType.SETUP,
          templateId: BigInt(100),
          status: TaskStatus.PENDING,
          version: 1,
          dueDate: new Date(oldTimes.startTime.getTime() - 30 * 60 * 1000),
        },
      ];

      repository.findMany.mockResolvedValue(mockTasks as any);
      const count = await service.reconcileTaskDueDates(showId, oldTimes, newTimes);

      expect(count).toBe(0);
      expect(repository.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('should ignore manually created tasks (no templateId)', async () => {
      repository.findMany.mockResolvedValue([]);
      const count = await service.reconcileTaskDueDates(showId, oldTimes, newTimes);
      expect(count).toBe(0);
    });

    it('should skip a task whose version changed concurrently instead of clobbering it', async () => {
      const mockTasks = [
        {
          id: BigInt(30),
          uid: 'task_concurrent',
          type: TaskType.SETUP,
          templateId: BigInt(100),
          status: TaskStatus.PENDING,
          version: 1,
          dueDate: new Date(oldTimes.startTime.getTime() - 60 * 60 * 1000),
        },
      ];

      repository.findMany.mockResolvedValue(mockTasks as any);
      repository.updateWithVersionCheck.mockRejectedValueOnce(
        new VersionConflictError('Task version is outdated', 1, 2),
      );

      const count = await service.reconcileTaskDueDates(showId, oldTimes, newTimes);

      expect(count).toBe(0);
    });
  });
});
