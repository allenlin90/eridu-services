import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Show } from '@prisma/client';
import type { Request } from 'express';

import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import { UtilityService } from '@/utility/utility.service';

import { ShowsController } from './shows.controller';
import { ShowsService } from './shows.service';

describe('ShowsController', () => {
  let controller: ShowsController;

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

  const mockShowsService = {
    getShowsForMcUser: jest.fn(),
    getShowForMcUser: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowsController],
      providers: [
        {
          provide: ShowsService,
          useValue: mockShowsService,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
      ],
    }).compile();

    controller = module.get<ShowsController>(ShowsController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getShows', () => {
    it('should return paginated list of shows for authenticated MC user', async () => {
      const userIdentifier = 'user_test123';
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const request = {
        user: { id: userIdentifier },
      } as Request & { user?: { id: string } };
      const shows = [mockShowWithRelations];
      const total = 1;
      const paginationMeta = {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockShowsService.getShowsForMcUser.mockResolvedValue({
        shows,
        total,
      });
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getShows(request, query);

      expect(mockShowsService.getShowsForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        {
          skip: query.skip,
          take: query.take,
          orderBy: {
            startTime: 'asc',
          },
        },
      );
      expect(mockUtilityService.createPaginationMeta).toHaveBeenCalledWith(
        query.page,
        query.limit,
        total,
      );
      expect(result).toEqual({
        data: shows,
        meta: paginationMeta,
      });
    });

    it('should handle pagination with custom page and limit', async () => {
      const userIdentifier = 'user_test123';
      const query: PaginationQueryDto = {
        page: 2,
        limit: 20,
        skip: 20,
        take: 20,
      };
      const request = {
        user: { id: userIdentifier },
      } as Request & { user?: { id: string } };
      const shows = [mockShowWithRelations];
      const total = 25;
      const paginationMeta = {
        page: 2,
        limit: 20,
        total: 25,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      };

      mockShowsService.getShowsForMcUser.mockResolvedValue({
        shows,
        total,
      });
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getShows(request, query);

      expect(mockShowsService.getShowsForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        {
          skip: 20,
          take: 20,
          orderBy: {
            startTime: 'asc',
          },
        },
      );
      expect(result).toEqual({
        data: shows,
        meta: paginationMeta,
      });
    });

    it('should throw UnauthorizedException when user identifier is missing', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const request = {} as Request & { user?: { id: string } };

      await expect(controller.getShows(request, query)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.getShows(request, query)).rejects.toThrow(
        'User identifier not found in request. Authentication guard must set request.user.id (uid or extId)',
      );
      expect(mockShowsService.getShowsForMcUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is undefined', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const request = { user: undefined } as Request & {
        user?: { id: string };
      };

      await expect(controller.getShows(request, query)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockShowsService.getShowsForMcUser).not.toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      const userIdentifier = 'user_test123';
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const request = {
        user: { id: userIdentifier },
      } as Request & { user?: { id: string } };
      const paginationMeta = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockShowsService.getShowsForMcUser.mockResolvedValue({
        shows: [],
        total: 0,
      });
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getShows(request, query);

      expect(result).toEqual({
        data: [],
        meta: paginationMeta,
      });
    });
  });

  describe('getShow', () => {
    it('should return a specific show for authenticated MC user', async () => {
      const userIdentifier = 'user_test123';
      const showId = 'show_test123';
      const request = {
        user: { id: userIdentifier },
      } as Request & { user?: { id: string } };

      mockShowsService.getShowForMcUser.mockResolvedValue(
        mockShowWithRelations,
      );

      const result = await controller.getShow(request, showId);

      expect(mockShowsService.getShowForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        showId,
      );
      expect(result).toEqual(mockShowWithRelations);
    });

    it('should work with extId as user identifier', async () => {
      const userIdentifier = 'ext_test123';
      const showId = 'show_test123';
      const request = {
        user: { id: userIdentifier },
      } as Request & { user?: { id: string } };

      mockShowsService.getShowForMcUser.mockResolvedValue(
        mockShowWithRelations,
      );

      const result = await controller.getShow(request, showId);

      expect(mockShowsService.getShowForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        showId,
      );
      expect(result).toEqual(mockShowWithRelations);
    });

    it('should throw UnauthorizedException when user identifier is missing', async () => {
      const showId = 'show_test123';
      const request = {} as Request & { user?: { id: string } };

      await expect(controller.getShow(request, showId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.getShow(request, showId)).rejects.toThrow(
        'User identifier not found in request. Authentication guard must set request.user.id (uid or extId)',
      );
      expect(mockShowsService.getShowForMcUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is undefined', async () => {
      const showId = 'show_test123';
      const request = { user: undefined } as Request & {
        user?: { id: string };
      };

      await expect(controller.getShow(request, showId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockShowsService.getShowForMcUser).not.toHaveBeenCalled();
    });
  });
});
