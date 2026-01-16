import { ShowsController } from './shows.controller';
import { ShowsService } from './shows.service';

import type { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import {
  createControllerUser,
  createJwtControllerTestModule,
  createPaginatedResponse,
  setupJwtControllerMocks,
} from '@/testing/jwt-controller-test.helper';
import {
  paginationMockFactory,
  showMockFactory,
} from '@/testing/mock-data-factories';

// Setup JWT controller mocks globally
setupJwtControllerMocks();

describe('showsController', () => {
  let controller: ShowsController;

  // Use mock data factories with proper typing for test purposes

  const mockShowWithRelations = showMockFactory.withRelations() as any;

  const mockShowsService = {
    getShowsForMcUser: jest.fn(),
    getShowForMcUser: jest.fn(),
  };

  beforeEach(async () => {
    const module = await createJwtControllerTestModule({
      controllerClass: ShowsController,
      serviceMocks: new Map([[ShowsService, mockShowsService]]),
    });

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
      const query: ListShowsQueryDto = {
        ...paginationMockFactory.query(),
        order_by: 'start_time',
        order_direction: 'desc',
        include_deleted: false,
        uid: undefined,
      };

      const user = createControllerUser({
        ext_id: userIdentifier,
        id: userIdentifier,
      });
      const shows = [mockShowWithRelations];
      const total = 1;
      const paginationMeta = paginationMockFactory.meta({
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      mockShowsService.getShowsForMcUser.mockResolvedValue({
        shows,
        total,
      });

      const result = await controller.getShows(user, query);

      expect(mockShowsService.getShowsForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        query,
      );
      expect(result).toEqual(createPaginatedResponse(shows, paginationMeta));
    });

    it('should handle pagination with custom page and limit', async () => {
      const userIdentifier = 'user_test123';
      const query: ListShowsQueryDto = {
        ...paginationMockFactory.query({
          page: 2,
          limit: 20,
          skip: 20,
          take: 20,
        }),
        order_by: 'start_time',
        order_direction: 'desc',
        include_deleted: false,
        uid: undefined,
      };

      const user = createControllerUser({
        ext_id: userIdentifier,
        id: userIdentifier,
      });
      const shows = [mockShowWithRelations];
      const total = 25;
      const paginationMeta = paginationMockFactory.meta({
        page: 2,
        limit: 20,
        total: 25,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });

      mockShowsService.getShowsForMcUser.mockResolvedValue({
        shows,
        total,
      });

      const result = await controller.getShows(user, query);

      expect(mockShowsService.getShowsForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        query,
      );
      expect(result).toEqual(createPaginatedResponse(shows, paginationMeta));
    });

    it('should handle empty results', async () => {
      const userIdentifier = 'user_test123';
      const query: ListShowsQueryDto = {
        ...paginationMockFactory.query(),
        order_by: 'start_time',
        order_direction: 'desc',
        include_deleted: false,
        uid: undefined,
      };

      const user = createControllerUser({
        ext_id: userIdentifier,
        id: userIdentifier,
      });
      const paginationMeta = paginationMockFactory.meta({
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      mockShowsService.getShowsForMcUser.mockResolvedValue({
        shows: [],
        total: 0,
      });

      const result = await controller.getShows(user, query);

      expect(result).toEqual(createPaginatedResponse([], paginationMeta));
    });
  });

  describe('getShow', () => {
    it('should return a specific show for authenticated MC user', async () => {
      const userIdentifier = 'user_test123';
      const showId = 'show_test123';

      const user = createControllerUser({
        ext_id: userIdentifier,
        id: userIdentifier,
      });

      mockShowsService.getShowForMcUser.mockResolvedValue(
        mockShowWithRelations,
      );

      const result = await controller.getShow(user, showId);

      expect(mockShowsService.getShowForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        showId,
      );
      expect(result).toEqual(mockShowWithRelations);
    });

    it('should work with extId as user identifier', async () => {
      const userIdentifier = 'ext_test123';
      const showId = 'show_test123';

      const user = createControllerUser({
        ext_id: userIdentifier,
        id: userIdentifier,
      });

      mockShowsService.getShowForMcUser.mockResolvedValue(
        mockShowWithRelations,
      );

      const result = await controller.getShow(user, showId);

      expect(mockShowsService.getShowForMcUser).toHaveBeenCalledWith(
        userIdentifier,
        showId,
      );
      expect(result).toEqual(mockShowWithRelations);
    });
  });
});
