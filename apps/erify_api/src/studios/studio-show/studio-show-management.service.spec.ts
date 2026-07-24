import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import { StudioShowManagementService } from './studio-show-management.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { AuditService } from '@/models/audit/audit.service';
import { PlatformService } from '@/models/platform/platform.service';
import { PublishRunService } from '@/models/publish-run/publish-run.service';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleConflictService } from '@/models/schedule-conflict/schedule-conflict.service';
import type { UpdateStudioShowDto } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

let mockTx: {
  creator: { findFirst: jest.Mock };
  showCreator: { findFirst: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  platform: { findFirst: jest.Mock };
  showPlatform: { findFirst: jest.Mock; update: jest.Mock };
};

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback(mockTx)),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('studioShowManagementService', () => {
  let service: StudioShowManagementService;

  const studioServiceMock = {
    getStudioById: jest.fn(),
  };
  const studioRoomServiceMock = {
    findOne: jest.fn(),
  };
  const scheduleServiceMock = {
    getScheduleById: jest.fn(),
  };
  const showServiceMock = {
    createShow: jest.fn(),
    getShowById: jest.fn(),
    ensureValidActualTimeRange: jest.fn(
      (
        currentActualStart: Date | null | undefined,
        currentActualEnd: Date | null | undefined,
        dto: { actualStartTime?: Date | null; actualEndTime?: Date | null },
      ) => {
        const nextStart = dto.actualStartTime !== undefined
          ? dto.actualStartTime
          : currentActualStart ?? null;
        const nextEnd = dto.actualEndTime !== undefined
          ? dto.actualEndTime
          : currentActualEnd ?? null;
        if (nextStart && nextEnd && nextEnd <= nextStart) {
          throw HttpError.badRequest('Actual end time must be after actual start time');
        }
      },
    ),
  };
  const showRepositoryMock = {
    findByClientUidAndExternalId: jest.fn(),
    findByUidAndStudioUid: jest.fn(),
    update: jest.fn(),
  };
  const platformServiceMock = {
    findActiveByUids: jest.fn(),
  };
  const showPlatformRepositoryMock = {
    findMany: jest.fn(),
    createAssignment: jest.fn(),
    createManyAssignments: jest.fn(),
    restoreAndUpdateAssignment: jest.fn(),
    softDelete: jest.fn(),
    softDeleteByPlatformIds: jest.fn(),
    findByUid: jest.fn(),
    update: jest.fn(),
    updateCorrectedPerformanceMetrics: jest.fn(),
  };
  const showPlatformServiceMock = {
    generateShowPlatformUid: jest.fn(),
  };
  const showOrchestrationServiceMock = {
    deleteShow: jest.fn(),
  };
  const userServiceMock = {
    getUserByExtId: jest.fn(),
  };
  const showCancellationGateServiceMock = {
    resolveActorTier: jest.fn(),
    isActiveDutyManager: jest.fn(),
    openPending: jest.fn(),
    resolveAtomic: jest.fn(),
    resolvePending: jest.fn(),
    getCancellationStatus: jest.fn(),
  };
  const showStatusServiceMock = {
    getShowStatusById: jest.fn(),
  };
  const taskServiceMock = {
    reconcileTaskDueDates: jest.fn().mockResolvedValue(0),
  };
  const auditServiceMock = {
    create: jest.fn(),
    findSchedulePublishImpactsForStudio: jest.fn(),
    findPendingStaleConflictsForStudio: jest.fn(),
    findResolvedStaleConflictsForStudio: jest.fn(),
    countSchedulePublishImpactsForStudio: jest.fn(),
    countPendingStaleConflictsForStudio: jest.fn(),
    countResolvedStaleConflictsForStudio: jest.fn(),
    countForTargets: jest.fn(),
    findForTargets: jest.fn(),
    findLatestScheduleConflictForShow: jest.fn(),
  };
  const scheduleConflictServiceMock = {
    checkEligibility: jest.fn(),
    applyConflict: jest.fn(),
    dismissConflict: jest.fn(),
  };
  const taskTargetServiceMock = {
    countActiveByShowId: jest.fn().mockResolvedValue(0),
  };
  const publishRunServiceMock = {
    getPublishRunByUid: jest.fn(),
    getPublishRunsForStudio: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
  const actorExtId = 'ext_actor1';

  beforeEach(async () => {
    mockTx = {
      creator: { findFirst: jest.fn() },
      showCreator: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      platform: { findFirst: jest.fn() },
      showPlatform: { findFirst: jest.fn(), update: jest.fn() },
    };

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
        StudioShowManagementService,
        { provide: StudioService, useValue: studioServiceMock },
        { provide: StudioRoomService, useValue: studioRoomServiceMock },
        { provide: ScheduleService, useValue: scheduleServiceMock },
        { provide: ShowService, useValue: showServiceMock },
        { provide: ShowRepository, useValue: showRepositoryMock },
        { provide: PlatformService, useValue: platformServiceMock },
        { provide: ShowPlatformRepository, useValue: showPlatformRepositoryMock },
        { provide: ShowPlatformService, useValue: showPlatformServiceMock },
        { provide: ShowOrchestrationService, useValue: showOrchestrationServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ShowCancellationGateService, useValue: showCancellationGateServiceMock },
        { provide: ShowStatusService, useValue: showStatusServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: ScheduleConflictService, useValue: scheduleConflictServiceMock },
        { provide: TaskTargetService, useValue: taskTargetServiceMock },
        { provide: PublishRunService, useValue: publishRunServiceMock },
      ],
    }).compile();

    service = module.get(StudioShowManagementService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    studioServiceMock.getStudioById.mockResolvedValue({ id: BigInt(10), uid: 'std_123' });
    studioRoomServiceMock.findOne.mockResolvedValue({ id: BigInt(20), uid: 'srm_1' });
    scheduleServiceMock.getScheduleById.mockResolvedValue({
      id: BigInt(40),
      uid: 'sch_1',
      studioId: BigInt(10),
      status: 'draft',
      client: { uid: 'cli_1' },
    });
    showPlatformRepositoryMock.findMany.mockResolvedValue([]);
    platformServiceMock.findActiveByUids.mockResolvedValue([
      { id: BigInt(30), uid: 'plt_1' },
    ]);
    showPlatformServiceMock.generateShowPlatformUid.mockReturnValue('shp_1');
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      client: { uid: 'cli_1' },
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
    });
  });

  it('creates a new show and syncs platform memberships', async () => {
    showRepositoryMock.findByClientUidAndExternalId.mockResolvedValue(null);
    showServiceMock.createShow.mockResolvedValue({ id: BigInt(100), uid: 'show_123' });

    await service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      scheduleId: 'sch_1',
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: 'srm_1',
      name: 'Studio Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: {},
      platformIds: ['plt_1'],
    });

    expect(showServiceMock.createShow).toHaveBeenCalled();
    expect(showServiceMock.createShow).toHaveBeenCalledWith(expect.objectContaining({
      Schedule: { connect: { uid: 'sch_1' } },
    }));
    expect(showPlatformRepositoryMock.createManyAssignments).toHaveBeenCalledWith([
      expect.objectContaining({
        uid: 'shp_1',
        showId: BigInt(100),
        platformId: BigInt(30),
      }),
    ]);
  });

  it('restores a soft-deleted show when external_id matches', async () => {
    showRepositoryMock.findByClientUidAndExternalId.mockResolvedValue({
      id: BigInt(55),
      uid: 'show_deleted',
      studioId: BigInt(10),
      deletedAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    showRepositoryMock.update.mockResolvedValue({ id: BigInt(55), uid: 'show_deleted' });

    await service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      scheduleId: null,
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: null,
      name: 'Restored Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: {},
      platformIds: [],
    });

    expect(showRepositoryMock.update).toHaveBeenCalledWith(
      { id: BigInt(55) },
      expect.objectContaining({
        deletedAt: null,
        externalId: 'ext_1',
        Schedule: { disconnect: true },
      }),
    );
  });

  it('rejects create when restore would move a deleted show across studios', async () => {
    showRepositoryMock.findByClientUidAndExternalId.mockResolvedValue({
      id: BigInt(55),
      uid: 'show_deleted_other_studio',
      studioId: BigInt(999),
      deletedAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    await expect(service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      scheduleId: null,
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: null,
      name: 'Studio Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: {},
      platformIds: [],
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 409,
        message: 'SHOW_RESTORE_CONFLICT',
      }),
    });
    expect(showRepositoryMock.update).not.toHaveBeenCalled();
    expect(showServiceMock.createShow).not.toHaveBeenCalled();
  });

  it('rejects create when schedule belongs to a different studio', async () => {
    scheduleServiceMock.getScheduleById.mockResolvedValue({
      id: BigInt(99),
      uid: 'sch_other',
      studioId: BigInt(999),
      status: 'draft',
      client: { uid: 'cli_1' },
    });

    await expect(service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      scheduleId: 'sch_other',
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: 'srm_1',
      name: 'Studio Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: {},
      platformIds: [],
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Schedule sch_other does not belong to studio std_123',
      }),
    });
  });

  it('rejects create when schedule belongs to a different client', async () => {
    scheduleServiceMock.getScheduleById.mockResolvedValue({
      id: BigInt(40),
      uid: 'sch_1',
      studioId: BigInt(10),
      status: 'draft',
      client: { uid: 'cli_other' },
    });

    await expect(service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      scheduleId: 'sch_1',
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: 'srm_1',
      name: 'Studio Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: {},
      platformIds: [],
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Schedule sch_1 does not belong to client cli_1',
      }),
    });
  });

  it('allows create when target schedule is already published', async () => {
    scheduleServiceMock.getScheduleById.mockResolvedValue({
      id: BigInt(40),
      uid: 'sch_1',
      studioId: BigInt(10),
      status: 'published',
      client: { uid: 'cli_1' },
    });
    showRepositoryMock.findByClientUidAndExternalId.mockResolvedValue(null);
    showServiceMock.createShow.mockResolvedValue({ id: BigInt(100), uid: 'show_123' });

    await service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      scheduleId: 'sch_1',
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: 'srm_1',
      name: 'Studio Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: {},
      platformIds: [],
    });

    expect(showServiceMock.createShow).toHaveBeenCalledWith(expect.objectContaining({
      Schedule: { connect: { uid: 'sch_1' } },
    }));
  });

  it('rejects create when a show with the same external_id already exists and is not deleted', async () => {
    showRepositoryMock.findByClientUidAndExternalId.mockResolvedValue({
      id: BigInt(55),
      uid: 'show_existing',
      studioId: BigInt(10),
      deletedAt: null,
    });

    await expect(service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      scheduleId: null,
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: null,
      name: 'Studio Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: {},
      platformIds: [],
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 409,
      }),
    });
    expect(showServiceMock.createShow).not.toHaveBeenCalled();
    expect(showRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('rejects update when a partial time change would invert the range', async () => {
    await expect(service.updateShow('std_123', 'show_123', {
      startTime: new Date('2026-04-02T13:00:00.000Z'),
    } as UpdateStudioShowDto)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'End time must be after start time',
      }),
    });
  });

  it('rejects update when a one-sided actual change inverts the stored actual range', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      client: { uid: 'cli_1' },
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      actualStartTime: new Date('2026-04-02T10:30:00.000Z'),
      actualEndTime: null,
    });

    await expect(service.updateShow('std_123', 'show_123', {
      actualEndTime: new Date('2026-04-02T10:00:00.000Z'),
    } as UpdateStudioShowDto)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Actual end time must be after actual start time',
      }),
    });
  });

  it('allows one-sided actual update when the other side is still missing', async () => {
    await service.updateShow('std_123', 'show_123', {
      actualStartTime: new Date('2026-04-02T10:05:00.000Z'),
    } as UpdateStudioShowDto);

    expect(showRepositoryMock.update).toHaveBeenCalledWith(
      { uid: 'show_123' },
      expect.objectContaining({
        actualStartTime: new Date('2026-04-02T10:05:00.000Z'),
      }),
    );
  });

  it('allows update when target schedule is already published', async () => {
    scheduleServiceMock.getScheduleById.mockResolvedValue({
      id: BigInt(40),
      uid: 'sch_1',
      studioId: BigInt(10),
      status: 'published',
      client: { uid: 'cli_1' },
    });

    await service.updateShow('std_123', 'show_123', {
      scheduleId: 'sch_1',
    } as UpdateStudioShowDto);

    expect(showRepositoryMock.update).toHaveBeenCalledWith(
      { uid: 'show_123' },
      expect.objectContaining({
        Schedule: { connect: { uid: 'sch_1' } },
      }),
    );
  });

  it('rejects update when clientId changes and existing schedule belongs to the old client', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      client: { uid: 'cli_1' },
      Schedule: { uid: 'sch_1' },
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
    });
    // schedule belongs to cli_1, but the update is moving the show to cli_other
    scheduleServiceMock.getScheduleById.mockResolvedValue({
      id: BigInt(40),
      uid: 'sch_1',
      studioId: BigInt(10),
      status: 'draft',
      client: { uid: 'cli_1' },
    });

    await expect(service.updateShow('std_123', 'show_123', {
      clientId: 'cli_other',
    } as UpdateStudioShowDto)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Schedule sch_1 does not belong to client cli_other',
      }),
    });
  });

  it('allows update when clientId changes and show has no existing schedule', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      client: { uid: 'cli_1' },
      Schedule: null,
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
    });

    await service.updateShow('std_123', 'show_123', {
      clientId: 'cli_other',
    } as UpdateStudioShowDto);

    expect(scheduleServiceMock.getScheduleById).not.toHaveBeenCalled();
    expect(showRepositoryMock.update).toHaveBeenCalled();
  });

  it('rejects update when target schedule belongs to a different client', async () => {
    scheduleServiceMock.getScheduleById.mockResolvedValue({
      id: BigInt(40),
      uid: 'sch_1',
      studioId: BigInt(10),
      status: 'draft',
      client: { uid: 'cli_other' },
    });

    await expect(service.updateShow('std_123', 'show_123', {
      scheduleId: 'sch_1',
    } as UpdateStudioShowDto)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Schedule sch_1 does not belong to client cli_1',
      }),
    });
  });

  it('rejects updateShow when changing show_status_id while a cancellation gate is pending', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: { uid: 'shst_pending', name: 'cancelled_pending_resolution', systemKey: 'CANCELLED_PENDING_RESOLUTION' },
    });

    await expect(
      service.updateShow('std_123', 'show_123', { showStatusId: 'shst_cancelled' } as UpdateStudioShowDto),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'SHOW_STATUS_LOCKED_BY_PENDING_CANCELLATION' }),
    });
    expect(showRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('rejects updateShow when changing show_status_id from cancelled', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: {
        uid: 'shst_cancelled',
        name: 'cancelled',
        systemKey: 'CANCELLED',
      },
    });
    showStatusServiceMock.getShowStatusById.mockResolvedValue({
      uid: 'shst_draft',
      systemKey: 'DRAFT',
    });

    await expect(
      service.updateShow('std_123', 'show_123', {
        showStatusId: 'shst_draft',
      } as UpdateStudioShowDto),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'SHOW_STATUS_LOCKED_BY_CANCELLATION_GATE',
      }),
    });
    expect(showRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('allows updateShow to change show_status_id when no gate is pending and the target is not a gate-owned status', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    });
    showStatusServiceMock.getShowStatusById.mockResolvedValue({ uid: 'shst_live', systemKey: 'LIVE' });
    showRepositoryMock.update.mockResolvedValue({ uid: 'show_123' });
    showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });

    await service.updateShow('std_123', 'show_123', { showStatusId: 'shst_live' } as UpdateStudioShowDto);

    expect(showStatusServiceMock.getShowStatusById).toHaveBeenCalledWith('shst_live');
    expect(showRepositoryMock.update).toHaveBeenCalled();
  });

  it('rejects updateShow when the target show_status_id is CANCELLED, even from a non-pending current status', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    });
    showStatusServiceMock.getShowStatusById.mockResolvedValue({ uid: 'shst_cancelled', systemKey: 'CANCELLED' });

    await expect(
      service.updateShow('std_123', 'show_123', { showStatusId: 'shst_cancelled' } as UpdateStudioShowDto),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'SHOW_STATUS_CANCELLATION_REQUIRES_GATE' }),
    });
    expect(showRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('rejects updateShow when the target show_status_id is the pending-resolution status, even from a non-pending current status', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    });
    showStatusServiceMock.getShowStatusById.mockResolvedValue({
      uid: 'shst_pending',
      systemKey: 'CANCELLED_PENDING_RESOLUTION',
    });

    await expect(
      service.updateShow('std_123', 'show_123', { showStatusId: 'shst_pending' } as UpdateStudioShowDto),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'SHOW_STATUS_PENDING_RESOLUTION_REQUIRES_GATE' }),
    });
    expect(showRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('rejects delete after the show start time', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2020-01-01T00:00:00.000Z'),
      endTime: new Date('2020-01-01T01:00:00.000Z'),
    });

    await expect(service.deleteShow('std_123', 'show_123')).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'SHOW_ALREADY_STARTED',
      }),
    });
    expect(showOrchestrationServiceMock.deleteShow).not.toHaveBeenCalled();
  });

  describe('cancelShowWithResolution', () => {
    const pendingEligibleShow = {
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    };
    const actorUser = { id: BigInt(5), uid: 'user_abc123', extId: 'ext_5', name: 'Jane Duty' };

    beforeEach(() => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(pendingEligibleShow);
      userServiceMock.getUserByExtId.mockResolvedValue(actorUser);
      showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });
    });

    it('rejects when the show status is not eligible for cancellation', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        ...pendingEligibleShow,
        showStatus: { uid: 'shst_completed', name: 'completed', systemKey: 'COMPLETED' },
      });

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'manager', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SHOW_CANCELLATION_NOT_ALLOWED' }),
      });
    });

    it('allows draft shows to be cancelled through the manager gate', async () => {
      const draftShow = {
        ...pendingEligibleShow,
        showStatus: { uid: 'shst_draft', name: 'draft', systemKey: 'DRAFT' },
      };
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(draftShow);
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');

      await service.cancelShowWithResolution('std_123', 'show_123', {
        reason_category: 'CLIENT_REQUEST',
        reason_note: 'Client cancelled before planning',
        outcome: 'CANCELLED',
      }, 'manager', 'ext_5');

      expect(showCancellationGateServiceMock.resolveAtomic).toHaveBeenCalledWith({
        show: draftShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'DRAFT',
        outcome: 'CANCELLED',
        reasonCategory: 'CLIENT_REQUEST',
        reasonNote: 'Client cancelled before planning',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Duty' },
      });
    });

    it('rejects when the actor resolves to no tier', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue(null);

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'member', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'CANCELLATION_NOT_AUTHORIZED' }),
      });
    });

    it('manager tier requires outcome', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'manager', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'OUTCOME_REQUIRED' }),
      });
      expect(showCancellationGateServiceMock.resolveAtomic).not.toHaveBeenCalled();
    });

    it('manager tier with outcome calls resolveAtomic', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');

      await service.cancelShowWithResolution('std_123', 'show_123', {
        reason_category: 'EQUIPMENT_FAILURE',
        reason_note: 'Camera failed mid-show',
        outcome: 'CANCELLED',
      }, 'manager', 'ext_5');

      expect(showCancellationGateServiceMock.resolveAtomic).toHaveBeenCalledWith({
        show: pendingEligibleShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'CANCELLED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Duty' },
      });
      expect(showCancellationGateServiceMock.openPending).not.toHaveBeenCalled();
    });

    it('duty Manager tier cannot use the direct cancellation path', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'member', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'DIRECT_CANCELLATION_REQUIRES_MANAGER' }),
      });
      expect(showCancellationGateServiceMock.openPending).not.toHaveBeenCalled();
    });
  });

  describe('requestCancellationResolution', () => {
    const pendingEligibleShow = {
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    };
    const actorUser = { id: BigInt(5), uid: 'user_abc123', extId: 'ext_5', name: 'Jane Duty' };

    beforeEach(() => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(pendingEligibleShow);
      userServiceMock.getUserByExtId.mockResolvedValue(actorUser);
      showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });
    });

    it('active Duty Manager opens pending resolution', async () => {
      showCancellationGateServiceMock.isActiveDutyManager.mockResolvedValue(true);

      await service.requestCancellationResolution('std_123', 'show_123', {
        reason_category: 'EQUIPMENT_FAILURE',
        reason_note: 'Camera failed mid-show',
      }, 'ext_5');

      expect(showCancellationGateServiceMock.openPending).toHaveBeenCalledWith({
        show: pendingEligibleShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Duty' },
      });
      expect(showCancellationGateServiceMock.resolveActorTier).not.toHaveBeenCalled();
      expect(showCancellationGateServiceMock.resolveAtomic).not.toHaveBeenCalled();
    });

    it('active Duty Manager with Admin or Manager role still opens pending resolution', async () => {
      showCancellationGateServiceMock.isActiveDutyManager.mockResolvedValue(true);

      await service.requestCancellationResolution('std_123', 'show_123', {
        reason_category: 'CLIENT_REQUEST',
        reason_note: 'Client requested cancellation from dashboard',
      }, 'ext_5');

      expect(showCancellationGateServiceMock.openPending).toHaveBeenCalledWith(expect.objectContaining({
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'CLIENT_REQUEST',
        reasonNote: 'Client requested cancellation from dashboard',
      }));
      expect(showCancellationGateServiceMock.resolveActorTier).not.toHaveBeenCalled();
    });

    it('rejects a non-active Duty Manager', async () => {
      showCancellationGateServiceMock.isActiveDutyManager.mockResolvedValue(false);

      await expect(
        service.requestCancellationResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
        }, 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'CANCELLATION_NOT_AUTHORIZED' }),
      });
      expect(showCancellationGateServiceMock.openPending).not.toHaveBeenCalled();
    });
  });

  describe('resolveShowCancellation', () => {
    const pendingShow = {
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      showStatus: { uid: 'shst_pending', name: 'cancelled_pending_resolution', systemKey: 'CANCELLED_PENDING_RESOLUTION' },
    };
    const actorUser = { id: BigInt(5), uid: 'user_abc123', extId: 'ext_5', name: 'Jane Manager' };

    beforeEach(() => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(pendingShow);
      userServiceMock.getUserByExtId.mockResolvedValue(actorUser);
      showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');
      showCancellationGateServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed',
        openedBy: { uid: 'user_other', name: 'Duty Bob' },
        openedAt: new Date(),
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [],
      });
    });

    it('rejects when the show is not currently pending', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        ...pendingShow,
        showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
      });

      await expect(
        service.resolveShowCancellation('std_123', 'show_123', {
          outcome: 'CANCELLED',
          resolution_notes: 'note',
        }, 'manager', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SHOW_CANCELLATION_NOT_PENDING' }),
      });
    });

    it('rejects sign-off from a Duty Manager tier', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await expect(
        service.resolveShowCancellation('std_123', 'show_123', {
          outcome: 'CANCELLED',
          resolution_notes: 'note',
        }, 'member', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SIGN_OFF_REQUIRES_MANAGER' }),
      });
    });

    it('calls resolvePending with the derived gate kind', async () => {
      await service.resolveShowCancellation('std_123', 'show_123', {
        outcome: 'CANCELLED',
        resolution_notes: 'Confirmed no production happened',
      }, 'manager', 'ext_5');

      expect(showCancellationGateServiceMock.resolvePending).toHaveBeenCalledWith({
        show: pendingShow,
        gateKind: 'show_cancellation',
        outcome: 'CANCELLED',
        resolutionNotes: 'Confirmed no production happened',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Manager' },
      });
    });

    it('defaults to the show_cancellation gate kind for a pending show with no opening Audit row (e.g. set by schedule-publish)', async () => {
      showCancellationGateServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: true,
        gateKind: null,
        fromStatus: null,
        reasonCategory: null,
        reasonNote: null,
        openedBy: null,
        openedAt: null,
        allowedOutcomes: [],
        history: [],
      });

      await service.resolveShowCancellation('std_123', 'show_123', {
        outcome: 'CANCELLED',
        resolution_notes: 'Confirmed no production happened',
      }, 'manager', 'ext_5');

      expect(showCancellationGateServiceMock.resolvePending).toHaveBeenCalledWith({
        show: pendingShow,
        gateKind: 'show_cancellation',
        outcome: 'CANCELLED',
        resolutionNotes: 'Confirmed no production happened',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Manager' },
      });
    });
  });

  describe('correctShowPlatformPerformance', () => {
    const mockUser = { id: BigInt(5), uid: 'user_abc123', name: 'Jane Manager' };
    const mockShow = { id: BigInt(100), uid: 'show_123', name: 'Livestream Show' };
    const mockShowPlatform = {
      id: BigInt(200),
      uid: 'show_plt_123',
      showId: BigInt(100),
      deletedAt: null,
      platformId: BigInt(300),
      gmv: null,
      ctr: null,
      cto: null,
      viewerCount: 0,
      metadata: {},
      platform: { name: 'TikTok' },
    };

    beforeEach(() => {
      userServiceMock.getUserByExtId.mockResolvedValue(mockUser);
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(mockShow);
      showPlatformRepositoryMock.findByUid.mockResolvedValue(mockShowPlatform);
      showPlatformRepositoryMock.updateCorrectedPerformanceMetrics.mockResolvedValue('updated');
      showServiceMock.getShowById.mockResolvedValue(mockShow);
    });

    it('correctly updates show platform metrics, records MANAGER actuals source, and writes override audit log', async () => {
      await service.correctShowPlatformPerformance('std_123', 'show_123', 'show_plt_123', {
        gmv: '125.50',
        viewerCount: 50,
        ctr: undefined,
        cto: undefined,
        reason: 'Correction request',
      }, 'ext_5');

      expect(showPlatformRepositoryMock.updateCorrectedPerformanceMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_plt_123',
          showId: mockShow.id,
          metrics: [
            { column: 'gmv', value: new Prisma.Decimal('125.50') },
            { column: 'viewer_count', value: 50 },
          ],
          actualsSources: {
            show_platform_gmv: 'MANAGER',
            show_platform_view_count: 'MANAGER',
          },
          performanceTemplates: {
            show_platform_gmv: 'MANAGER',
            show_platform_view_count: 'MANAGER',
          },
        }),
      );
      expect(showPlatformRepositoryMock.update).not.toHaveBeenCalled();

      expect(auditServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OVERRIDE',
          actorId: mockUser.id,
          reason: 'Correction request',
          metadata: expect.objectContaining({
            actor_uid: mockUser.uid,
            show_uid: mockShow.uid,
            show_platform_uid: mockShowPlatform.uid,
          }),
          targets: expect.arrayContaining([
            { targetType: 'SHOW', targetId: mockShow.id },
            { targetType: 'SHOW_PLATFORM', targetId: mockShowPlatform.id },
          ]),
        }),
      );
    });

    it('pins manager provenance when a submitted metric value is unchanged', async () => {
      showPlatformRepositoryMock.findByUid.mockResolvedValue({
        ...mockShowPlatform,
        gmv: new Prisma.Decimal('100.00'),
        metadata: {
          actuals_source: {
            show_platform_gmv: 'PLATFORM',
          },
        },
      });

      await service.correctShowPlatformPerformance('std_123', 'show_123', 'show_plt_123', {
        gmv: '100.00',
        viewerCount: undefined,
        ctr: undefined,
        cto: undefined,
        reason: 'Manager confirms platform total',
      }, 'ext_5');

      expect(showPlatformRepositoryMock.updateCorrectedPerformanceMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_plt_123',
          showId: mockShow.id,
          metrics: [],
          actualsSources: {
            show_platform_gmv: 'MANAGER',
          },
          performanceTemplates: {
            show_platform_gmv: 'MANAGER',
          },
        }),
      );
      expect(auditServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OVERRIDE',
          metadata: expect.objectContaining({
            corrected_metrics: [],
            pinned_metrics: [{ field: 'gmv', value: '100' }],
          }),
        }),
      );
    });

    it('throws if actor user is not found', async () => {
      userServiceMock.getUserByExtId.mockResolvedValue(null);

      await expect(
        service.correctShowPlatformPerformance('std_123', 'show_123', 'show_plt_123', {
          gmv: '100.00',
          viewerCount: undefined,
          ctr: undefined,
          cto: undefined,
          reason: 'Reason',
        }, 'ext_5'),
      ).rejects.toMatchObject({
        message: 'ACTOR_NOT_FOUND',
      });
    });

    it('throws if show platform does not belong to the show', async () => {
      const wrongShowPlatform = { ...mockShowPlatform, showId: BigInt(999) };
      showPlatformRepositoryMock.findByUid.mockResolvedValue(wrongShowPlatform);

      await expect(
        service.correctShowPlatformPerformance('std_123', 'show_123', 'show_plt_123', {
          gmv: '100.00',
          viewerCount: undefined,
          ctr: undefined,
          cto: undefined,
          reason: 'Reason',
        }, 'ext_5'),
      ).rejects.toMatchObject({
        message: 'ShowPlatform not found with id show_plt_123',
      });
    });

    it('does not audit if the guarded correction update finds a stale show platform', async () => {
      showPlatformRepositoryMock.updateCorrectedPerformanceMetrics.mockResolvedValue('not_found');

      await expect(
        service.correctShowPlatformPerformance('std_123', 'show_123', 'show_plt_123', {
          gmv: '100.00',
          viewerCount: undefined,
          ctr: undefined,
          cto: undefined,
          reason: 'Reason',
        }, 'ext_5'),
      ).rejects.toMatchObject({
        message: 'ShowPlatform not found with id show_plt_123',
      });

      expect(auditServiceMock.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveScheduleConflict', () => {
    beforeEach(() => {
      userServiceMock.getUserByExtId.mockResolvedValue({ id: BigInt(9), uid: 'user_1', name: 'Actor' });
      scheduleConflictServiceMock.checkEligibility.mockResolvedValue({ eligible: true });
    });

    it('calls reconcileTaskDueDates with the snapshot old/new times when applying a start_time/end_time diff', async () => {
      scheduleConflictServiceMock.applyConflict.mockResolvedValue({ outcome: 'applied' });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
      } as any);
      auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
        metadata: {
          conflict_type: 'update_held_back',
          held_back: { show_fields: { changed_fields: ['start_time'], old: { start_time: '2026-01-01T10:00:00.000Z' }, new: { start_time: '2026-01-01T10:30:00.000Z' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
        },
      } as any);

      await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'backfill' }, actorExtId);

      expect(taskServiceMock.reconcileTaskDueDates).toHaveBeenCalledWith(
        BigInt(1),
        { startTime: new Date('2026-01-01T10:00:00.000Z'), endTime: expect.any(Date) },
        { startTime: new Date('2026-01-01T10:30:00.000Z'), endTime: expect.any(Date) },
      );
    });

    /**
     * Finding 1 (final-review fix): `toShowUpdateData` used to only translate
     * `name`/`start_time`/`end_time` from a held-back diff's `new` values —
     * `metadata` (a plain scalar, not FK-backed) was silently never written,
     * even though `resolution_status: 'applied'` was returned to the caller.
     * This asserts the write actually happens with the parsed metadata
     * object, not merely that resolution succeeds.
     */
    it('applies a held-back metadata diff to the show record on successful apply', async () => {
      scheduleConflictServiceMock.applyConflict.mockResolvedValue({ outcome: 'applied' });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
        metadata: { note: 'old' },
      } as any);
      auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
        metadata: {
          conflict_type: 'update_held_back',
          held_back: {
            show_fields: {
              changed_fields: ['metadata'],
              old: { metadata: JSON.stringify({ note: 'old' }) },
              new: { metadata: JSON.stringify({ note: 'new', tag: 'backfilled' }) },
            },
            show_creators: [],
            show_platforms: [],
            proposed_status_transition: null,
          },
        },
      } as any);

      await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'backfill metadata' }, actorExtId);

      expect(showRepositoryMock.update).toHaveBeenCalledWith(
        { id: BigInt(1) },
        expect.objectContaining({ metadata: { note: 'new', tag: 'backfilled' } }),
      );
    });

    /**
     * Finding 2 (final-review fix): the drift check must compare against a
     * show read AFTER the showId advisory lock is held (inside
     * applyEligibleScheduleConflict's `loadCurrentState` callback passed to
     * ScheduleConflictService.applyConflict), not the snapshot
     * resolveScheduleConflict read before any lock was ever taken. This
     * seeds two different `findByUidAndStudioUid` reads — a stale first read
     * and a different "fresh" read for every subsequent call — and proves
     * the callback captured for the lock-protected re-read reflects the
     * fresh value, not the pre-lock snapshot.
     */
    it('rebuilds currentFieldValues from a show read after the lock is held, not the pre-lock snapshot', async () => {
      scheduleConflictServiceMock.applyConflict.mockResolvedValue({ outcome: 'applied' });
      showRepositoryMock.findByUidAndStudioUid
        .mockResolvedValueOnce({
          id: BigInt(1),
          uid: 'show_1',
          showStatus: { systemKey: 'DRAFT' },
          name: 'Stale Name (pre-lock snapshot)',
        } as any)
        .mockResolvedValue({
          id: BigInt(1),
          uid: 'show_1',
          showStatus: { systemKey: 'DRAFT' },
          name: 'Fresh Name (post-lock read)',
        } as any);
      auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
        metadata: {
          conflict_type: 'update_held_back',
          held_back: { show_fields: { changed_fields: ['name'], old: { name: 'Original' }, new: { name: 'Planner Edit' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
        },
      } as any);

      await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'x' }, actorExtId);

      expect(scheduleConflictServiceMock.applyConflict).toHaveBeenCalledTimes(1);
      const passedParams = scheduleConflictServiceMock.applyConflict.mock.calls[0][0];
      expect(passedParams.loadCurrentState).toEqual(expect.any(Function));

      const freshState = await passedParams.loadCurrentState();
      expect(freshState.currentFieldValues.name).toBe('Fresh Name (post-lock read)');
      expect(freshState.currentFieldValues.name).not.toBe('Stale Name (pre-lock snapshot)');
    });

    /**
     * PR #271 review finding: `applyConflict`'s relation drift check needs
     * current creator-note/platform-link values, keyed by uid, built from a
     * fresh (lock-protected) read — not the pre-lock snapshot. This asserts
     * `loadCurrentState` actually queries `showCreator` for the held-back
     * creator uids and reads platform values off the freshly-loaded show.
     */
    it('builds currentRelationValues from a fresh showCreator query and the fresh show read', async () => {
      // loadCurrentState touches this.txHost.tx (via buildCurrentRelationValues),
      // which is only bound inside the CLS transaction context — so it must be
      // invoked from within that context, not manually after
      // resolveScheduleConflict has already returned and the context has torn
      // down. Capturing it from inside the mocked applyConflict call (which
      // runs synchronously within applyEligibleScheduleConflict's own
      // @Transactional() context) preserves that.
      let capturedState: any;
      scheduleConflictServiceMock.applyConflict.mockImplementation(async (params: any) => {
        capturedState = await params.loadCurrentState();
        return { outcome: 'applied' };
      });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
        showPlatforms: [{
          platform: { uid: 'platform_1' },
          liveStreamLink: 'https://fresh.example.com',
          platformShowId: 'psid_fresh',
        }],
      } as any);
      auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
        metadata: {
          conflict_type: 'update_held_back',
          held_back: {
            show_fields: null,
            show_creators: [{ creator_uid: 'creator_jane', action: 'update', old_note: 'Backup host', new_note: 'Lead host' }],
            show_platforms: [{
              platform_uid: 'platform_1',
              action: 'update',
              old: { live_stream_link: 'https://old.example.com', platform_show_id: 'psid_old' },
              new: { live_stream_link: 'https://new.example.com', platform_show_id: 'psid_new' },
            }],
            proposed_status_transition: null,
          },
        },
      } as any);
      mockTx.showCreator.findMany.mockResolvedValue([
        { note: 'Backup host', creator: { uid: 'creator_jane' } },
      ]);

      await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'x' }, actorExtId);

      expect(mockTx.showCreator.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ showId: BigInt(1), creator: { uid: { in: ['creator_jane'] } } }),
      }));
      expect(capturedState.currentRelationValues).toEqual({
        showCreators: { creator_jane: 'Backup host' },
        showPlatforms: { platform_1: { liveStreamLink: 'https://fresh.example.com', platformShowId: 'psid_fresh' } },
      });
    });

    it('applies a held-back creator removal by resolving creator_uid to the underlying row and soft-deleting it', async () => {
      scheduleConflictServiceMock.applyConflict.mockResolvedValue({ outcome: 'applied' });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
      } as any);
      auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
        metadata: {
          conflict_type: 'update_held_back',
          held_back: {
            show_fields: null,
            show_creators: [{ creator_uid: 'creator_jane', action: 'remove', old_note: 'Backup host', new_note: null }],
            show_platforms: [],
            proposed_status_transition: null,
          },
        },
      } as any);
      mockTx.creator.findFirst.mockResolvedValue({ id: BigInt(5) });
      mockTx.showCreator.findFirst.mockResolvedValue({ id: BigInt(50) });

      await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'confirmed removal' }, actorExtId);

      expect(mockTx.creator.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { uid: 'creator_jane' } }));
      expect(mockTx.showCreator.update).toHaveBeenCalledWith({
        where: { id: BigInt(50) },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('dismisses a conflict via the service without touching show data', async () => {
      scheduleConflictServiceMock.dismissConflict.mockResolvedValue({ outcome: 'dismissed' });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
      } as any);
      auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
        metadata: { conflict_type: 'update_held_back', held_back: null },
      } as any);

      await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'dismiss', reason: 'no longer needed' }, actorExtId);

      expect(scheduleConflictServiceMock.dismissConflict).toHaveBeenCalledWith({
        showId: BigInt(1),
        conflictUid: 'conflict_1',
        actorId: BigInt(9),
        reason: 'no longer needed',
      });
      expect(scheduleConflictServiceMock.applyConflict).not.toHaveBeenCalled();
      expect(showRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('throws ACTOR_NOT_FOUND when the actor does not resolve', async () => {
      userServiceMock.getUserByExtId.mockResolvedValue(null);
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
      } as any);

      await expect(
        service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'dismiss', reason: 'x' }, actorExtId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'ACTOR_NOT_FOUND' }),
      });
      expect(scheduleConflictServiceMock.dismissConflict).not.toHaveBeenCalled();
    });

    /**
     * Regression test for the rollback-swallows-write bug: resolveScheduleConflict
     * must resolve checkEligibility() to completion (its transaction already
     * committed) BEFORE it throws SHOW_NO_LONGER_ELIGIBLE, and must never call
     * applyConflict (or any downstream show/task write) for an ineligible show.
     * If this were still one @Transactional() method write-then-throwing in a
     * single transaction, checkEligibility wouldn't exist as a separate call at
     * all — this asserts the call is genuinely separate and precedes the throw.
     */
    it('rejects with SHOW_NO_LONGER_ELIGIBLE via checkEligibility — a call already resolved before the throw — without ever calling applyConflict', async () => {
      scheduleConflictServiceMock.checkEligibility.mockResolvedValue({ eligible: false });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'COMPLETED' },
      } as any);

      await expect(
        service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'x' }, actorExtId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SHOW_NO_LONGER_ELIGIBLE' }),
      });

      expect(scheduleConflictServiceMock.checkEligibility).toHaveBeenCalledWith({
        showId: BigInt(1),
        conflictUid: 'conflict_1',
        currentShowStatus: 'COMPLETED',
      });
      expect(scheduleConflictServiceMock.applyConflict).not.toHaveBeenCalled();
      expect(taskServiceMock.reconcileTaskDueDates).not.toHaveBeenCalled();
      expect(showRepositoryMock.update).not.toHaveBeenCalled();
    });

    /**
     * Regression test for a real bug found during Task 6 review:
     * toSchedulePublishImpactRow used to hardcode `resolution_status: 'pending'`
     * for any stale_conflict row, so a successful apply's own response row
     * misreported itself as still pending. The fix derives resolution_status
     * from the persisted audit's `lifecycle`/`outcome` — this asserts the
     * response of a successful apply reports 'applied', not 'pending'.
     * findLatestScheduleConflictForShow is called twice by resolveScheduleConflict
     * (once to read the pending conflict before applying, once to re-read the
     * now-resolved row for the response), so the two mocked resolutions below
     * are deliberately different — this only passes if the response is really
     * built from the second (post-apply) read.
     */
    it('returns resolution_status: applied in the response row after a successful apply', async () => {
      scheduleConflictServiceMock.applyConflict.mockResolvedValue({ outcome: 'applied' });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
      } as any);

      const openedMetadata = {
        event: 'schedule_publish_impact',
        impact_kind: 'stale_conflict',
        lifecycle: 'opened',
        conflict_uid: 'conflict_1',
        conflict_type: 'update_held_back',
        schedule_uid: 'schedule_1',
        external_id: 'EXT-1',
        held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
        source: 'google_sheets_schedule_publish',
      };
      const resolvedMetadata = {
        ...openedMetadata,
        lifecycle: 'resolved',
        resolves_conflict_uid: 'conflict_1',
        outcome: 'applied',
      };

      auditServiceMock.findLatestScheduleConflictForShow
        .mockResolvedValueOnce({ uid: 'aud_old', createdAt: new Date('2026-01-01T00:00:00.000Z'), metadata: openedMetadata } as any)
        .mockResolvedValueOnce({ uid: 'aud_new', createdAt: new Date('2026-01-02T00:00:00.000Z'), metadata: resolvedMetadata } as any);

      const result = await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'backfill' }, actorExtId);

      expect(result.resolution_status).toBe('applied');
    });

    it('returns resolution_status: dismissed in the response row after a successful dismiss', async () => {
      scheduleConflictServiceMock.dismissConflict.mockResolvedValue({ outcome: 'dismissed' });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'DRAFT' },
      } as any);
      auditServiceMock.findLatestScheduleConflictForShow.mockResolvedValue({
        uid: 'aud_new',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        metadata: {
          event: 'schedule_publish_impact',
          impact_kind: 'stale_conflict',
          lifecycle: 'resolved',
          conflict_uid: 'conflict_1',
          conflict_type: 'update_held_back',
          resolves_conflict_uid: 'conflict_1',
          outcome: 'dismissed',
          schedule_uid: 'schedule_1',
          external_id: 'EXT-1',
          held_back: null,
          source: 'google_sheets_schedule_publish',
        },
      } as any);

      const result = await service.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'dismiss', reason: 'no longer needed' }, actorExtId);

      expect(result.resolution_status).toBe('dismissed');
    });
  });

  /**
   * End-to-end regression test for the actual bug: reproduces the real call
   * shape (StudioShowManagementService.resolveScheduleConflict calling into
   * the REAL ScheduleConflictService, not a jest.fn() mock) against a
   * $transaction mock that genuinely simulates Prisma's commit-on-resolve /
   * rollback-on-throw semantics — unlike the always-committing passthrough
   * (`jest.fn(async (cb) => cb(mockTx))`) used everywhere else in this file,
   * which cannot distinguish a durable write from one that got rolled back.
   *
   * Before the fix, resolveScheduleConflict was @Transactional() and called
   * the (undecorated) applyConflict directly — CLS Propagation.Required
   * reused that single ambient transaction, so applyConflict's write-then-throw
   * for SHOW_NO_LONGER_ELIGIBLE got rolled back along with the throw, and the
   * audit write never landed. This test proves the write now survives.
   */
  describe('resolveScheduleConflict transaction integrity (regression: auto-resolve write must survive the SHOW_NO_LONGER_ELIGIBLE throw)', () => {
    let integrationService: StudioShowManagementService;
    let durableAuditRows: Array<{ uid: string; metadata: any; actorId: bigint | null; reason: string | null }>;

    beforeEach(async () => {
      durableAuditRows = [];
      let currentBuffer: typeof durableAuditRows | null = null;

      const mockTxWithLock = { $executeRaw: jest.fn().mockResolvedValue(undefined) };

      const transactionalPrismaMock = {
        // Simulates real Prisma $transaction semantics: writes made during the
        // callback are only visible durably if the callback resolves; if it
        // throws, they're discarded (never flushed). Nested @Transactional()
        // calls under CLS Propagation.Required don't call $transaction again —
        // they reuse the ambient transaction/buffer, exactly like real Prisma.
        $transaction: jest.fn(async (callback: any) => {
          const isOutermost = currentBuffer === null;
          const buffer = isOutermost ? [] : currentBuffer!;
          const previous = currentBuffer;
          currentBuffer = buffer;
          try {
            const result = await callback(mockTxWithLock);
            if (isOutermost) {
              durableAuditRows.push(...buffer);
            }
            return result;
          } finally {
            currentBuffer = previous;
          }
        }),
      };

      const fakeAuditService = {
        create: jest.fn(async (payload: any) => {
          const row = { uid: `aud_new_${durableAuditRows.length}`, metadata: payload.metadata, actorId: payload.actorId ?? null, reason: payload.reason ?? null };
          (currentBuffer ?? durableAuditRows).push(row);
          return row;
        }),
        findLatestScheduleConflictForShow: jest.fn(async () => {
          const rows = [...durableAuditRows, ...(currentBuffer ?? [])];
          return rows.length > 0 ? (rows[rows.length - 1] as any) : null;
        }),
      };

      @Module({
        providers: [{ provide: PrismaService, useValue: transactionalPrismaMock }],
        exports: [PrismaService],
      })
      class IntegrationPrismaModule {}

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ClsModule.forRoot({
            global: true,
            middleware: { mount: false },
            plugins: [
              new ClsPluginTransactional({
                imports: [IntegrationPrismaModule],
                adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
              }),
            ],
          }),
        ],
        providers: [
          StudioShowManagementService,
          ScheduleConflictService,
          { provide: UidGeneratorService, useValue: { generateBrandedId: jest.fn().mockReturnValue('conflict_fresh') } },
          { provide: StudioService, useValue: studioServiceMock },
          { provide: StudioRoomService, useValue: studioRoomServiceMock },
          { provide: ScheduleService, useValue: scheduleServiceMock },
          { provide: ShowService, useValue: showServiceMock },
          { provide: ShowRepository, useValue: showRepositoryMock },
          { provide: PlatformService, useValue: platformServiceMock },
          { provide: ShowPlatformRepository, useValue: showPlatformRepositoryMock },
          { provide: ShowPlatformService, useValue: showPlatformServiceMock },
          { provide: ShowOrchestrationService, useValue: showOrchestrationServiceMock },
          { provide: UserService, useValue: userServiceMock },
          { provide: ShowCancellationGateService, useValue: showCancellationGateServiceMock },
          { provide: ShowStatusService, useValue: showStatusServiceMock },
          { provide: TaskService, useValue: taskServiceMock },
          { provide: AuditService, useValue: fakeAuditService },
          { provide: TaskTargetService, useValue: taskTargetServiceMock },
          { provide: PublishRunService, useValue: publishRunServiceMock },
        ],
      }).compile();

      integrationService = module.get(StudioShowManagementService);

      userServiceMock.getUserByExtId.mockResolvedValue({ id: BigInt(9), uid: 'user_1', name: 'Actor' });
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_1',
        showStatus: { systemKey: 'COMPLETED' },
      } as any);

      durableAuditRows.push({
        uid: 'aud_old',
        metadata: {
          event: 'schedule_publish_impact',
          impact_kind: 'stale_conflict',
          lifecycle: 'opened',
          conflict_uid: 'conflict_1',
          conflict_type: 'update_held_back',
          schedule_uid: 'schedule_1',
          external_id: 'EXT-1',
          held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
          source: 'google_sheets_schedule_publish',
        },
        actorId: null,
        reason: null,
      });
    });

    it('durably commits the auto-resolve audit write even though the request is ultimately rejected with SHOW_NO_LONGER_ELIGIBLE', async () => {
      await expect(
        integrationService.resolveScheduleConflict('studio_1', 'show_1', 'conflict_1', { action: 'apply', reason: 'planner override' }, actorExtId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'SHOW_NO_LONGER_ELIGIBLE' }),
      });

      const latest = durableAuditRows[durableAuditRows.length - 1];
      expect(latest.metadata).toMatchObject({
        lifecycle: 'resolved',
        outcome: 'auto_resolved_no_longer_conflicting',
        resolves_conflict_uid: 'conflict_1',
      });
    });
  });

  describe('getSchedulePublishImpactSummary', () => {
    it('aggregates per-kind counts and the pending-stale count from the shared filter plan', async () => {
      auditServiceMock.countSchedulePublishImpactsForStudio.mockImplementation(
        async (_studioUid: string, filters: { impactKinds?: string[] }) => {
          switch (filters.impactKinds?.[0]) {
            case 'confirmed_future_updated': return 3;
            case 'confirmed_future_pending_resolution': return 2;
            case 'past_show_creator_backfilled': return 1;
            default: return 0;
          }
        },
      );
      auditServiceMock.countPendingStaleConflictsForStudio.mockResolvedValue(4);

      const summary = await service.getSchedulePublishImpactSummary('std_123', {});

      expect(summary).toEqual({
        total: 10,
        confirmed_future_updated: 3,
        confirmed_future_pending_resolution: 2,
        stale_conflict_pending: 4,
        stale_conflict_resolved: 0,
        past_show_creator_backfilled: 1,
      });
      expect(auditServiceMock.countResolvedStaleConflictsForStudio).not.toHaveBeenCalled();
    });

    it('zeroes kinds excluded by the impact_kind filter without counting them', async () => {
      auditServiceMock.countSchedulePublishImpactsForStudio.mockResolvedValue(5);

      const summary = await service.getSchedulePublishImpactSummary('std_123', {
        impact_kind: 'confirmed_future_updated',
      });

      expect(summary).toEqual({
        total: 5,
        confirmed_future_updated: 5,
        confirmed_future_pending_resolution: 0,
        stale_conflict_pending: 0,
        stale_conflict_resolved: 0,
        past_show_creator_backfilled: 0,
      });
      expect(auditServiceMock.countSchedulePublishImpactsForStudio).toHaveBeenCalledTimes(1);
      expect(auditServiceMock.countPendingStaleConflictsForStudio).not.toHaveBeenCalled();
    });

    it('counts resolved history rows when resolution_status selects resolved outcomes', async () => {
      auditServiceMock.countPendingStaleConflictsForStudio.mockResolvedValue(2);
      auditServiceMock.countResolvedStaleConflictsForStudio.mockResolvedValue(3);

      const summary = await service.getSchedulePublishImpactSummary('std_123', {
        resolution_status: ['pending', 'applied', 'dismissed'],
      });

      expect(summary).toEqual({
        total: 5,
        confirmed_future_updated: 0,
        confirmed_future_pending_resolution: 0,
        stale_conflict_pending: 2,
        stale_conflict_resolved: 3,
        past_show_creator_backfilled: 0,
      });
      expect(auditServiceMock.countResolvedStaleConflictsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({ outcomes: ['applied', 'dismissed'] }),
      );
      expect(auditServiceMock.countSchedulePublishImpactsForStudio).not.toHaveBeenCalled();
    });
  });

  describe('listPublishRuns', () => {
    it('maps publish runs to lean external rows', async () => {
      publishRunServiceMock.getPublishRunsForStudio.mockResolvedValue({
        total: 1,
        items: [
          {
            id: BigInt(7),
            uid: 'prun_abc',
            source: 'google_sheets_sync',
            summary: { shows_created: 2, shows_updated: 1 },
            schedule: { uid: 'schedule_123' },
            triggeredBy: { uid: 'user_123', name: 'Planner' },
            createdAt: new Date('2026-07-15T08:00:00.000Z'),
          },
        ],
      });

      const result = await service.listPublishRuns('std_123', { page: 1, limit: 25 });

      expect(publishRunServiceMock.getPublishRunsForStudio).toHaveBeenCalledWith('std_123', { skip: 0, take: 25 });
      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual({
        id: 'prun_abc',
        source: 'google_sheets_sync',
        schedule_id: 'schedule_123',
        triggered_by: { id: 'user_123', name: 'Planner' },
        summary: { shows_created: 2, shows_updated: 1 },
        created_at: '2026-07-15T08:00:00.000Z',
      });
    });
  });

  describe('listSchedulePublishImpacts', () => {
    it('passes impact-kind filters to the confirmed-future source and skips the stale source when stale_conflict is excluded', async () => {
      auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({ items: [], total: 0 });

      await service.listSchedulePublishImpacts('std_123', {
        impact_kind: ['confirmed_future_updated', 'past_show_creator_backfilled'],
      });

      expect(auditServiceMock.findSchedulePublishImpactsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({
          impactKinds: ['confirmed_future_updated', 'past_show_creator_backfilled'],
          // An explicit kind filter lifts the implicit upcoming-only default,
          // so past-show rows (e.g. creator backfills) stay reachable.
          startDateFrom: undefined,
          implicitStartDateFrom: undefined,
        }),
      );
      expect(auditServiceMock.findPendingStaleConflictsForStudio).not.toHaveBeenCalled();
    });

    // Regression: the untouched default view used to push its upcoming-only
    // bound into `startDateFrom`, which also hid always-past
    // `past_show_creator_backfilled` rows. The default now travels as
    // `implicitStartDateFrom`, which the repository exempts that kind from.
    it('passes the default upcoming-only bound as implicitStartDateFrom, not startDateFrom', async () => {
      auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({ items: [], total: 0 });
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [], total: 0 });

      await service.listSchedulePublishImpacts('std_123', {});

      expect(auditServiceMock.findSchedulePublishImpactsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({
          startDateFrom: undefined,
          implicitStartDateFrom: expect.any(Date),
        }),
      );
    });

    it('labels past_show_creator_backfilled rows with their own impact kind', async () => {
      auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({
        total: 1,
        items: [
          {
            targetId: BigInt(9),
            audit: {
              uid: 'aud_backfill',
              metadata: {
                event: 'schedule_publish_impact',
                schedule_uid: 'schedule_123',
                external_id: 'EXT-9',
                impact_kind: 'past_show_creator_backfilled',
                changed_fields: [],
                relation_changes: { creator_links_added: 2 },
              },
              createdAt: new Date('2026-07-10T10:00:00.000Z'),
            },
            show: {
              uid: 'show_terminal',
              externalId: 'EXT-9',
              name: 'Past Show',
              startTime: new Date('2026-07-01T10:00:00.000Z'),
              endTime: new Date('2026-07-01T12:00:00.000Z'),
              showStatus: { name: 'completed', systemKey: 'COMPLETED' },
              client: { uid: 'client_123', name: 'Client' },
            },
          },
        ],
      });
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [], total: 0 });

      const result = await service.listSchedulePublishImpacts('std_123', {});

      // Regression: this kind used to fall through the mapper to
      // 'confirmed_future_updated', so the backfilled badge never rendered.
      expect(result.items[0].impact_kind).toBe('past_show_creator_backfilled');
      expect(result.items[0].relation_changes).toEqual({ creator_links_added: 2 });
    });

    it('serves only the pending-stale source when resolution_status is pending', async () => {
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [], total: 0 });

      await service.listSchedulePublishImpacts('std_123', {
        resolution_status: 'pending',
      });

      expect(auditServiceMock.findSchedulePublishImpactsForStudio).not.toHaveBeenCalled();
      expect(auditServiceMock.findResolvedStaleConflictsForStudio).not.toHaveBeenCalled();
      expect(auditServiceMock.findPendingStaleConflictsForStudio).toHaveBeenCalledTimes(1);
    });

    // Regression: applied/dismissed/superseded/auto_resolved selections used to
    // return an empty page unconditionally — every advertised status must be
    // servable.
    it.each([
      'applied',
      'dismissed',
      'superseded',
      'auto_resolved_no_longer_conflicting',
    ] as const)('serves resolved history when resolution_status is %s', async (status) => {
      auditServiceMock.findResolvedStaleConflictsForStudio.mockResolvedValue({ items: [], total: 1 });

      const result = await service.listSchedulePublishImpacts('std_123', {
        resolution_status: status,
      });

      expect(auditServiceMock.findResolvedStaleConflictsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({ outcomes: [status] }),
      );
      expect(auditServiceMock.findSchedulePublishImpactsForStudio).not.toHaveBeenCalled();
      expect(auditServiceMock.findPendingStaleConflictsForStudio).not.toHaveBeenCalled();
      expect(result.total).toBe(1);
    });

    it('serves both stale sources for a mixed pending + resolved selection', async () => {
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [], total: 2 });
      auditServiceMock.findResolvedStaleConflictsForStudio.mockResolvedValue({ items: [], total: 3 });

      const result = await service.listSchedulePublishImpacts('std_123', {
        resolution_status: ['pending', 'applied', 'superseded'],
      });

      expect(auditServiceMock.findPendingStaleConflictsForStudio).toHaveBeenCalledTimes(1);
      expect(auditServiceMock.findResolvedStaleConflictsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({ outcomes: ['applied', 'superseded'] }),
      );
      expect(result.total).toBe(5);
    });

    // Regression: an end-only date query used to keep the implicit
    // `startDateFrom = now`, so historical upper bounds returned empty.
    it('treats an end-only start_date_to as explicit scope and lifts the implicit upcoming-only default', async () => {
      auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({ items: [], total: 0 });
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [], total: 0 });

      const startDateTo = '2026-06-30T23:59:59.999Z';
      await service.listSchedulePublishImpacts('std_123', { start_date_to: startDateTo });

      expect(auditServiceMock.findSchedulePublishImpactsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({
          startDateFrom: undefined,
          startDateTo: new Date(startDateTo),
        }),
      );
    });

    it('resolves publish_run_id to the internal run id for both sources', async () => {
      publishRunServiceMock.getPublishRunByUid.mockResolvedValue({ id: BigInt(42), uid: 'prun_abc' });
      auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({ items: [], total: 0 });
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [], total: 0 });

      await service.listSchedulePublishImpacts('std_123', { publish_run_id: 'prun_abc' });

      expect(publishRunServiceMock.getPublishRunByUid).toHaveBeenCalledWith('prun_abc');
      expect(auditServiceMock.findSchedulePublishImpactsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({ publishRunId: BigInt(42) }),
      );
      expect(auditServiceMock.findPendingStaleConflictsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({ publishRunId: BigInt(42) }),
      );
    });

    it('returns an empty page without querying when publish_run_id is unknown', async () => {
      publishRunServiceMock.getPublishRunByUid.mockResolvedValue(null);

      const result = await service.listSchedulePublishImpacts('std_123', { publish_run_id: 'prun_missing' });

      expect(result).toEqual({ items: [], total: 0 });
      expect(auditServiceMock.findSchedulePublishImpactsForStudio).not.toHaveBeenCalled();
      expect(auditServiceMock.findPendingStaleConflictsForStudio).not.toHaveBeenCalled();
    });

    it('maps schedule publish impact audits to manager queue rows', async () => {
      const createdAt = new Date('2026-06-29T10:00:00.000Z');
      const startDateFrom = '2026-07-01T00:00:00.000Z';
      auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({
        total: 1,
        items: [
          {
            targetId: BigInt(5),
            audit: {
              uid: 'aud_123',
              metadata: {
                event: 'schedule_publish_impact',
                schedule_uid: 'schedule_123',
                external_id: 'show_external_1',
                impact_kind: 'confirmed_future_updated',
                changed_fields: ['start_time'],
                relation_changes: { creator_links_added: 1 },
              },
              createdAt,
            },
            show: {
              uid: 'show_123',
              externalId: 'show_external_1',
              name: 'Confirmed Show',
              startTime: new Date('2026-07-01T10:00:00.000Z'),
              endTime: new Date('2026-07-01T12:00:00.000Z'),
              showStatus: { name: 'confirmed', systemKey: 'CONFIRMED' },
              client: { uid: 'client_123', name: 'Client' },
            },
          },
        ],
      });
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [], total: 0 });

      const result = await service.listSchedulePublishImpacts('std_123', {
        page: 2,
        limit: 25,
        start_date_from: startDateFrom,
      });

      expect(auditServiceMock.findSchedulePublishImpactsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({
          startDateFrom: new Date(startDateFrom),
          skip: 25,
          take: 25,
        }),
      );
      expect(auditServiceMock.findPendingStaleConflictsForStudio).toHaveBeenCalledWith(
        'std_123',
        expect.objectContaining({ skip: 25, take: 25 }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual({
        audit_id: 'aud_123',
        impact_kind: 'confirmed_future_updated',
        schedule_id: 'schedule_123',
        external_id: 'show_external_1',
        changed_fields: ['start_time'],
        relation_changes: { creator_links_added: 1 },
        conflict_uid: null,
        conflict_type: null,
        resolution_status: null,
        held_back: null,
        show: {
          id: 'show_123',
          name: 'Confirmed Show',
          external_id: 'show_external_1',
          start_time: '2026-07-01T10:00:00.000Z',
          end_time: '2026-07-01T12:00:00.000Z',
          status_name: 'confirmed',
          status_system_key: 'CONFIRMED',
          client_id: 'client_123',
          client_name: 'Client',
        },
        created_at: '2026-06-29T10:00:00.000Z',
      });
    });

    it('returns unresolved stale_conflict rows for a past-dated show by default, alongside upcoming confirmed_future_* rows', async () => {
      const confirmedFutureFixture = {
        audit: {
          uid: 'aud_confirmed',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          reason: null,
          metadata: {
            event: 'schedule_publish_impact',
            impact_kind: 'confirmed_future_updated',
            schedule_uid: 'schedule_1',
            external_id: 'EXT-1',
            changed_fields: ['name'],
            relation_changes: {},
          },
        },
        targetId: BigInt(1),
        show: {
          uid: 'show_1',
          externalId: 'EXT-1',
          name: 'Upcoming Show',
          startTime: new Date('2026-06-01T10:00:00.000Z'),
          endTime: new Date('2026-06-01T12:00:00.000Z'),
          client: { uid: 'client_1', name: 'Client' },
          showStatus: { name: 'Confirmed', systemKey: 'CONFIRMED' },
        },
      };
      const staleConflictFixture = {
        audit: {
          uid: 'aud_stale',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          reason: null,
          metadata: {
            event: 'schedule_publish_impact',
            impact_kind: 'stale_conflict',
            lifecycle: 'opened',
            conflict_uid: 'conflict_1',
            conflict_type: 'update_held_back',
            schedule_uid: 'schedule_1',
            external_id: 'EXT-2',
            held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
          },
        },
        targetId: BigInt(2),
        show: {
          uid: 'show_2',
          externalId: 'EXT-2',
          name: 'Past Show',
          startTime: new Date('2026-01-01T10:00:00.000Z'),
          endTime: new Date('2026-01-01T12:00:00.000Z'),
          client: { uid: 'client_1', name: 'Client' },
          showStatus: { name: 'Draft', systemKey: 'DRAFT' },
        },
      };

      auditServiceMock.findSchedulePublishImpactsForStudio.mockResolvedValue({ items: [confirmedFutureFixture], total: 1 });
      auditServiceMock.findPendingStaleConflictsForStudio.mockResolvedValue({ items: [staleConflictFixture], total: 1 });

      const result = await service.listSchedulePublishImpacts('studio_1', {});

      expect(result.items).toHaveLength(2);
      expect(result.items.some((r) => r.impact_kind === 'stale_conflict')).toBe(true);
      expect(auditServiceMock.findPendingStaleConflictsForStudio).toHaveBeenCalledWith('studio_1', expect.objectContaining({ skip: 0, take: 25 }));
    });

    it('round-trips an FK-backed held_back field as uid+name, never a raw bigint', async () => {
      const staleConflictFixtureWithFkField = {
        audit: {
          uid: 'aud_stale_fk',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          reason: null,
          metadata: {
            event: 'schedule_publish_impact',
            impact_kind: 'stale_conflict',
            lifecycle: 'opened',
            conflict_uid: 'conflict_fk1',
            conflict_type: 'update_held_back',
            schedule_uid: 'schedule_1',
            external_id: 'EXT-3',
            held_back: {
              show_fields: {
                changed_fields: ['show_type_id'],
                old: { show_type_id: { uid: 'shwtyp_1', name: 'bau' } },
                new: { show_type_id: { uid: 'shwtyp_2', name: 'campaign' } },
              },
              show_creators: [],
              show_platforms: [],
              proposed_status_transition: null,
            },
          },
        },
        targetId: BigInt(3),
        show: {
          uid: 'show_3',
          externalId: 'EXT-3',
          name: 'Show',
          startTime: new Date('2026-01-01T10:00:00.000Z'),
          endTime: new Date('2026-01-01T12:00:00.000Z'),
          client: { uid: 'client_1', name: 'Client' },
          showStatus: { name: 'Draft', systemKey: 'DRAFT' },
        },
      };

      const row = (service as any).toSchedulePublishImpactRow(staleConflictFixtureWithFkField);
      expect(row.held_back.show_fields.old.show_type_id).toEqual({ uid: 'shwtyp_1', name: 'bau' });
      expect(typeof row.held_back.show_fields.old.show_type_id).not.toBe('bigint');
      expect(typeof row.held_back.show_fields.old.show_type_id).not.toBe('number');
    });
  });

  describe('listShowAudits', () => {
    it('returns paginated audits and maps target UIDs without leaking raw bigint database IDs', async () => {
      const showUid = 'show_123';
      const studioUid = 'std_123';

      auditServiceMock.countForTargets.mockResolvedValue(1);
      auditServiceMock.findForTargets.mockResolvedValue([
        {
          uid: 'aud_999',
          action: 'UPDATE',
          ipAddress: '127.0.0.1',
          userAgent: 'Chrome',
          reason: 'Test edit',
          metadata: { field: 'value' },
          createdAt: new Date('2026-06-29T10:00:00.000Z'),
          actor: { uid: 'usr_777' },
          targets: [
            {
              targetType: 'SHOW',
              targetId: BigInt(100),
              show: { uid: 'show_123' },
            },
            {
              targetType: 'SHOW_PLATFORM',
              targetId: BigInt(200),
              showPlatform: { uid: 'shp_777' },
            },
          ],
        },
      ]);

      const result = await service.listShowAudits(studioUid, showUid, { page: 1, limit: 10 });

      expect(showRepositoryMock.findByUidAndStudioUid).toHaveBeenCalledWith(
        showUid,
        studioUid,
        expect.any(Object),
      );
      expect(auditServiceMock.countForTargets).toHaveBeenCalledWith([
        { targetType: 'SHOW', targetId: BigInt(100) },
      ]);
      expect(auditServiceMock.findForTargets).toHaveBeenCalledWith(
        [{ targetType: 'SHOW', targetId: BigInt(100) }],
        { skip: 0, take: 10 },
      );

      expect(result).toEqual({
        total: 1,
        items: [
          {
            id: 'aud_999',
            action: 'UPDATE',
            actor_uid: 'usr_777',
            ip_address: '127.0.0.1',
            user_agent: 'Chrome',
            reason: 'Test edit',
            metadata: { field: 'value' },
            targets: [
              {
                target_type: 'SHOW',
                target_uid: 'show_123',
              },
              {
                target_type: 'SHOW_PLATFORM',
                target_uid: 'shp_777',
              },
            ],
            created_at: '2026-06-29T10:00:00.000Z',
          },
        ],
      });
    });
  });
});
