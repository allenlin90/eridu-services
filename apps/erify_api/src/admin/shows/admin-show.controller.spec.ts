import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminShowController } from './admin-show.controller';

import type {
  ListShowsQueryDto,
  UpdateShowDto,
} from '@/models/show/schemas/show.schema';
import type {
  CreateShowWithAssignmentsDto,
  RemoveMcsFromShowDto,
  RemovePlatformsFromShowDto,
  ReplaceMcsOnShowDto,
  ReplacePlatformsOnShowDto,
} from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

describe('adminShowController', () => {
  let controller: AdminShowController;

  const mockShowOrchestrationService = {
    createShowWithAssignments: jest.fn(),
    getShowWithRelations: jest.fn(),
    getPaginatedShowsWithRelations: jest.fn(),
    updateShowWithAssignments: jest.fn(),
    deleteShow: jest.fn(),
    removeMCsFromShow: jest.fn(),
    removePlatformsFromShow: jest.fn(),
    replaceMCsForShow: jest.fn(),
    replacePlatformsForShow: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowController],
      providers: [
        {
          provide: ShowOrchestrationService,
          useValue: mockShowOrchestrationService,
        },
      ],
    }).compile();

    controller = module.get<AdminShowController>(AdminShowController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShow', () => {
    it('should create a show with assignments', async () => {
      const createDto: CreateShowWithAssignmentsDto = {
        name: 'Test Show',
        clientId: 'client_123',
        studioRoomId: 'srm_123',
        showTypeId: 'sht_123',
        showStatusId: 'shst_123',
        showStandardId: 'shsd_123',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        metadata: {},
        mcs: [],
        platforms: [],
      };
      const createdShow = { uid: 'show_123', ...createDto };
      const showWithRelations = {
        ...createdShow,
        showMCs: [],
        showPlatforms: [],
      };

      mockShowOrchestrationService.createShowWithAssignments.mockResolvedValue(
        createdShow as any,
      );
      mockShowOrchestrationService.getShowWithRelations.mockResolvedValue(
        showWithRelations as any,
      );

      const result = await controller.createShow(createDto);
      expect(
        mockShowOrchestrationService.createShowWithAssignments,
      ).toHaveBeenCalledWith(createDto);
      expect(
        mockShowOrchestrationService.getShowWithRelations,
      ).toHaveBeenCalledWith(createdShow.uid);
      expect(result).toEqual(showWithRelations);
    });
  });

  describe('getShows', () => {
    it('should return paginated list of shows', async () => {
      const query: ListShowsQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      } as ListShowsQueryDto;
      const shows = [
        { uid: 'show_1', name: 'Show 1' },
        { uid: 'show_2', name: 'Show 2' },
      ];
      const total = 2;
      const paginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockShowOrchestrationService.getPaginatedShowsWithRelations.mockResolvedValue(
        {
          shows,
          total,
        },
      );

      const result = await controller.getShows(query);
      expect(
        mockShowOrchestrationService.getPaginatedShowsWithRelations,
      ).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        data: shows,
        meta: paginationMeta,
      });
    });
  });

  describe('getShow', () => {
    it('should return a show by id', async () => {
      const showId = 'show_123';
      const show = {
        uid: showId,
        name: 'Test Show',
        showMcs: [],
        showPlatforms: [],
      };

      mockShowOrchestrationService.getShowWithRelations.mockResolvedValue(
        show as any,
      );

      const result = await controller.getShow(showId);
      expect(
        mockShowOrchestrationService.getShowWithRelations,
      ).toHaveBeenCalledWith(showId);
      expect(result).toEqual(show);
    });
  });

  describe('updateShow', () => {
    it('should update a show', async () => {
      const showId = 'show_123';
      const updateDto: UpdateShowDto = {
        name: 'Updated Show',
      } as UpdateShowDto;
      const updatedShow = {
        uid: showId,
        ...updateDto,
        showMcs: [],
        showPlatforms: [],
      };

      mockShowOrchestrationService.updateShowWithAssignments.mockResolvedValue(
        updatedShow as any,
      );

      const result = await controller.updateShow(showId, updateDto);
      expect(
        mockShowOrchestrationService.updateShowWithAssignments,
      ).toHaveBeenCalledWith(showId, {
        ...updateDto,
        showMcs: undefined,
        showPlatforms: undefined,
      });
      expect(result).toEqual(updatedShow);
    });
  });

  describe('deleteShow', () => {
    it('should delete a show', async () => {
      const showId = 'show_123';

      mockShowOrchestrationService.deleteShow.mockResolvedValue(undefined);

      await controller.deleteShow(showId);
      expect(mockShowOrchestrationService.deleteShow).toHaveBeenCalledWith(
        showId,
      );
    });
  });

  describe('removeMCsFromShow', () => {
    it('should remove MCs from a show', async () => {
      const showId = 'show_123';
      const removeDto: RemoveMcsFromShowDto = { mcIds: ['mc_1', 'mc_2'] };

      mockShowOrchestrationService.removeMCsFromShow.mockResolvedValue(
        undefined,
      );

      await controller.removeMCsFromShow(showId, removeDto);
      expect(
        mockShowOrchestrationService.removeMCsFromShow,
      ).toHaveBeenCalledWith(showId, removeDto.mcIds);
    });
  });

  describe('removePlatformsFromShow', () => {
    it('should remove platforms from a show', async () => {
      const showId = 'show_123';
      const removeDto: RemovePlatformsFromShowDto = {
        platformIds: ['platform_1', 'platform_2'],
      };

      mockShowOrchestrationService.removePlatformsFromShow.mockResolvedValue(
        undefined,
      );

      await controller.removePlatformsFromShow(showId, removeDto);
      expect(
        mockShowOrchestrationService.removePlatformsFromShow,
      ).toHaveBeenCalledWith(showId, removeDto.platformIds);
    });
  });

  describe('replaceMCsOnShow', () => {
    it('should replace MCs on a show', async () => {
      const showId = 'show_123';
      const replaceDto: ReplaceMcsOnShowDto = {
        mcs: [{ mcId: 'mc_1', note: null, metadata: {} }],
      };
      const updatedShow = {
        uid: showId,
        showMcs: [{ mcId: 'mc_1', note: null, metadata: {} }],
      };

      mockShowOrchestrationService.replaceMCsForShow.mockResolvedValue(
        updatedShow as any,
      );

      const result = await controller.replaceMCsOnShow(showId, replaceDto);
      expect(
        mockShowOrchestrationService.replaceMCsForShow,
      ).toHaveBeenCalledWith(showId, replaceDto.mcs);
      expect(result).toEqual(updatedShow);
    });
  });

  describe('replacePlatformsOnShow', () => {
    it('should replace platforms on a show', async () => {
      const showId = 'show_123';
      const replaceDto: ReplacePlatformsOnShowDto = {
        platforms: [
          {
            platformId: 'platform_1',
            liveStreamLink: 'https://example.com',
            platformShowId: 'platform_show_1',
            viewerCount: 0,
            metadata: {},
          },
        ],
      };
      const updatedShow = {
        uid: showId,
        showPlatforms: [
          {
            platformId: 'platform_1',
            liveStreamLink: 'https://example.com',
            platformShowId: 'platform_show_1',
            viewerCount: 0,
            metadata: {},
          },
        ],
      };

      mockShowOrchestrationService.replacePlatformsForShow.mockResolvedValue(
        updatedShow as any,
      );

      const result = await controller.replacePlatformsOnShow(
        showId,
        replaceDto,
      );
      expect(
        mockShowOrchestrationService.replacePlatformsForShow,
      ).toHaveBeenCalledWith(showId, replaceDto.platforms);
      expect(result).toEqual(updatedShow);
    });
  });
});
