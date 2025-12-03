/* eslint-disable  */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Prisma, Show } from '@prisma/client';

import { ShowService } from '@/models/show/show.service';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateShowWithAssignmentsDto,
  UpdateShowWithAssignmentsDto,
} from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

describe('showOrchestrationService', () => {
  let service: ShowOrchestrationService;
  let showService: jest.Mocked<ShowService>;
  let showMcService: jest.Mocked<ShowMcService>;
  let showPlatformService: jest.Mocked<ShowPlatformService>;
  let prismaService: jest.Mocked<PrismaService>;
  let mockTransactionClient: {
    show: {
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    showMC: {
      updateMany: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    showPlatform: {
      updateMany: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    mC: {
      findMany: jest.Mock;
    };
    platform: {
      findMany: jest.Mock;
    };
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

  beforeEach(async () => {
    // Create a mock transaction client
    mockTransactionClient = {
      show: {
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      showMC: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      showPlatform: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      mC: {
        findMany: jest.fn(),
      },
      platform: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowOrchestrationService,
        {
          provide: ShowService,
          useValue: {
            createShowFromDto: jest.fn(),
            createShow: jest.fn(),
            getShowById: jest.fn(),
            getActiveShows: jest.fn(),
            countShows: jest.fn(),
            updateShowFromDto: jest.fn(),
            deleteShow: jest.fn(),
            generateShowUid: jest.fn(),
          },
        },
        {
          provide: ShowMcService,
          useValue: {
            createShowMc: jest.fn(),
            generateShowMcUid: jest.fn(),
          },
        },
        {
          provide: ShowPlatformService,
          useValue: {
            createShowPlatform: jest.fn(),
            generateShowPlatformUid: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            executeTransaction: jest.fn(
               
              async (callback: any) => await callback(mockTransactionClient),
            ),
            mC: {
              findMany: jest.fn(),
            },
            platform: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ShowOrchestrationService>(ShowOrchestrationService);
    showService = module.get<ShowService>(
      ShowService,
    ) as jest.Mocked<ShowService>;
    showMcService = module.get<ShowMcService>(
      ShowMcService,
    ) as jest.Mocked<ShowMcService>;
    showPlatformService = module.get<ShowPlatformService>(
      ShowPlatformService,
    ) as jest.Mocked<ShowPlatformService>;
    prismaService = module.get<PrismaService>(
      PrismaService,
    ) as jest.Mocked<PrismaService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowWithAssignments', () => {
    it('should create a simple show without assignments', async () => {
      const dto: CreateShowWithAssignmentsDto = {
        clientId: 'client_test123',
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        name: 'Test Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        mcs: undefined,
        platforms: undefined,
      };

      showService.generateShowUid.mockReturnValue('show_test123');
      showService.createShow.mockResolvedValue(mockShow);

      const result = await service.createShowWithAssignments(dto);

      expect(showService.generateShowUid).toHaveBeenCalled();
      expect(showService.createShow).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_test123',
          name: 'Test Show',
          startTime: dto.startTime,
          endTime: dto.endTime,
          metadata: {},
          client: { connect: { uid: dto.clientId } },
          studioRoom: { connect: { uid: dto.studioRoomId } },
          showType: { connect: { uid: dto.showTypeId } },
          showStatus: { connect: { uid: dto.showStatusId } },
          showStandard: { connect: { uid: dto.showStandardId } },
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });

    it('should create a show with MC assignments', async () => {
      const dto: CreateShowWithAssignmentsDto = {
        clientId: 'client_test123',
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        name: 'Test Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        mcs: [
          {
            mcId: 'mc_test123',
            note: 'Test note',
            metadata: {},
          },
        ],
        platforms: undefined,
      };

      showService.generateShowUid.mockReturnValue('show_test123');
      showMcService.generateShowMcUid.mockReturnValue('show_mc_test123');
      showService.createShow.mockResolvedValue(mockShow);

      const result = await service.createShowWithAssignments(dto);

      expect(showService.generateShowUid).toHaveBeenCalled();
      expect(showMcService.generateShowMcUid).toHaveBeenCalled();
      expect(showService.createShow).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_test123',
          name: 'Test Show',
          showMCs: {
            create: [
              {
                uid: 'show_mc_test123',
                mc: { connect: { uid: 'mc_test123' } },
                note: 'Test note',
                metadata: {},
              },
            ],
          },
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });

    it('should create a show with platform assignments', async () => {
      const dto: CreateShowWithAssignmentsDto = {
        clientId: 'client_test123',
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        name: 'Test Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        mcs: undefined,
        platforms: [
          {
            platformId: 'plt_test123',
            liveStreamLink: 'https://example.com/stream',
            platformShowId: 'platform_show_123',
            viewerCount: 100,
            metadata: {},
          },
        ],
      };

      showService.generateShowUid.mockReturnValue('show_test123');
      showPlatformService.generateShowPlatformUid.mockReturnValue(
        'show_plt_test123',
      );
      showService.createShow.mockResolvedValue(mockShow);

      const result = await service.createShowWithAssignments(dto);

      expect(showService.generateShowUid).toHaveBeenCalled();
      expect(showPlatformService.generateShowPlatformUid).toHaveBeenCalled();
      expect(showService.createShow).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_test123',
          name: 'Test Show',
          showPlatforms: {
            create: [
              {
                uid: 'show_plt_test123',
                platform: { connect: { uid: 'plt_test123' } },
                liveStreamLink: 'https://example.com/stream',
                platformShowId: 'platform_show_123',
                viewerCount: 100,
                metadata: {},
              },
            ],
          },
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });

    it('should create a show with both MC and platform assignments', async () => {
      const dto: CreateShowWithAssignmentsDto = {
        clientId: 'client_test123',
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        name: 'Test Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        mcs: [
          {
            mcId: 'mc_test123',
            note: 'Test note',
            metadata: {},
          },
        ],
        platforms: [
          {
            platformId: 'plt_test123',
            liveStreamLink: 'https://example.com/stream',
            platformShowId: 'platform_show_123',
            viewerCount: 100,
            metadata: {},
          },
        ],
      };

      showService.generateShowUid.mockReturnValue('show_test123');
      showMcService.generateShowMcUid.mockReturnValue('show_mc_test123');
      showPlatformService.generateShowPlatformUid.mockReturnValue(
        'show_plt_test123',
      );
      showService.createShow.mockResolvedValue(mockShow);

      const result = await service.createShowWithAssignments(dto);

      expect(showService.generateShowUid).toHaveBeenCalled();
      expect(showMcService.generateShowMcUid).toHaveBeenCalled();
      expect(showPlatformService.generateShowPlatformUid).toHaveBeenCalled();
      expect(showService.createShow).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_test123',
          name: 'Test Show',
          showMCs: {
            create: [
              {
                uid: 'show_mc_test123',
                mc: { connect: { uid: 'mc_test123' } },
                note: 'Test note',
                metadata: {},
              },
            ],
          },
          showPlatforms: {
            create: [
              {
                uid: 'show_plt_test123',
                platform: { connect: { uid: 'plt_test123' } },
                liveStreamLink: 'https://example.com/stream',
                platformShowId: 'platform_show_123',
                viewerCount: 100,
                metadata: {},
              },
            ],
          },
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });
  });

  describe('getShowsWithRelations', () => {
    it('should retrieve shows with all relations', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' as const },
      };

      const mockShows: Show[] = [mockShow];
      showService.getActiveShows.mockResolvedValue(mockShows);

      const result = await service.getShowsWithRelations(params);

      expect(showService.getActiveShows).toHaveBeenCalledWith({
        ...params,
        include: expect.objectContaining({
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
           
          showMCs: expect.any(Object),
           
          showPlatforms: expect.any(Object),
        }) as Prisma.ShowInclude,
      });
      expect(result).toEqual(mockShows);
    });

    it('should retrieve shows with custom include', async () => {
      const params = {
        skip: 0,
        take: 10,
      };
      const customInclude = {
        client: true,
        studioRoom: true,
      };

      const mockShows: Show[] = [mockShow];
      showService.getActiveShows.mockResolvedValue(mockShows);

      const result = await service.getShowsWithRelations(params, customInclude);

      expect(showService.getActiveShows).toHaveBeenCalledWith({
        ...params,
        include: customInclude,
      });
      expect(result).toEqual(mockShows);
    });
  });

  describe('getShowWithRelations', () => {
    it('should retrieve a show with all relations', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);

      const result = await service.getShowWithRelations(uid);

      expect(showService.getShowById).toHaveBeenCalledWith(
        uid,
        expect.objectContaining({
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
           
          showMCs: expect.any(Object),
           
          showPlatforms: expect.any(Object),
        }) as Prisma.ShowInclude,
      );
      expect(result).toEqual(mockShow);
    });

    it('should retrieve a show with custom include', async () => {
      const uid = 'show_test123';
      const customInclude = {
        client: true,
        studioRoom: true,
      };
      showService.getShowById.mockResolvedValue(mockShow);

      const result = await service.getShowWithRelations(uid, customInclude);

      expect(showService.getShowById).toHaveBeenCalledWith(uid, customInclude);
      expect(result).toEqual(mockShow);
    });
  });

  describe('updateShowWithAssignments', () => {
    it('should update a show without assignments', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showMcs: undefined,
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.show.update.mockResolvedValue(mockShow);
      mockTransactionClient.show.findUniqueOrThrow.mockResolvedValue(mockShow);

      const result = await service.updateShowWithAssignments(uid, dto);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(prismaService.executeTransaction).toHaveBeenCalled();
      expect(mockTransactionClient.show.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockShow.id },
           
          data: expect.objectContaining({ name: 'Updated Show Name' }),
        }),
      );
      expect(mockTransactionClient.show.findUniqueOrThrow).toHaveBeenCalled();
      expect(result).toEqual(mockShow);
    });

    it('should update a show with custom include', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showMcs: undefined,
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;
      const customInclude = {
        client: true,
        studioRoom: true,
      };

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.show.update.mockResolvedValue(mockShow);
      mockTransactionClient.show.findUniqueOrThrow.mockResolvedValue(mockShow);

      const result = await service.updateShowWithAssignments(
        uid,
        dto,
        customInclude,
      );

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(prismaService.executeTransaction).toHaveBeenCalled();
      expect(mockTransactionClient.show.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockShow.id },
          include: customInclude,
        }),
      );
      expect(result).toEqual(mockShow);
    });

    it('should update a show with MC and platform assignments', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showMcs: [
          {
            mcId: 'mc_test123',
            note: 'Updated note',
            metadata: {},
          },
        ],
        showPlatforms: [
          {
            platformId: 'plt_test123',
            liveStreamLink: 'https://example.com/updated-stream',
            platformShowId: 'platform_show_updated',
            viewerCount: 200,
            metadata: {},
          },
        ],
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.show.update.mockResolvedValue(mockShow);
      mockTransactionClient.showMC.findMany.mockResolvedValue([]);
      mockTransactionClient.mC.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'mc_test123' },
      ]);
      mockTransactionClient.showPlatform.findMany.mockResolvedValue([]);
      mockTransactionClient.platform.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'plt_test123' },
      ]);
      mockTransactionClient.show.findUniqueOrThrow.mockResolvedValue(mockShow);

      const result = await service.updateShowWithAssignments(uid, dto);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(prismaService.executeTransaction).toHaveBeenCalled();
      expect(mockTransactionClient.showMC.findMany).toHaveBeenCalled();
      expect(mockTransactionClient.showPlatform.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockShow);
    });

    it('should throw BadRequestException when endTime is before or equal to startTime', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        startTime: new Date('2024-01-01T12:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'), // End time before start time
        showMcs: undefined,
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue(mockShow);

      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        'End time must be after start time',
      );
    });

    it('should throw NotFoundException when MC is not found in syncShowMCs', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showMcs: [
          {
            mcId: 'mc_notfound',
            note: 'Test note',
            metadata: {},
          },
        ],
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.showMC.findMany.mockResolvedValue([]);
      mockTransactionClient.mC.findMany.mockResolvedValue([]); // MC not found

      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        'MC not found with id mc_notfound',
      );
    });

    it('should throw NotFoundException when Platform is not found in syncShowPlatforms', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showMcs: undefined,
        showPlatforms: [
          {
            platformId: 'plt_notfound',
            liveStreamLink: 'https://example.com/stream',
            platformShowId: 'platform_show_123',
            viewerCount: 100,
            metadata: {},
          },
        ],
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.showPlatform.findMany.mockResolvedValue([]);
      mockTransactionClient.platform.findMany.mockResolvedValue([]); // Platform not found

      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        'Platform not found with id plt_notfound',
      );
    });
  });

  describe('replaceMCsForShow', () => {
    it('should replace all MCs for a show', async () => {
      const uid = 'show_test123';
      const mcs = [
        {
          mcId: 'mc_test123',
          note: 'Test note',
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.showMC.updateMany.mockResolvedValue({ count: 0 });
      mockTransactionClient.mC.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'mc_test123' },
      ]);
      showMcService.generateShowMcUid.mockReturnValue('show_mc_test123');
      mockTransactionClient.showMC.create.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_mc_test123',
        showId: mockShow.id,
        mcId: BigInt(1),
        note: 'Test note',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      mockTransactionClient.show.findUniqueOrThrow.mockResolvedValue(mockShow);

      const result = await service.replaceMCsForShow(uid, mcs);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(mockTransactionClient.showMC.updateMany).toHaveBeenCalled();
      expect(mockTransactionClient.mC.findMany).toHaveBeenCalled();
      expect(mockTransactionClient.showMC.create).toHaveBeenCalled();
      expect(result).toEqual(mockShow);
    });

    it('should throw NotFoundException when MC is not found', async () => {
      const uid = 'show_test123';
      const mcs = [
        {
          mcId: 'mc_notfound',
          note: 'Test note',
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.showMC.updateMany.mockResolvedValue({ count: 0 });
      mockTransactionClient.mC.findMany.mockResolvedValue([]); // MC not found

      await expect(service.replaceMCsForShow(uid, mcs)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.replaceMCsForShow(uid, mcs)).rejects.toThrow(
        'MC not found with id mc_notfound',
      );
    });
  });

  describe('replacePlatformsForShow', () => {
    it('should replace all platforms for a show', async () => {
      const uid = 'show_test123';
      const platforms = [
        {
          platformId: 'plt_test123',
          liveStreamLink: 'https://example.com/stream',
          platformShowId: 'platform_show_123',
          viewerCount: 100,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.showPlatform.updateMany.mockResolvedValue({
        count: 0,
      });
      mockTransactionClient.platform.findMany.mockResolvedValue([
        { id: BigInt(1), uid: 'plt_test123' },
      ]);
      showPlatformService.generateShowPlatformUid.mockReturnValue(
        'show_plt_test123',
      );
      mockTransactionClient.showPlatform.create.mockResolvedValue({
        id: BigInt(1),
        uid: 'show_plt_test123',
        showId: mockShow.id,
        platformId: BigInt(1),
        liveStreamLink: 'https://example.com/stream',
        platformShowId: 'platform_show_123',
        viewerCount: 100,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      mockTransactionClient.show.findUniqueOrThrow.mockResolvedValue(mockShow);

      const result = await service.replacePlatformsForShow(uid, platforms);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(mockTransactionClient.showPlatform.updateMany).toHaveBeenCalled();
      expect(mockTransactionClient.platform.findMany).toHaveBeenCalled();
      expect(mockTransactionClient.showPlatform.create).toHaveBeenCalled();
      expect(result).toEqual(mockShow);
    });

    it('should throw NotFoundException when Platform is not found', async () => {
      const uid = 'show_test123';
      const platforms = [
        {
          platformId: 'plt_notfound',
          liveStreamLink: 'https://example.com/stream',
          platformShowId: 'platform_show_123',
          viewerCount: 100,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      mockTransactionClient.showPlatform.updateMany.mockResolvedValue({
        count: 0,
      });
      mockTransactionClient.platform.findMany.mockResolvedValue([]); // Platform not found

      await expect(
        service.replacePlatformsForShow(uid, platforms),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.replacePlatformsForShow(uid, platforms),
      ).rejects.toThrow('Platform not found with id plt_notfound');
    });
  });
});
