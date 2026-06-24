import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { StudioShowManagementService } from './studio-show-management.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { PlatformRepository } from '@/models/platform/platform.repository';
import { ScheduleService } from '@/models/schedule/schedule.service';
import type { UpdateStudioShowDto } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
import { TaskService } from '@/models/task/task.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { ShowStateGateService } from '@/show-orchestration/show-state-gate.service';

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
  const showStateGateServiceMock = {
    openGate: jest.fn(),
    resolveGate: jest.fn(),
  };
  const taskServiceMock = {
    findOpenStateGateForShow: jest.fn(),
  };
  const studioMembershipServiceMock = {
    findStudioMemberByUidAndStudio: jest.fn(),
  };
  const userServiceMock = {
    getUserByExtId: jest.fn(),
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
        { provide: ShowStateGateService, useValue: showStateGateServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: StudioMembershipService, useValue: studioMembershipServiceMock },
        { provide: UserService, useValue: userServiceMock },
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
    it('resolves the owner membership to a User, opens a show_cancellation gate, and returns the updated show', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
        studioId: 100n,
        showStatus: { systemKey: 'LIVE' },
      });
      studioMembershipServiceMock.findStudioMemberByUidAndStudio.mockResolvedValue({
        userId: 5n,
        user: { uid: 'user_owner', name: 'Jane' },
      });
      userServiceMock.getUserByExtId.mockResolvedValue({
        id: 1n,
        uid: 'user_caller',
      });
      showStateGateServiceMock.openGate.mockResolvedValue({ uid: 'task_gate1' });
      showServiceMock.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' });

      await service.cancelShowWithResolution(
        'studio_1',
        'show_abc',
        {
          reasonCategory: 'ROOM_UNAVAILABLE',
          reasonNote: 'Flooding',
          resolutionOwnerMembershipId: 'stdmem_1',
          followUpDueAt: null,
          followUpNotes: null,
        } as any,
        'ext_caller_1',
      );

      expect(showStateGateServiceMock.openGate).toHaveBeenCalledWith(
        10n,
        'show_cancellation',
        {
          owner: { id: 5n, uid: 'user_owner' },
          fromStatusSystemKey: 'LIVE',
          dueDate: null,
          content: {
            reason_category: 'ROOM_UNAVAILABLE',
            reason_note: 'Flooding',
            follow_up_notes: null,
          },
          createdBy: { id: 1n, uid: 'user_caller' },
          studioId: 100n,
        },
      );
    });

    it('throws SHOW_CANCELLATION_NOT_ALLOWED for a DRAFT show', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        showStatus: { systemKey: 'DRAFT' },
      });

      await expect(
        service.cancelShowWithResolution(
          'studio_1',
          'show_abc',
          {} as any,
          'ext_caller_1',
        ),
      ).rejects.toThrow('SHOW_CANCELLATION_NOT_ALLOWED');
      expect(showStateGateServiceMock.openGate).not.toHaveBeenCalled();
    });

    it('throws SHOW_CANCELLATION_NOT_ALLOWED for a COMPLETED show', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        showStatus: { systemKey: 'COMPLETED' },
      });

      await expect(
        service.cancelShowWithResolution(
          'studio_1',
          'show_abc',
          {} as any,
          'ext_caller_1',
        ),
      ).rejects.toThrow('SHOW_CANCELLATION_NOT_ALLOWED');
      expect(showStateGateServiceMock.openGate).not.toHaveBeenCalled();
    });

    it('throws RESOLUTION_OWNER_NOT_FOUND when the membership does not resolve', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        showStatus: { systemKey: 'LIVE' },
      });
      studioMembershipServiceMock.findStudioMemberByUidAndStudio.mockResolvedValue(null);

      await expect(
        service.cancelShowWithResolution(
          'studio_1',
          'show_abc',
          { resolutionOwnerMembershipId: 'stdmem_missing' } as any,
          'ext_caller_1',
        ),
      ).rejects.toThrow('RESOLUTION_OWNER_NOT_FOUND');
    });

    it('throws ACTOR_NOT_FOUND when the caller cannot be resolved, instead of misattributing the action', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
        studioId: 100n,
        showStatus: { systemKey: 'LIVE' },
      });
      studioMembershipServiceMock.findStudioMemberByUidAndStudio.mockResolvedValue({
        userId: 5n,
        user: { uid: 'user_owner', name: 'Jane' },
      });
      userServiceMock.getUserByExtId.mockResolvedValue(null);

      await expect(
        service.cancelShowWithResolution(
          'studio_1',
          'show_abc',
          {
            reasonCategory: 'ROOM_UNAVAILABLE',
            reasonNote: 'Flooding',
            resolutionOwnerMembershipId: 'stdmem_1',
            followUpDueAt: null,
            followUpNotes: null,
          } as any,
          'ext_unresolvable',
        ),
      ).rejects.toThrow('ACTOR_NOT_FOUND');
      expect(showStateGateServiceMock.openGate).not.toHaveBeenCalled();
    });
  });

  describe('resolveShowCancellation', () => {
    it('finds the open gate task and calls resolveGate with the actor', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });
      userServiceMock.getUserByExtId.mockResolvedValue({
        id: 1n,
        uid: 'user_caller',
      });
      taskServiceMock.findOpenStateGateForShow.mockResolvedValue({
        uid: 'task_gate1',
      });
      showStateGateServiceMock.resolveGate.mockResolvedValue({ uid: 'task_gate1' });
      showServiceMock.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' });

      await service.resolveShowCancellation(
        'studio_1',
        'show_abc',
        { outcome: 'CANCELLED', resolutionNotes: 'Confirmed' } as any,
        'ext_caller_1',
      );

      expect(showStateGateServiceMock.resolveGate).toHaveBeenCalledWith(
        'task_gate1',
        'CANCELLED',
        'Confirmed',
        { id: 1n, uid: 'user_caller' },
      );
    });

    it('throws SHOW_CANCELLATION_NOT_PENDING when the show is not currently pending resolution', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        showStatus: { systemKey: 'LIVE' },
      });

      await expect(
        service.resolveShowCancellation(
          'studio_1',
          'show_abc',
          {} as any,
          'ext_caller_1',
        ),
      ).rejects.toThrow('SHOW_CANCELLATION_NOT_PENDING');
    });

    it('sets schedule_resume_notice when resolving a schedule_publish_removal gate to RESTORE_PREVIOUS', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
        metadata: {},
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });
      userServiceMock.getUserByExtId.mockResolvedValue({
        id: 1n,
        uid: 'user_caller',
      });
      taskServiceMock.findOpenStateGateForShow.mockResolvedValue({
        uid: 'task_gate2',
        metadata: { gate_kind: 'schedule_publish_removal' },
      });
      showStateGateServiceMock.resolveGate.mockResolvedValue({ uid: 'task_gate2' });
      showServiceMock.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' });

      await service.resolveShowCancellation(
        'studio_1',
        'show_abc',
        {
          outcome: 'RESTORE_PREVIOUS',
          resolutionNotes: 'Schedule sync was wrong',
        } as any,
        'ext_caller_1',
      );

      expect(showRepositoryMock.update).toHaveBeenCalledWith(
        { id: 10n },
        {
          metadata: expect.objectContaining({
            schedule_resume_notice: expect.objectContaining({
              resumed_by: 'user_caller',
              gate_task_uid: 'task_gate2',
            }),
          }),
        },
      );
    });

    it('does not set schedule_resume_notice for a show_cancellation gate resolved to CANCELLED', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
        metadata: {},
        showStatus: { systemKey: 'CANCELLED_PENDING_RESOLUTION' },
      });
      userServiceMock.getUserByExtId.mockResolvedValue({
        id: 1n,
        uid: 'user_caller',
      });
      taskServiceMock.findOpenStateGateForShow.mockResolvedValue({
        uid: 'task_gate1',
        metadata: { gate_kind: 'show_cancellation' },
      });
      showStateGateServiceMock.resolveGate.mockResolvedValue({ uid: 'task_gate1' });
      showServiceMock.getShowById.mockResolvedValue({ id: 10n, uid: 'show_abc' });

      await service.resolveShowCancellation(
        'studio_1',
        'show_abc',
        { outcome: 'CANCELLED', resolutionNotes: 'Confirmed' } as any,
        'ext_caller_1',
      );

      expect(showRepositoryMock.update).not.toHaveBeenCalled();
    });
  });

  describe('getOpenStateGateForShow', () => {
    it('returns allowedOutcomes for a known gate_kind', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
      });
      taskServiceMock.findOpenStateGateForShow.mockResolvedValue({
        uid: 'task_gate1',
        metadata: { gate_kind: 'show_cancellation', from_status: 'LIVE' },
        content: {},
        createdAt: new Date('2026-06-23T00:00:00.000Z'),
        updatedAt: new Date('2026-06-23T00:00:00.000Z'),
      });

      const result = await service.getOpenStateGateForShow('studio_1', 'show_abc');

      expect(result?.allowed_outcomes).toEqual(['CANCELLED', 'COMPLETED']);
    });

    it('degrades gracefully (empty allowedOutcomes) for an unrecognized gate_kind instead of throwing', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
      });
      taskServiceMock.findOpenStateGateForShow.mockResolvedValue({
        uid: 'task_gate1',
        metadata: { gate_kind: 'a_kind_removed_from_config', from_status: 'LIVE' },
        content: {},
        createdAt: new Date('2026-06-23T00:00:00.000Z'),
        updatedAt: new Date('2026-06-23T00:00:00.000Z'),
      });

      const result = await service.getOpenStateGateForShow('studio_1', 'show_abc');

      expect(result?.allowed_outcomes).toEqual([]);
    });

    it('returns null when there is no open gate for the show', async () => {
      showRepositoryMock.findByUidAndStudioUid.mockResolvedValue({
        id: 10n,
        uid: 'show_abc',
      });
      taskServiceMock.findOpenStateGateForShow.mockResolvedValue(null);

      const result = await service.getOpenStateGateForShow('studio_1', 'show_abc');

      expect(result).toBeNull();
    });
  });
});
