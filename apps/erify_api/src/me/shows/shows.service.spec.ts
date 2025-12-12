import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { MC, Prisma, Show } from '@prisma/client';

import { ShowsService } from './shows.service';

import { McService } from '@/models/mc/mc.service';
import { ShowService } from '@/models/show/show.service';

describe('showsService', () => {
  let service: ShowsService;

  const mockUser = {
    id: BigInt(1),
    uid: 'user_test123',
    extId: 'ext_test123',
    email: 'test@example.com',
    name: 'Test User',
    isBanned: false,
    profileUrl: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMc: MC = {
    id: BigInt(1),
    uid: 'mc_test123',
    name: 'Test MC',
    aliasName: 'Test MC Alias',
    isBanned: false,
    metadata: {},
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockShow: Show = {
    id: BigInt(1),
    uid: 'show_test123',
    clientId: BigInt(1),
    studioRoomId: BigInt(1),
    showTypeId: BigInt(1),
    showStatusId: BigInt(1),
    showStandardId: BigInt(1),
    scheduleId: null,
    name: 'Test Show',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T12:00:00Z'),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockShowWithRelations = {
    ...mockShow,
    client: {
      id: BigInt(1),
      uid: 'client_test123',
      name: 'Test Client',
      contactPerson: 'John Doe',
      contactEmail: 'john@example.com',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    studioRoom: {
      id: BigInt(1),
      uid: 'srm_test123',
      name: 'Test Room',
      studioId: BigInt(1),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showType: {
      id: BigInt(1),
      uid: 'sht_test123',
      name: 'Test Type',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showStatus: {
      id: BigInt(1),
      uid: 'shst_test123',
      name: 'Test Status',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showStandard: {
      id: BigInt(1),
      uid: 'shsd_test123',
      name: 'Test Standard',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    showPlatforms: [],
  };

  const mockMcService = {
    getMcs: jest.fn() as jest.MockedFunction<McService['getMcs']>,
  } as jest.Mocked<Pick<McService, 'getMcs'>>;

  const mockShowService = {
    getShows: jest.fn() as jest.MockedFunction<ShowService['getShows']>,
    countShows: jest.fn() as jest.MockedFunction<ShowService['countShows']>,
  } as jest.Mocked<Pick<ShowService, 'getShows' | 'countShows'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowsService,
        {
          provide: McService,
          useValue: mockMcService,
        },
        {
          provide: ShowService,
          useValue: mockShowService,
        },
      ],
    }).compile();

    service = module.get<ShowsService>(ShowsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getShowsForMcUser', () => {
    it('should return shows assigned to MC user by uid', async () => {
      const userIdentifier = 'user_test123';
      const params = {
        skip: 0,
        take: 10,
        order_by: 'start_time',
        order_direction: 'asc' as const,
      };

      mockMcService.getMcs.mockResolvedValue([mockMc]);
      mockShowService.getShows.mockResolvedValue([mockShowWithRelations]);
      mockShowService.countShows.mockResolvedValue(1);

      const result = await service.getShowsForMcUser(userIdentifier, params);

      expect(mockMcService.getMcs).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          user: {
            OR: [{ uid: userIdentifier }, { extId: userIdentifier }],
            deletedAt: null,
          },
        },
        take: 1,
      });
      const expectedInclude: Prisma.ShowInclude = {
        client: true,
        studioRoom: true,
        showType: true,
        showStatus: true,
        showStandard: true,
        showPlatforms: {
          include: {
            platform: true,
          },
          where: {
            deletedAt: null,
          },
        },
      };

      expect(mockShowService.getShows).toHaveBeenCalledWith(
        {
          where: {
            deletedAt: null,
            showMCs: {
              some: {
                mcId: mockMc.id,
                deletedAt: null,
              },
            },
          },
          skip: params.skip,
          take: params.take,
          orderBy: { startTime: 'asc' },
        },
        expectedInclude,
      );
      expect(mockShowService.countShows).toHaveBeenCalledWith({
        deletedAt: null,
        showMCs: {
          some: {
            mcId: mockMc.id,
            deletedAt: null,
          },
        },
      });
      expect(result).toEqual({
        shows: [mockShowWithRelations],
        total: 1,
      });
    });

    it('should return shows assigned to MC user by extId', async () => {
      const userIdentifier = 'ext_test123';
      const params = {
        skip: 0,
        take: 10,
      };

      mockMcService.getMcs.mockResolvedValue([mockMc]);
      mockShowService.getShows.mockResolvedValue([mockShowWithRelations]);
      mockShowService.countShows.mockResolvedValue(1);

      const result = await service.getShowsForMcUser(userIdentifier, params);

      expect(mockMcService.getMcs).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          user: {
            OR: [{ uid: userIdentifier }, { extId: userIdentifier }],
            deletedAt: null,
          },
        },
        take: 1,
      });
      expect(result).toEqual({
        shows: [mockShowWithRelations],
        total: 1,
      });
    });

    it('should use default orderBy when not provided', async () => {
      const userIdentifier = 'user_test123';
      const params = {
        skip: 0,
        take: 10,
      };

      mockMcService.getMcs.mockResolvedValue([mockMc]);
      mockShowService.getShows.mockResolvedValue([mockShowWithRelations]);
      mockShowService.countShows.mockResolvedValue(1);

      await service.getShowsForMcUser(userIdentifier, params);

      expect(mockShowService.getShows).toHaveBeenCalled();
      const callArgs = mockShowService.getShows.mock.calls[0] as [
        { orderBy: { startTime: string } },
        Prisma.ShowInclude,
      ];
      expect(callArgs[0].orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should handle pagination correctly', async () => {
      const userIdentifier = 'user_test123';
      const params = {
        skip: 10,
        take: 20,
        order_by: 'start_time',
        order_direction: 'desc' as const,
      };

      mockMcService.getMcs.mockResolvedValue([mockMc]);
      mockShowService.getShows.mockResolvedValue([]);
      mockShowService.countShows.mockResolvedValue(0);

      const result = await service.getShowsForMcUser(userIdentifier, params);

      expect(mockShowService.getShows).toHaveBeenCalled();
      const callArgs = mockShowService.getShows.mock.calls[0] as [
        {
          skip: number;
          take: number;
          orderBy: { startTime: string };
        },
        Prisma.ShowInclude,
      ];
      expect(callArgs[0].skip).toBe(10);
      expect(callArgs[0].take).toBe(20);
      expect(callArgs[0].orderBy).toEqual({ startTime: 'desc' });
      expect(result).toEqual({
        shows: [],
        total: 0,
      });
    });

    it('should throw NotFoundException when MC is not found', async () => {
      const userIdentifier = 'user_notfound';

      mockMcService.getMcs.mockResolvedValue([]);

      await expect(service.getShowsForMcUser(userIdentifier)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getShowsForMcUser(userIdentifier)).rejects.toThrow(
        'MC not found with id for user user_notfound',
      );
    });
  });

  describe('getShowForMcUser', () => {
    it('should return a specific show assigned to MC user', async () => {
      const userIdentifier = 'user_test123';
      const showId = 'show_test123';

      mockMcService.getMcs.mockResolvedValue([mockMc]);
      mockShowService.getShows.mockResolvedValue([mockShowWithRelations]);

      const result = await service.getShowForMcUser(userIdentifier, showId);

      expect(mockMcService.getMcs).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          user: {
            OR: [{ uid: userIdentifier }, { extId: userIdentifier }],
            deletedAt: null,
          },
        },
        take: 1,
      });
      const expectedInclude: Prisma.ShowInclude = {
        client: true,
        studioRoom: true,
        showType: true,
        showStatus: true,
        showStandard: true,
        showPlatforms: {
          include: {
            platform: true,
          },
          where: {
            deletedAt: null,
          },
        },
      };

      expect(mockShowService.getShows).toHaveBeenCalledWith(
        {
          where: {
            deletedAt: null,
            uid: showId,
            showMCs: {
              some: {
                mcId: mockMc.id,
                deletedAt: null,
              },
            },
          },
          take: 1,
        },
        expectedInclude,
      );
      expect(result).toEqual(mockShowWithRelations);
    });

    it('should throw NotFoundException when show is not found', async () => {
      const userIdentifier = 'user_test123';
      const showId = 'show_notfound';

      mockMcService.getMcs.mockResolvedValue([mockMc]);
      mockShowService.getShows.mockResolvedValue([]);

      await expect(
        service.getShowForMcUser(userIdentifier, showId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getShowForMcUser(userIdentifier, showId),
      ).rejects.toThrow('Show not found with id show_notfound');
    });

    it('should throw NotFoundException when show is not assigned to MC', async () => {
      const userIdentifier = 'user_test123';
      const showId = 'show_test123';

      mockMcService.getMcs.mockResolvedValue([mockMc]);
      // Show exists but not assigned to this MC (empty result due to showMCs filter)
      mockShowService.getShows.mockResolvedValue([]);

      await expect(
        service.getShowForMcUser(userIdentifier, showId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when MC is not found', async () => {
      const userIdentifier = 'user_notfound';
      const showId = 'show_test123';

      mockMcService.getMcs.mockResolvedValue([]);

      await expect(
        service.getShowForMcUser(userIdentifier, showId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getShowForMcUser(userIdentifier, showId),
      ).rejects.toThrow('MC not found with id for user user_notfound');
    });
  });
});
