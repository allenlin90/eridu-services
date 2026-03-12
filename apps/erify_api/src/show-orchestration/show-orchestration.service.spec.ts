/* eslint-disable */
import { BadRequestException, Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Show } from '@prisma/client';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { CreatorRepository } from '@/models/creator/creator.repository';
import { PlatformRepository } from '@/models/platform/platform.repository';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformRepository } from '@/models/show-platform/show-platform.repository';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateShowWithAssignmentsDto,
  UpdateShowWithAssignmentsDto,
} from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

// Mock PrismaService module for ClsPluginTransactional (must be exported from a @Module to satisfy useExisting)
const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: any) => await callback({})),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('showOrchestrationService', () => {
  let service: ShowOrchestrationService;
  let showService: jest.Mocked<ShowService>;
  let showCreatorService: jest.Mocked<ShowCreatorService>;
  let showPlatformService: jest.Mocked<ShowPlatformService>;
  let showRepository: jest.Mocked<ShowRepository>;
  let showCreatorRepository: jest.Mocked<ShowCreatorRepository>;
  let creatorRepository: jest.Mocked<CreatorRepository>;
  let showPlatformRepository: jest.Mocked<ShowPlatformRepository>;
  let platformRepository: jest.Mocked<PlatformRepository>;

  const mockShow: Show = {
    id: BigInt(1),
    uid: 'show_test123',
    externalId: null,
    clientId: BigInt(1),
    studioId: null,
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
        ShowOrchestrationService,
        {
          provide: ShowService,
          useValue: {
            createShowFromDto: jest.fn(),
            createShow: jest.fn(),
            getShowById: jest.fn(),
            getActiveShows: jest.fn(),
            countShows: jest.fn(),
            getPaginatedShows: jest.fn(),
            updateShowFromDto: jest.fn(),
            deleteShow: jest.fn(),
            generateShowUid: jest.fn(),
            buildUpdatePayload: jest.fn(),
          },
        },
        {
          provide: ShowCreatorService,
          useValue: {
            generateShowCreatorUid: jest.fn(),
          },
        },
        {
          provide: ShowPlatformService,
          useValue: {
            generateShowPlatformUid: jest.fn(),
          },
        },
        {
          provide: ShowRepository,
          useValue: {
            update: jest.fn(),
            findByUid: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: ShowCreatorRepository,
          useValue: {
            findMany: jest.fn(),
            createAssignment: jest.fn(),
            restoreAndUpdateAssignment: jest.fn(),
            softDelete: jest.fn(),
            softDeleteAllByShowId: jest.fn(),
            softDeleteByCreatorIds: jest.fn(),
          },
        },
        {
          provide: CreatorRepository,
          useValue: {
            findByUids: jest.fn(),
          },
        },
        {
          provide: ShowPlatformRepository,
          useValue: {
            findMany: jest.fn(),
            createAssignment: jest.fn(),
            restoreAndUpdateAssignment: jest.fn(),
            softDelete: jest.fn(),
            softDeleteAllByShowId: jest.fn(),
            softDeleteByPlatformIds: jest.fn(),
          },
        },
        {
          provide: PlatformRepository,
          useValue: {
            findByUids: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShowOrchestrationService>(ShowOrchestrationService);
    showService = module.get<ShowService>(ShowService) as jest.Mocked<ShowService>;
    showCreatorService = module.get<ShowCreatorService>(ShowCreatorService) as jest.Mocked<ShowCreatorService>;
    showPlatformService = module.get<ShowPlatformService>(ShowPlatformService) as jest.Mocked<ShowPlatformService>;
    showRepository = module.get<ShowRepository>(ShowRepository) as jest.Mocked<ShowRepository>;
    showCreatorRepository = module.get<ShowCreatorRepository>(ShowCreatorRepository) as jest.Mocked<ShowCreatorRepository>;
    creatorRepository = module.get<CreatorRepository>(CreatorRepository) as jest.Mocked<CreatorRepository>;
    showPlatformRepository = module.get<ShowPlatformRepository>(ShowPlatformRepository) as jest.Mocked<ShowPlatformRepository>;
    platformRepository = module.get<PlatformRepository>(PlatformRepository) as jest.Mocked<PlatformRepository>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowWithAssignments', () => {
    it('should create a simple show without assignments', async () => {
      const dto: CreateShowWithAssignmentsDto = {
        clientId: 'client_test123',
        studioId: undefined,
        studioRoomId: 'room_test123',
        showTypeId: 'sht_test123',
        showStatusId: 'shst_test123',
        showStandardId: 'shsd_test123',
        name: 'Test Show',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        creators: undefined,
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
          showCreators: expect.any(Object),
          showPlatforms: expect.any(Object),
        }),
      });
      expect(result).toEqual(mockShows);
    });
  });

  describe('updateShowWithAssignments', () => {
    it('should update a show without assignments', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showCreators: undefined,
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;

      const updatePayload = { name: 'Updated Show Name' };
      showService.getShowById.mockResolvedValue(mockShow);
      showService.buildUpdatePayload.mockReturnValue(updatePayload);
      showRepository.update.mockResolvedValue(mockShow);
      showRepository.findByUid.mockResolvedValue(mockShow);

      const result = await service.updateShowWithAssignments(uid, dto);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(showRepository.update).toHaveBeenCalledWith(
        { uid },
        updatePayload,
      );
      // Sync methods NOT called since showCreators/showPlatforms are undefined
      expect(creatorRepository.findByUids).not.toHaveBeenCalled();
      expect(platformRepository.findByUids).not.toHaveBeenCalled();
      expect(showRepository.findByUid).toHaveBeenCalledWith(
        uid,
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });

    it('should update a show with Creator and platform assignments', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        name: 'Updated Show Name',
        showCreators: [
          {
            creatorId: 'creator_test123',
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

      const mockMc = { id: BigInt(1), uid: 'creator_test123', deletedAt: null };
      const mockPlatform = { id: BigInt(1), uid: 'plt_test123', deletedAt: null };
      const updatePayload = { name: 'Updated Show Name' };

      showService.getShowById.mockResolvedValue(mockShow);
      showService.buildUpdatePayload.mockReturnValue(updatePayload);
      showRepository.update.mockResolvedValue(mockShow);
      showRepository.findByUid.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([mockMc] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new');
      platformRepository.findByUids.mockResolvedValue([mockPlatform] as any);
      showPlatformRepository.findMany.mockResolvedValue([]);
      showPlatformRepository.createAssignment.mockResolvedValue({} as any);
      showPlatformService.generateShowPlatformUid.mockReturnValue('show_plt_new');

      const result = await service.updateShowWithAssignments(uid, dto);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(showRepository.update).toHaveBeenCalledWith(
        { uid },
        updatePayload,
      );
      expect(creatorRepository.findByUids).toHaveBeenCalledWith(['creator_test123']);
      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_new',
          showId: mockShow.id,
          creatorId: BigInt(1),
          note: 'Updated note',
          metadata: {},
        }),
      );
      expect(platformRepository.findByUids).toHaveBeenCalledWith(['plt_test123']);
      expect(showPlatformRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_plt_new',
          showId: mockShow.id,
          platformId: BigInt(1),
        }),
      );
      expect(result).toEqual(mockShow);
    });

    it('should throw BadRequestException when endTime is before or equal to startTime', async () => {
      const uid = 'show_test123';
      const dto: UpdateShowWithAssignmentsDto = {
        startTime: new Date('2024-01-01T12:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        showCreators: undefined,
        showPlatforms: undefined,
      } as UpdateShowWithAssignmentsDto;

      showService.getShowById.mockResolvedValue(mockShow);
      showService.buildUpdatePayload.mockImplementation(() => {
        throw new BadRequestException('End time must be after start time');
      });

      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateShowWithAssignments(uid, dto)).rejects.toThrow(
        'End time must be after start time',
      );
    });
  });

  describe('deleteShow', () => {
    it('should soft-delete show and assignments', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);
      showRepository.softDelete.mockResolvedValue(mockShow);
      showCreatorRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);
      showPlatformRepository.softDeleteAllByShowId.mockResolvedValue(undefined as any);

      await service.deleteShow(uid);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(showRepository.softDelete).toHaveBeenCalledWith({ uid });
      expect(showCreatorRepository.softDeleteAllByShowId).toHaveBeenCalledWith(mockShow.id);
      expect(showPlatformRepository.softDeleteAllByShowId).toHaveBeenCalledWith(mockShow.id);
    });
  });

  describe('removePlatformsFromShow', () => {
    it('should remove platforms from show', async () => {
      const uid = 'show_test123';
      const platformIds = ['plt_1', 'plt_2'];
      const mockPlt1 = { id: BigInt(1), uid: 'plt_1' };
      const mockPlt2 = { id: BigInt(2), uid: 'plt_2' };

      showService.getShowById.mockResolvedValue(mockShow);
      platformRepository.findByUids.mockResolvedValue([mockPlt1, mockPlt2] as any);
      showPlatformRepository.softDeleteByPlatformIds.mockResolvedValue(undefined as any);

      await service.removePlatformsFromShow(uid, platformIds);

      expect(platformRepository.findByUids).toHaveBeenCalledWith(platformIds);
      expect(showPlatformRepository.softDeleteByPlatformIds).toHaveBeenCalledWith(
        mockShow.id,
        [BigInt(1), BigInt(2)],
      );
    });
  });

  describe('removeCreatorsFromShow', () => {
    it('should remove creators from show', async () => {
      const uid = 'show_test123';
      const creatorIds = ['creator_1', 'creator_2'];
      const mockCreator1 = { id: BigInt(1), uid: 'creator_1' };
      const mockCreator2 = { id: BigInt(2), uid: 'creator_2' };

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([mockCreator1, mockCreator2] as any);
      showCreatorRepository.softDeleteByCreatorIds.mockResolvedValue(undefined as any);

      await service.removeCreatorsFromShow(uid, creatorIds);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(creatorRepository.findByUids).toHaveBeenCalledWith(creatorIds);
      expect(showCreatorRepository.softDeleteByCreatorIds).toHaveBeenCalledWith(
        mockShow.id,
        [BigInt(1), BigInt(2)],
      );
    });
  });

  describe('replaceCreatorsForShow', () => {
    it('should replace creators for a show', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_test123',
          note: 'Creator note',
          metadata: {},
        },
      ];
      const mockCreator = {
        id: BigInt(1),
        uid: 'creator_test123',
        deletedAt: null,
      };

      showService.getShowById.mockResolvedValue(mockShow);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new');
      creatorRepository.findByUids.mockResolvedValue([mockCreator] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);
      showRepository.findByUid.mockResolvedValue(mockShow);

      const result = await service.replaceCreatorsForShow(uid, creators);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(creatorRepository.findByUids).toHaveBeenCalledWith(['creator_test123']);
      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_new',
          showId: mockShow.id,
          creatorId: BigInt(1),
          note: 'Creator note',
          metadata: {},
        }),
      );
      expect(showRepository.findByUid).toHaveBeenCalledWith(
        uid,
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });

    it('should return creator-labeled not-found error for creator replacement', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_missing',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([]);

      await expect(service.replaceCreatorsForShow(uid, creators)).rejects.toThrow(
        'Creators not found: creator_missing',
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
      const mockPlatform = { id: BigInt(1), uid: 'plt_test123', deletedAt: null };

      showService.getShowById.mockResolvedValue(mockShow);
      showPlatformService.generateShowPlatformUid.mockReturnValue('show_plt_new');
      platformRepository.findByUids.mockResolvedValue([mockPlatform] as any);
      showPlatformRepository.findMany.mockResolvedValue([]);
      showPlatformRepository.createAssignment.mockResolvedValue({} as any);
      showRepository.findByUid.mockResolvedValue(mockShow);

      const result = await service.replacePlatformsForShow(uid, platforms);

      expect(showService.getShowById).toHaveBeenCalledWith(uid);
      expect(platformRepository.findByUids).toHaveBeenCalledWith(['plt_test123']);
      expect(showPlatformRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_plt_new',
          showId: mockShow.id,
          platformId: BigInt(1),
        }),
      );
      expect(showRepository.findByUid).toHaveBeenCalledWith(
        uid,
        expect.any(Object),
      );
      expect(result).toEqual(mockShow);
    });
  });
});
