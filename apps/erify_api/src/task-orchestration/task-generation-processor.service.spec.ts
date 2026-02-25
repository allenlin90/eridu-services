import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Show, TaskTemplate, TaskTemplateSnapshot } from '@prisma/client';
import { TaskType } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import { TaskGenerationProcessor } from './task-generation-processor.service';

import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { PrismaService } from '@/prisma/prisma.service';

// File-scope mock transaction client
let mockTransactionClient: any;

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => {
    return await callback(mockTransactionClient);
  }),
  $executeRaw: jest.fn(),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('taskGenerationProcessor', () => {
  let processor: TaskGenerationProcessor;
  let taskService: jest.Mocked<TaskService>;
  let taskTargetService: jest.Mocked<TaskTargetService>;

  beforeEach(async () => {
    mockTransactionClient = {};

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MockPrismaModule,
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
      providers: [
        TaskGenerationProcessor,
        {
          provide: TaskService,
          useValue: {
            findByShowAndTemplate: jest.fn(),
            generateTaskUid: jest.fn(),
            create: jest.fn(),
            resumeTask: jest.fn(),
          },
        },
        {
          provide: TaskTargetService,
          useValue: {
            create: jest.fn(),
            undeleteByTaskId: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<TaskGenerationProcessor>(TaskGenerationProcessor);
    taskService = module.get(TaskService);
    taskTargetService = module.get(TaskTargetService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    // Restore transaction mock implementation after resetAllMocks
    mockPrismaForCls.$transaction.mockImplementation(async (callback: any) => {
      return await callback(mockTransactionClient);
    });
  });

  describe('processShow', () => {
    it('should generate tasks for a show and acquire advisory lock', async () => {
      const startTime = new Date('2026-02-23T10:00:00.000Z');
      const endTime = new Date('2026-02-23T12:00:00.000Z');
      const show = { id: BigInt(10), uid: 'show_1', studioId: BigInt(1), startTime, endTime } as unknown as Show;
      const templates = [
        {
          id: BigInt(1),
          uid: 'tpl_1',
          name: 'Pre-production',
          currentSchema: { metadata: { task_type: TaskType.SETUP } },
          snapshots: [{ id: BigInt(100) }],
        },
      ] as unknown as (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[];

      taskService.findByShowAndTemplate.mockResolvedValue(null);
      taskService.generateTaskUid.mockReturnValue('task_123');
      taskService.create.mockResolvedValue({ id: BigInt(1000), uid: 'task_123' } as any);

      const result = await processor.processShow(show, templates);

      expect(mockPrismaForCls.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SELECT pg_advisory_xact_lock')]),
        BigInt(10),
      );
      expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({
        uid: 'task_123',
        type: TaskType.SETUP,
        dueDate: new Date(startTime.getTime() - 60 * 60 * 1000),
      }));
      expect(taskTargetService.create).toHaveBeenCalled();
      expect(result.status).toBe('success');
      expect(result.tasks_created).toBe(1);
    });

    it('should skip template if task already exists', async () => {
      const show = {
        id: BigInt(10),
        uid: 'show_1',
        startTime: new Date('2026-02-23T10:00:00.000Z'),
        endTime: new Date('2026-02-23T12:00:00.000Z'),
      } as unknown as Show;
      const templates = [{ id: BigInt(1), uid: 'tpl_1', currentSchema: { metadata: { task_type: TaskType.SETUP } } }] as unknown as (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[];

      taskService.findByShowAndTemplate.mockResolvedValue({ id: BigInt(1000) } as any);

      const result = await processor.processShow(show, templates);

      expect(taskService.create).not.toHaveBeenCalled();
      expect(result.status).toBe('skipped');
      expect(result.tasks_skipped).toBe(1);
    });

    it('should resume soft-deleted task with latest type and snapshot', async () => {
      const show = {
        id: BigInt(10),
        uid: 'show_1',
        studioId: BigInt(1),
        startTime: new Date('2026-02-23T10:00:00.000Z'),
        endTime: new Date('2026-02-23T12:00:00.000Z'),
      } as unknown as Show;
      const templates = [
        {
          id: BigInt(1),
          uid: 'tpl_1',
          name: 'Live Ops',
          currentSchema: { metadata: { task_type: TaskType.ACTIVE } },
          snapshots: [{ id: BigInt(200) }],
        },
      ] as unknown as (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[];

      taskService.findByShowAndTemplate.mockResolvedValue({
        id: BigInt(1000),
        deletedAt: new Date('2026-02-01T00:00:00.000Z'),
        version: 3,
      } as any);

      const result = await processor.processShow(show, templates);

      expect(taskService.resumeTask).toHaveBeenCalledWith(
        BigInt(1000),
        expect.objectContaining({
          snapshotId: BigInt(200),
          status: 'PENDING',
          type: TaskType.ACTIVE,
          version: 4,
          dueDate: new Date('2026-02-23T13:00:00.000Z'), // ACTIVE: endTime + 1h
        }),
      );
      expect(taskTargetService.undeleteByTaskId).toHaveBeenCalledWith(BigInt(1000));
      expect(taskService.create).not.toHaveBeenCalled();
      expect(result.status).toBe('success');
      expect(result.tasks_created).toBe(1);
      expect(result.tasks_skipped).toBe(0);
    });

    it('should bubble up errors from database', async () => {
      const show = {
        id: BigInt(10),
        uid: 'show_1',
        startTime: new Date('2026-02-23T10:00:00.000Z'),
        endTime: new Date('2026-02-23T12:00:00.000Z'),
      } as unknown as Show;
      const templates = [{ id: BigInt(1), uid: 'tpl_1', currentSchema: { metadata: { task_type: TaskType.SETUP } } }] as unknown as (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[];

      mockPrismaForCls.$executeRaw.mockRejectedValue(new Error('DB Error'));

      await expect(processor.processShow(show, templates)).rejects.toThrow('DB Error');
    });

    it('should skip templates with no snapshots', async () => {
      const show = {
        id: BigInt(10),
        uid: 'show_1',
        startTime: new Date('2026-02-23T10:00:00.000Z'),
        endTime: new Date('2026-02-23T12:00:00.000Z'),
      } as unknown as Show;
      const templates = [{ id: BigInt(1), uid: 'tpl_1', name: 'Test', currentSchema: { metadata: { task_type: TaskType.SETUP } }, snapshots: [] }] as unknown as (TaskTemplate & { snapshots: TaskTemplateSnapshot[] })[];

      taskService.findByShowAndTemplate.mockResolvedValue(null);

      const result = await processor.processShow(show, templates);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe('skipped');
      expect(taskService.create).not.toHaveBeenCalled();
      expect(result.tasks_skipped).toBe(1);
    });
  });
});
