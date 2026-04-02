import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioShowManagementService } from './studio-show-management.service';

import { PlatformRepository } from '@/models/platform/platform.repository';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

describe('studioShowManagementService', () => {
  let service: StudioShowManagementService;

  const studioServiceMock = {
    getStudioById: jest.fn(),
  };
  const studioRoomServiceMock = {
    findOne: jest.fn(),
  };
  const showServiceMock = {
    createShow: jest.fn(),
    getShowById: jest.fn(),
  };
  const showRepositoryMock = {
    findByClientUidAndExternalId: jest.fn(),
    update: jest.fn(),
  };
  const platformRepositoryMock = {
    findByUids: jest.fn(),
  };
  const showPlatformRepositoryMock = {
    findMany: jest.fn(),
    createAssignment: jest.fn(),
    restoreAndUpdateAssignment: jest.fn(),
    softDelete: jest.fn(),
  };
  const showPlatformServiceMock = {
    generateShowPlatformUid: jest.fn(),
  };
  const showOrchestrationServiceMock = {
    deleteShow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioShowManagementService,
        { provide: StudioService, useValue: studioServiceMock },
        { provide: StudioRoomService, useValue: studioRoomServiceMock },
        { provide: ShowService, useValue: showServiceMock },
        { provide: ShowRepository, useValue: showRepositoryMock },
        { provide: PlatformRepository, useValue: platformRepositoryMock },
        { provide: ShowPlatformRepository, useValue: showPlatformRepositoryMock },
        { provide: ShowPlatformService, useValue: showPlatformServiceMock },
        { provide: ShowOrchestrationService, useValue: showOrchestrationServiceMock },
      ],
    }).compile();

    service = module.get(StudioShowManagementService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    studioServiceMock.getStudioById.mockResolvedValue({ id: BigInt(10), uid: 'std_123' });
    studioRoomServiceMock.findOne.mockResolvedValue({ id: BigInt(20), uid: 'srm_1' });
    showPlatformRepositoryMock.findMany.mockResolvedValue([]);
    platformRepositoryMock.findByUids.mockResolvedValue([
      { id: BigInt(30), uid: 'plt_1' },
    ]);
    showPlatformServiceMock.generateShowPlatformUid.mockReturnValue('shp_1');
    showServiceMock.getShowById.mockResolvedValue({
      id: BigInt(100),
      uid: 'show_123',
      studioId: BigInt(10),
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
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: 'srm_1',
      name: 'Studio Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      metadata: {},
      platformIds: ['plt_1'],
    });

    expect(showServiceMock.createShow).toHaveBeenCalled();
    expect(showPlatformRepositoryMock.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'shp_1',
        showId: BigInt(100),
        platformId: BigInt(30),
      }),
    );
  });

  it('restores a soft-deleted show when external_id matches', async () => {
    showRepositoryMock.findByClientUidAndExternalId.mockResolvedValue({
      id: BigInt(55),
      uid: 'show_deleted',
      deletedAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    showRepositoryMock.update.mockResolvedValue({ id: BigInt(55), uid: 'show_deleted' });

    await service.createShow('std_123', {
      externalId: 'ext_1',
      clientId: 'cli_1',
      showTypeId: 'sht_1',
      showStatusId: 'shs_1',
      showStandardId: 'shn_1',
      studioRoomId: null,
      name: 'Restored Show',
      startTime: new Date('2026-04-02T10:00:00.000Z'),
      endTime: new Date('2026-04-02T12:00:00.000Z'),
      metadata: {},
      platformIds: [],
    });

    expect(showRepositoryMock.update).toHaveBeenCalledWith(
      { id: BigInt(55) },
      expect.objectContaining({
        deletedAt: null,
        externalId: 'ext_1',
      }),
    );
  });

  it('rejects update when a partial time change would invert the range', async () => {
    await expect(service.updateShow('std_123', 'show_123', {
      startTime: new Date('2026-04-02T13:00:00.000Z'),
    })).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'End time must be after start time',
      }),
    });
  });

  it('rejects delete after the show start time', async () => {
    showServiceMock.getShowById.mockResolvedValue({
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
});
