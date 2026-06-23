import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { TaskType } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import { ShowStateGateService } from './show-state-gate.service';

import { AuditService } from '@/models/audit/audit.service';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { TaskRepository } from '@/models/task/task.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('showStateGateService.openGate', () => {
  let service: ShowStateGateService;
  let taskService: jest.Mocked<TaskService>;
  let showRepository: jest.Mocked<ShowRepository>;
  let showStatusService: jest.Mocked<ShowStatusService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      providers: [
        ShowStateGateService,
        {
          provide: TaskService,
          useValue: { generateTaskUid: jest.fn(), create: jest.fn() },
        },
        {
          provide: TaskRepository,
          useValue: { findByUid: jest.fn(), updateWithVersionCheck: jest.fn() },
        },
        {
          provide: TaskTargetService,
          useValue: { countActiveByShowId: jest.fn() },
        },
        {
          provide: ShowRepository,
          useValue: { update: jest.fn(), findByUid: jest.fn() },
        },
        {
          provide: ShowStatusService,
          useValue: { getShowStatusBySystemKey: jest.fn() },
        },
        { provide: AuditService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskService = module.get(TaskService);
    showRepository = module.get(ShowRepository);
    showStatusService = module.get(ShowStatusService);
    auditService = module.get(AuditService);
  });

  const owner = { id: 7n, uid: 'user_owner' };

  it('creates a STATE_GATE task targeting the show, moves Show.status, and writes opened history + Audit', async () => {
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({
      id: 99n,
      uid: 'shst_pending',
      systemKey: 'CANCELLED_PENDING_RESOLUTION',
    } as any);
    taskService.generateTaskUid.mockReturnValue('task_abc123');
    taskService.create.mockResolvedValue({ id: 1n, uid: 'task_abc123' } as any);

    const result = await service.openGate(55n, 'show_cancellation', {
      owner,
      fromStatusSystemKey: 'LIVE',
      dueDate: null,
      content: {
        reason_category: 'ROOM_UNAVAILABLE',
        reason_note: 'Flooding in studio B',
      },
    });

    expect(showRepository.update).toHaveBeenCalledWith(
      { id: 55n },
      { showStatus: { connect: { id: 99n } } },
    );
    expect(taskService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'task_abc123',
        type: TaskType.STATE_GATE,
        assigneeId: 7n,
        content: expect.objectContaining({
          reason_category: 'ROOM_UNAVAILABLE',
          reason_note: 'Flooding in studio B',
          history: [
            expect.objectContaining({
              event: 'opened',
              actor_id: 'user_owner',
              note: 'Flooding in studio B',
            }),
          ],
        }),
        metadata: expect.objectContaining({
          gate_kind: 'show_cancellation',
          from_status: 'LIVE',
          pending_status: 'CANCELLED_PENDING_RESOLUTION',
        }),
        targets: { create: [{ targetType: 'SHOW', targetId: 55n, showId: 55n }] },
      }),
    );
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OVERRIDE',
        actorId: 7n,
        metadata: expect.objectContaining({
          field: 'show_status',
          old_value: 'LIVE',
          new_value: 'CANCELLED_PENDING_RESOLUTION',
          gate_task_uid: 'task_abc123',
        }),
        targets: [{ targetType: 'SHOW', targetId: 55n }],
      }),
    );
    expect(result.uid).toBe('task_abc123');
  });

  it('throws GATE_OWNER_REQUIRED when the gate kind requires an owner and none is given', async () => {
    await expect(
      service.openGate(55n, 'show_cancellation', {
        owner: null,
        fromStatusSystemKey: 'LIVE',
        content: { reason_category: 'OTHER' },
      }),
    ).rejects.toThrow('GATE_OWNER_REQUIRED:show_cancellation');

    expect(showRepository.update).not.toHaveBeenCalled();
  });

  it('allows a null owner for schedule_publish_removal', async () => {
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({ id: 99n } as any);
    taskService.generateTaskUid.mockReturnValue('task_def456');
    taskService.create.mockResolvedValue({ id: 2n, uid: 'task_def456' } as any);

    await service.openGate(55n, 'schedule_publish_removal', {
      owner: null,
      fromStatusSystemKey: 'CONFIRMED',
      content: {
        reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
        reason_note: 'Removed from republished schedule; 2 active task(s) still attached',
      },
    });

    expect(taskService.create).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: null }),
    );
  });

  it('throws SHOW_STATUS_NOT_CONFIGURED when the pending status lookup returns null', async () => {
    showStatusService.getShowStatusBySystemKey.mockResolvedValue(null);

    await expect(
      service.openGate(55n, 'show_cancellation', {
        owner,
        fromStatusSystemKey: 'LIVE',
        content: { reason_category: 'OTHER' },
      }),
    ).rejects.toThrow('SHOW_STATUS_NOT_CONFIGURED:CANCELLED_PENDING_RESOLUTION');
  });
});

describe('showStateGateService.claimGate', () => {
  let service: ShowStateGateService;
  let taskRepository: jest.Mocked<TaskRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      providers: [
        ShowStateGateService,
        {
          provide: TaskService,
          useValue: { generateTaskUid: jest.fn(), create: jest.fn() },
        },
        {
          provide: TaskRepository,
          useValue: { findByUid: jest.fn(), updateWithVersionCheck: jest.fn() },
        },
        {
          provide: TaskTargetService,
          useValue: { countActiveByShowId: jest.fn() },
        },
        {
          provide: ShowRepository,
          useValue: { update: jest.fn(), findByUid: jest.fn() },
        },
        {
          provide: ShowStatusService,
          useValue: { getShowStatusBySystemKey: jest.fn() },
        },
        { provide: AuditService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskRepository = module.get(TaskRepository);
  });

  const claimant = { id: 9n, uid: 'user_claimant' };

  it('sets assigneeId and appends a claimed history entry when the gate is unowned', async () => {
    taskRepository.findByUid.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      version: 1,
      assigneeId: null,
      content: {
        history: [
          { event: 'opened', actor_id: null, at: '2026-06-23T00:00:00.000Z' },
        ],
      },
    } as any);
    taskRepository.updateWithVersionCheck.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      assigneeId: 9n,
    } as any);

    await service.claimGate('task_xyz', claimant);

    expect(taskRepository.updateWithVersionCheck).toHaveBeenCalledWith(
      { uid: 'task_xyz', version: 1 },
      expect.objectContaining({
        assignee: { connect: { id: 9n } },
        version: { increment: 1 },
        content: expect.objectContaining({
          history: [
            expect.objectContaining({ event: 'opened' }),
            expect.objectContaining({
              event: 'claimed',
              actor_id: 'user_claimant',
            }),
          ],
        }),
      }),
    );
  });

  it('throws GATE_ALREADY_CLAIMED when the gate already has an owner', async () => {
    taskRepository.findByUid.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      version: 1,
      assigneeId: 5n,
      content: { history: [] },
    } as any);

    await expect(service.claimGate('task_xyz', claimant)).rejects.toThrow(
      'GATE_ALREADY_CLAIMED:task_xyz',
    );
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the task does not exist', async () => {
    taskRepository.findByUid.mockResolvedValue(null);

    await expect(service.claimGate('task_missing', claimant)).rejects.toThrow();
  });
});
