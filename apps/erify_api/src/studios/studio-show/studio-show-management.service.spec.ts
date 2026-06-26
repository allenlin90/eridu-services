import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { StudioShowManagementService } from './studio-show-management.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { PlatformRepository } from '@/models/platform/platform.repository';
import { ScheduleService } from '@/models/schedule/schedule.service';
import type { UpdateStudioShowDto } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
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
    openPending: jest.fn(),
    resolveAtomic: jest.fn(),
    amendPendingNote: jest.fn(),
    resolvePending: jest.fn(),
    getCancellationStatus: jest.fn(),
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

  it('allows updateShow to change show_status_id when no gate is pending', async () => {
    showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      startTime: new Date('2026-01-01T00:00:00.000Z'),
      endTime: new Date('2026-01-01T01:00:00.000Z'),
      showStatus: { uid: 'shst_confirmed', name: 'confirmed', systemKey: 'CONFIRMED' },
    });
    showRepositoryMock.update.mockResolvedValue({ uid: 'show_123' });
    showServiceMock.getShowById.mockResolvedValue({ uid: 'show_123' });

    await service.updateShow('std_123', 'show_123', { showStatusId: 'shst_cancelled' } as UpdateStudioShowDto);

    expect(showRepositoryMock.update).toHaveBeenCalled();
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
        showStatus: { uid: 'shst_draft', name: 'draft', systemKey: 'DRAFT' },
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

    it('duty Manager tier rejects an outcome field', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await expect(
        service.cancelShowWithResolution('std_123', 'show_123', {
          reason_category: 'EQUIPMENT_FAILURE',
          reason_note: 'note',
          outcome: 'CANCELLED',
        }, 'member', 'ext_5'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'OUTCOME_NOT_ALLOWED_FOR_DUTY_MANAGER' }),
      });
      expect(showCancellationGateServiceMock.openPending).not.toHaveBeenCalled();
    });

    it('duty Manager tier without outcome calls openPending', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await service.cancelShowWithResolution('std_123', 'show_123', {
        reason_category: 'EQUIPMENT_FAILURE',
        reason_note: 'Camera failed mid-show',
      }, 'member', 'ext_5');

      expect(showCancellationGateServiceMock.openPending).toHaveBeenCalledWith({
        show: pendingEligibleShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed mid-show',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Duty' },
      });
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

    it('calls resolvePending with the derived from_status and gate kind', async () => {
      await service.resolveShowCancellation('std_123', 'show_123', {
        outcome: 'CANCELLED',
        resolution_notes: 'Confirmed no production happened',
      }, 'manager', 'ext_5');

      expect(showCancellationGateServiceMock.resolvePending).toHaveBeenCalledWith({
        show: pendingShow,
        gateKind: 'show_cancellation',
        fromStatusSystemKey: 'CONFIRMED',
        outcome: 'CANCELLED',
        resolutionNotes: 'Confirmed no production happened',
        actor: { id: BigInt(5), uid: 'user_abc123', name: 'Jane Manager' },
      });
    });
  });

  describe('amendCancellationNote', () => {
    const pendingShow = {
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
      showStatus: { uid: 'shst_pending', name: 'cancelled_pending_resolution', systemKey: 'CANCELLED_PENDING_RESOLUTION' },
    };
    const actorUser = { id: BigInt(7), uid: 'user_def456', extId: 'ext_7', name: 'Bob Duty' };

    beforeEach(() => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue(pendingShow);
      userServiceMock.getUserByExtId.mockResolvedValue(actorUser);
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

    it('rejects amendment from a Manager tier (Duty Manager only)', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('manager');

      await expect(
        service.amendCancellationNote('std_123', 'show_123', { reason_note: 'Updated' }, 'admin', 'ext_7'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: 'NOTE_AMEND_REQUIRES_DUTY_MANAGER' }),
      });
    });

    it('calls amendPendingNote for a Duty Manager tier', async () => {
      showCancellationGateServiceMock.resolveActorTier.mockResolvedValue('duty_manager');

      await service.amendCancellationNote('std_123', 'show_123', { reason_note: 'Actually two cameras failed' }, 'member', 'ext_7');

      expect(showCancellationGateServiceMock.amendPendingNote).toHaveBeenCalledWith({
        showId: BigInt(100),
        gateKind: 'show_cancellation',
        reasonNote: 'Actually two cameras failed',
        actor: { id: BigInt(7), uid: 'user_def456', name: 'Bob Duty' },
      });
    });
  });
});
