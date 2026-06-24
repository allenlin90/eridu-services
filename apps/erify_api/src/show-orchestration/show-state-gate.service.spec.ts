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
import { StudioService } from '@/models/studio/studio.service';
import { TaskRepository } from '@/models/task/task.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { UserService } from '@/models/user/user.service';
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
          useValue: {
            generateTaskUid: jest.fn(),
            create: jest.fn(),
            findOpenStateGateForShow: jest.fn(),
          },
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
        { provide: StudioService, useValue: { findByUid: jest.fn() } },
        { provide: UserService, useValue: { getUserByExtId: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskService = module.get(TaskService);
    showRepository = module.get(ShowRepository);
    showStatusService = module.get(ShowStatusService);
    auditService = module.get(AuditService);

    taskService.findOpenStateGateForShow.mockResolvedValue(null);
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

  it('throws GATE_ALREADY_OPEN when the show already has an open gate task', async () => {
    taskService.findOpenStateGateForShow.mockResolvedValue({ uid: 'task_existing' } as any);

    await expect(
      service.openGate(55n, 'show_cancellation', {
        owner,
        fromStatusSystemKey: 'LIVE',
        content: { reason_category: 'OTHER' },
      }),
    ).rejects.toThrow('GATE_ALREADY_OPEN:task_existing');
    expect(showRepository.update).not.toHaveBeenCalled();
    expect(taskService.create).not.toHaveBeenCalled();
  });
});

describe('showStateGateService.claimGate', () => {
  let service: ShowStateGateService;
  let taskRepository: jest.Mocked<TaskRepository>;
  let studioService: jest.Mocked<StudioService>;
  let userService: jest.Mocked<UserService>;

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
        { provide: StudioService, useValue: { findByUid: jest.fn() } },
        { provide: UserService, useValue: { getUserByExtId: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskRepository = module.get(TaskRepository);
    studioService = module.get(StudioService);
    userService = module.get(UserService);

    studioService.findByUid.mockResolvedValue({ id: 1n } as any);
    userService.getUserByExtId.mockResolvedValue({ id: 9n, uid: 'user_claimant' } as any);
  });

  it('sets assigneeId and appends a claimed history entry when the gate is unowned', async () => {
    taskRepository.findByUid.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      studioId: 1n,
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

    await service.claimGate('studio_1', 'task_xyz', 'ext_claimant_1');

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

  it('throws forbidden when the task does not belong to the studio', async () => {
    taskRepository.findByUid.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      studioId: 2n,
      version: 1,
      assigneeId: null,
      content: { history: [] },
    } as any);

    await expect(service.claimGate('studio_1', 'task_xyz', 'ext_claimant_1')).rejects.toThrow(
      'Task does not belong to this studio',
    );
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });

  it('throws GATE_ALREADY_CLAIMED when the gate already has an owner', async () => {
    taskRepository.findByUid.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      studioId: 1n,
      version: 1,
      assigneeId: 5n,
      content: { history: [] },
    } as any);

    await expect(service.claimGate('studio_1', 'task_xyz', 'ext_claimant_1')).rejects.toThrow(
      'GATE_ALREADY_CLAIMED:task_xyz',
    );
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });

  it('throws ACTOR_NOT_FOUND when the claimant cannot be resolved', async () => {
    taskRepository.findByUid.mockResolvedValue({
      id: 3n,
      uid: 'task_xyz',
      studioId: 1n,
      version: 1,
      assigneeId: null,
      content: { history: [] },
    } as any);
    userService.getUserByExtId.mockResolvedValue(null);

    await expect(service.claimGate('studio_1', 'task_xyz', 'ext_unresolvable')).rejects.toThrow(
      'ACTOR_NOT_FOUND',
    );
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the task does not exist', async () => {
    taskRepository.findByUid.mockResolvedValue(null);

    await expect(service.claimGate('studio_1', 'task_missing', 'ext_claimant_1')).rejects.toThrow();
  });
});

describe('showStateGateService.resolveGate', () => {
  let service: ShowStateGateService;
  let taskRepository: jest.Mocked<TaskRepository>;
  let taskTargetService: jest.Mocked<TaskTargetService>;
  let showRepository: jest.Mocked<ShowRepository>;
  let showStatusService: jest.Mocked<ShowStatusService>;
  let auditService: jest.Mocked<AuditService>;

  const actor = { id: 11n, uid: 'user_resolver' };
  const baseTask = {
    id: 4n,
    uid: 'task_gate1',
    version: 2,
    assigneeId: 11n,
    metadata: {
      gate_kind: 'show_cancellation',
      from_status: 'CONFIRMED',
      pending_status: 'CANCELLED_PENDING_RESOLUTION',
    },
    content: {
      history: [
        { event: 'opened', actor_id: 'user_owner', at: '2026-06-23T00:00:00.000Z' },
      ],
    },
  };
  const showTarget = {
    id: 1n,
    taskId: 4n,
    targetType: 'SHOW',
    targetId: 200n,
    showId: 200n,
  };
  const pendingShow = {
    id: 200n,
    showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
  };

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
          useValue: { findByTaskId: jest.fn(), countActiveByShowId: jest.fn() },
        },
        {
          provide: ShowRepository,
          useValue: { update: jest.fn(), findById: jest.fn(), findByUid: jest.fn() },
        },
        {
          provide: ShowStatusService,
          useValue: { getShowStatusBySystemKey: jest.fn() },
        },
        { provide: AuditService, useValue: { create: jest.fn() } },
        { provide: StudioService, useValue: { findByUid: jest.fn() } },
        { provide: UserService, useValue: { getUserByExtId: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShowStateGateService);
    taskRepository = module.get(TaskRepository);
    taskTargetService = module.get(TaskTargetService);
    showRepository = module.get(ShowRepository);
    showStatusService = module.get(ShowStatusService);
    auditService = module.get(AuditService);

    taskRepository.findByUid.mockResolvedValue(baseTask as any);
    taskTargetService.findByTaskId.mockResolvedValue([showTarget] as any);
    showRepository.findById.mockResolvedValue(pendingShow as any);
    taskTargetService.countActiveByShowId.mockResolvedValue(0);
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({
      id: 50n,
      systemKey: 'CANCELLED',
    } as any);
    taskRepository.updateWithVersionCheck.mockResolvedValue({
      ...baseTask,
      status: 'COMPLETED',
    } as any);
  });

  it('resolves to a concrete outcome: updates Show.status, completes the Task, appends resolved history, writes Audit', async () => {
    await service.resolveGate('task_gate1', 'CANCELLED', 'Confirmed cancellation', actor);

    expect(taskTargetService.countActiveByShowId).toHaveBeenCalledWith(200n, {
      excludeTaskId: 4n,
    });
    expect(showRepository.update).toHaveBeenCalledWith(
      { id: 200n },
      { showStatus: { connect: { id: 50n } } },
    );
    expect(taskRepository.updateWithVersionCheck).toHaveBeenCalledWith(
      { uid: 'task_gate1', version: 2 },
      expect.objectContaining({
        status: 'COMPLETED',
        version: { increment: 1 },
        content: expect.objectContaining({
          resolution_notes: 'Confirmed cancellation',
          history: [
            expect.objectContaining({ event: 'opened' }),
            expect.objectContaining({
              event: 'resolved',
              actor_id: 'user_resolver',
              note: 'Confirmed cancellation',
            }),
          ],
        }),
      }),
    );
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OVERRIDE',
        actorId: 11n,
        reason: 'Confirmed cancellation',
        metadata: expect.objectContaining({
          field: 'show_status',
          old_value: 'CANCELLED_PENDING_RESOLUTION',
          new_value: 'CANCELLED',
          gate_task_uid: 'task_gate1',
          gate_kind: 'show_cancellation',
        }),
        targets: [{ targetType: 'SHOW', targetId: 200n }],
      }),
    );
  });

  it('resolves RESTORE_PREVIOUS by reverting Show.status to metadata.from_status', async () => {
    taskRepository.findByUid.mockResolvedValue({
      ...baseTask,
      metadata: {
        ...baseTask.metadata,
        gate_kind: 'schedule_publish_removal',
      },
    } as any);
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({
      id: 60n,
      systemKey: 'CONFIRMED',
    } as any);

    await service.resolveGate(
      'task_gate1',
      'RESTORE_PREVIOUS',
      'Schedule sync was wrong',
      actor,
    );

    expect(showStatusService.getShowStatusBySystemKey).toHaveBeenCalledWith(
      'CONFIRMED',
    );
    expect(showRepository.update).toHaveBeenCalledWith(
      { id: 200n },
      { showStatus: { connect: { id: 60n } } },
    );
  });

  it('throws GATE_STATE_STALE when Show.status no longer matches the gate pendingStatus', async () => {
    showRepository.findById.mockResolvedValue({
      id: 200n,
      showStatus: { systemKey: 'CANCELLED' },
    } as any);

    await expect(
      service.resolveGate('task_gate1', 'CANCELLED', 'note', actor),
    ).rejects.toThrow('GATE_STATE_STALE:task_gate1');
    expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
  });

  it('throws GATE_NOT_CLAIMED when the task has no assignee', async () => {
    taskRepository.findByUid.mockResolvedValue({
      ...baseTask,
      assigneeId: null,
    } as any);

    await expect(
      service.resolveGate('task_gate1', 'CANCELLED', 'note', actor),
    ).rejects.toThrow('GATE_NOT_CLAIMED:task_gate1');
  });

  it('throws GATE_OUTCOME_NOT_ALLOWED for an outcome not in allowedOutcomes', async () => {
    await expect(
      service.resolveGate('task_gate1', 'BOGUS' as any, 'note', actor),
    ).rejects.toThrow('GATE_OUTCOME_NOT_ALLOWED:BOGUS');
  });

  it('throws ACTIVE_TASKS_REMAIN with the count when CANCELLED is requested while active tasks exist', async () => {
    taskTargetService.countActiveByShowId.mockResolvedValue(3);

    await expect(
      service.resolveGate('task_gate1', 'CANCELLED', 'note', actor),
    ).rejects.toThrow('ACTIVE_TASKS_REMAIN:task_gate1');
  });

  it('throws LIVE_CANCELLATION_REQUIRES_OVERRIDE when from_status is LIVE and outcome is CANCELLED', async () => {
    taskRepository.findByUid.mockResolvedValue({
      ...baseTask,
      metadata: { ...baseTask.metadata, from_status: 'LIVE' },
    } as any);

    await expect(
      service.resolveGate('task_gate1', 'CANCELLED', 'note', actor),
    ).rejects.toThrow('LIVE_CANCELLATION_REQUIRES_OVERRIDE:task_gate1');
  });

  it('does NOT apply the LIVE safeguard to COMPLETED', async () => {
    taskRepository.findByUid.mockResolvedValue({
      ...baseTask,
      metadata: { ...baseTask.metadata, from_status: 'LIVE' },
    } as any);
    showStatusService.getShowStatusBySystemKey.mockResolvedValue({
      id: 70n,
      systemKey: 'COMPLETED',
    } as any);

    await service.resolveGate('task_gate1', 'COMPLETED', 'Show partially ran', actor);

    expect(showRepository.update).toHaveBeenCalledWith(
      { id: 200n },
      { showStatus: { connect: { id: 70n } } },
    );
  });
});
