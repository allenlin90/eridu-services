import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import { StudioShowManagementService } from './studio-show-management.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import { PlatformRepository } from '@/models/platform/platform.repository';
import { ScheduleService } from '@/models/schedule/schedule.service';
import type { UpdateStudioShowDto } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
import { TaskService } from '@/models/task/task.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ShowCancellationGateService } from '@/show-orchestration/show-cancellation-gate.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback({})),
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
  const platformRepositoryMock = {
    findByUids: jest.fn(),
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
        StudioShowManagementService,
        { provide: StudioService, useValue: studioServiceMock },
        { provide: StudioRoomService, useValue: studioRoomServiceMock },
        { provide: ScheduleService, useValue: scheduleServiceMock },
        { provide: ShowService, useValue: showServiceMock },
        { provide: ShowRepository, useValue: showRepositoryMock },
        { provide: PlatformRepository, useValue: platformRepositoryMock },
        { provide: ShowPlatformRepository, useValue: showPlatformRepositoryMock },
        { provide: ShowPlatformService, useValue: showPlatformServiceMock },
        { provide: ShowOrchestrationService, useValue: showOrchestrationServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ShowCancellationGateService, useValue: showCancellationGateServiceMock },
        { provide: ShowStatusService, useValue: showStatusServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
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
    platformRepositoryMock.findByUids.mockResolvedValue([
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
      showServiceMock.getShowById.mockResolvedValue(mockShow);
    });

    it('correctly updates show platform metrics, records MANAGER actuals source, and writes override audit log', async () => {
      await service.correctShowPlatformPerformance('std_123', 'show_123', 'show_plt_123', {
        gmv: '125.50',
        viewerCount: 50,
        reason: 'Correction request',
      }, 'ext_5');

      expect(showPlatformRepositoryMock.update).toHaveBeenCalledWith(
        { id: mockShowPlatform.id },
        expect.objectContaining({
          gmv: new Prisma.Decimal('125.50'),
          viewerCount: 50,
          metadata: expect.objectContaining({
            actuals_source: expect.objectContaining({
              show_platform_gmv: 'MANAGER',
              show_platform_view_count: 'MANAGER',
            }),
            performance_templates: expect.objectContaining({
              show_platform_gmv: 'MANAGER',
              show_platform_view_count: 'MANAGER',
            }),
          }),
        }),
      );

      expect(auditServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OVERRIDE',
          actorId: mockUser.id,
          reason: 'Correction request',
          targets: expect.arrayContaining([
            { targetType: 'SHOW', targetId: mockShow.id },
            { targetType: 'SHOW_PLATFORM', targetId: mockShowPlatform.id },
          ]),
        }),
      );
    });

    it('throws if actor user is not found', async () => {
      userServiceMock.getUserByExtId.mockResolvedValue(null);

      await expect(
        service.correctShowPlatformPerformance('std_123', 'show_123', 'show_plt_123', {
          gmv: '100.00',
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
          reason: 'Reason',
        }, 'ext_5'),
      ).rejects.toMatchObject({
        message: 'ShowPlatform not found with id show_plt_123',
      });
    });
  });
});
