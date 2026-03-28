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
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateShowWithAssignmentsDto,
  UpdateShowWithAssignmentsDto,
} from '@/show-orchestration/schemas/show-orchestration.schema';
import { showWithAssignmentsInclude } from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';

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
  let studioCreatorRepository: jest.Mocked<StudioCreatorRepository>;

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
        {
          provide: StudioCreatorRepository,
          useValue: {
            findByStudioUidAndCreatorUids: jest.fn(),
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
    studioCreatorRepository = module.get<StudioCreatorRepository>(StudioCreatorRepository) as jest.Mocked<StudioCreatorRepository>;
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
        include: showWithAssignmentsInclude,
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
            agreedRate: '120.00',
            compensationType: 'FIXED',
            commissionRate: '5.00',
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
          agreedRate: '120.00',
          compensationType: 'FIXED',
          commissionRate: '5.00',
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

  describe('bulkAssignCreatorsToShow', () => {
    it('should create, restore, skip, and report failures', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_new',
          note: 'New creator',
          agreedRate: '120.00',
          compensationType: 'FIXED',
          commissionRate: '5.00',
          metadata: { source: 'bulk' },
        },
        {
          creatorId: 'creator_active',
          note: null,
          metadata: {},
        },
        {
          creatorId: 'creator_deleted',
          note: 'Restore creator',
          compensationType: 'COMMISSION',
          commissionRate: '10.00',
          metadata: { source: 'restore' },
        },
        {
          creatorId: 'creator_missing',
          note: null,
          metadata: {},
        },
        {
          creatorId: 'creator_new',
          note: 'duplicate',
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
        { id: BigInt(2), uid: 'creator_active' },
        { id: BigInt(3), uid: 'creator_deleted' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([]);
      showCreatorRepository.findMany.mockResolvedValue([
        { id: BigInt(22), showId: mockShow.id, creatorId: BigInt(2), deletedAt: null, metadata: {} },
        { id: BigInt(33), showId: mockShow.id, creatorId: BigInt(3), deletedAt: new Date(), metadata: {} },
      ] as any);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockResolvedValue({} as any);
      showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({} as any);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any);

      expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_mc_new_bulk',
          showId: mockShow.id,
          creatorId: BigInt(1),
          note: 'New creator',
          agreedRate: '120.00',
          compensationType: 'FIXED',
          commissionRate: '5.00',
          metadata: { source: 'bulk' },
        }),
      );
      expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(
        BigInt(33),
        {
          note: 'Restore creator',
          agreedRate: undefined,
          compensationType: 'COMMISSION',
          commissionRate: '10.00',
          metadata: { source: 'restore' },
        },
      );
      expect(result).toEqual({
        assigned: 2,
        skipped: 1,
        failed: [
          { creatorId: 'creator_missing', reason: 'Creator not found' },
          { creatorId: 'creator_new', reason: 'Duplicate creator_id in request' },
        ],
      });
    });

    it('should return zero summary for empty payload', async () => {
      const uid = 'show_test123';
      showService.getShowById.mockResolvedValue(mockShow);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, []);
      expect(result).toEqual({ assigned: 0, skipped: 0, failed: [] });
      expect(creatorRepository.findByUids).not.toHaveBeenCalled();
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
    });

    it('should convert create-assignment failures into failed summary rows', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_new',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([]);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockRejectedValue(new Error('insert failed'));

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any);

      expect(result).toEqual({
        assigned: 0,
        skipped: 0,
        failed: [
          { creatorId: 'creator_new', reason: 'Failed to assign creator' },
        ],
      });
    });

    it('should treat unique conflict during create as skipped', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_new',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(1), uid: 'creator_new' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([]);
      showCreatorRepository.findMany.mockResolvedValue([]);
      showCreatorService.generateShowCreatorUid.mockReturnValue('show_mc_new_bulk');
      showCreatorRepository.createAssignment.mockRejectedValue(
        createMockUniqueConstraintError(['showId', 'creatorId'], 'ShowCreator'),
      );

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any);

      expect(result).toEqual({
        assigned: 0,
        skipped: 1,
        failed: [],
      });
    });

    it('should reject creators that are inactive in the studio roster', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_inactive',
          note: null,
          metadata: {},
        },
      ];

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([
        { id: BigInt(9), uid: 'creator_inactive' },
      ] as any);
      studioCreatorRepository.findByStudioUidAndCreatorUids.mockResolvedValue([
        {
          creator: {
            uid: 'creator_inactive',
            name: 'Inactive Creator',
            aliasName: 'Inactive Creator',
          },
          isActive: false,
        },
      ] as any);
      showCreatorRepository.findMany.mockResolvedValue([]);

      const result = await service.bulkAssignCreatorsToShow('std_test123', uid, creators as any);

      expect(result).toEqual({
        assigned: 0,
        skipped: 0,
        failed: [
          { creatorId: 'creator_inactive', reason: 'CREATOR_INACTIVE_IN_ROSTER' },
        ],
      });
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
    });
  });

  describe('replaceCreatorsForShow', () => {
    it('should replace creators for a show', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_test123',
          note: 'Creator note',
          agreedRate: '150.00',
          compensationType: 'HYBRID',
          commissionRate: '12.50',
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
          agreedRate: '150.00',
          compensationType: 'HYBRID',
          commissionRate: '12.50',
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

    it('should restore existing creator assignment with compensation fields', async () => {
      const uid = 'show_test123';
      const creators = [
        {
          creatorId: 'creator_test123',
          note: 'Restored note',
          agreedRate: '180.00',
          compensationType: 'COMMISSION',
          commissionRate: '20.00',
          metadata: { source: 'sync' },
        },
      ];
      const mockCreator = {
        id: BigInt(1),
        uid: 'creator_test123',
        deletedAt: null,
      };
      const existingAssignment = {
        id: BigInt(99),
        showId: mockShow.id,
        creatorId: BigInt(1),
        note: null,
        agreedRate: null,
        compensationType: null,
        commissionRate: null,
        metadata: {},
        deletedAt: new Date(),
      };

      showService.getShowById.mockResolvedValue(mockShow);
      creatorRepository.findByUids.mockResolvedValue([mockCreator] as any);
      showCreatorRepository.findMany.mockResolvedValue([existingAssignment] as any);
      showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({} as any);
      showRepository.findByUid.mockResolvedValue(mockShow);

      await service.replaceCreatorsForShow(uid, creators);

      expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(
        BigInt(99),
        {
          note: 'Restored note',
          agreedRate: '180.00',
          compensationType: 'COMMISSION',
          commissionRate: '20.00',
          metadata: { source: 'sync' },
        },
      );
      expect(showCreatorRepository.createAssignment).not.toHaveBeenCalled();
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

  describe('listCreatorsForShow', () => {
    it('should return creator list for show assignments', async () => {
      showService.getShowById.mockResolvedValue({
        ...mockShow,
        showCreators: [
          {
            id: 1n,
            uid: 'show_creator_1',
            note: 'Primary',
            agreedRate: '100.00',
            compensationType: 'FIXED',
            commissionRate: null,
            metadata: { source: 'manual' },
            showId: mockShow.id,
            creatorId: 2n,
            createdAt: new Date('2026-03-13T10:00:00.000Z'),
            updatedAt: new Date('2026-03-13T10:00:00.000Z'),
            deletedAt: null,
            creator: {
              uid: 'creator_1',
              name: 'Alice',
              aliasName: 'Ali',
            },
          },
        ],
      } as unknown as Show);

      const result = await service.listCreatorsForShow(mockShow.uid);

      expect(showService.getShowById).toHaveBeenCalledWith(
        mockShow.uid,
        expect.objectContaining({
          showCreators: expect.any(Object),
        }),
      );
      expect(result).toEqual([
        expect.objectContaining({
          creatorId: 'creator_1',
          creatorName: 'Alice',
          creatorAliasName: 'Ali',
          note: 'Primary',
        }),
      ]);
    });
  });
});
