import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

import { CreateShowDto, UpdateShowDto } from './schemas/show.schema';

type ListShowsQuery = {
  page: number;
  limit: number;
  take: number;
  skip: number;
  client_id?: string | string[];
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  order_by: 'created_at' | 'updated_at' | 'start_time' | 'end_time';
  order_direction: 'asc' | 'desc';
  include_deleted: boolean;
};
import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('ShowService', () => {
  let service: ShowService;
  let showRepositoryMock: Partial<jest.Mocked<ShowRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  const mockClient = {
    id: BigInt(1),
    uid: 'client_client001',
    name: 'Client A',
    contactPerson: 'John Doe',
    contactEmail: 'john@clienta.com',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockShow = {
    id: BigInt(1),
    uid: 'show_show001',
    clientId: mockClient.id,
    studioRoomId: BigInt(1),
    showTypeId: BigInt(1),
    showStatusId: BigInt(1),
    showStandardId: BigInt(1),
    name: 'Test Show',
    startTime: new Date('2025-01-01T10:00:00Z'),
    endTime: new Date('2025-01-01T12:00:00Z'),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    showRepositoryMock = createMockRepository<ShowRepository>({
      findActiveShows: jest.fn(),
      findShowsByClient: jest.fn(),
      findShowsByStudioRoom: jest.fn(),
      findShowsByDateRange: jest.fn(),
    });

    utilityMock = createMockUtilityService('show_123');

    const module = await createModelServiceTestModule({
      serviceClass: ShowService,
      repositoryClass: ShowRepository,
      repositoryMock: showRepositoryMock,
      utilityMock: utilityMock,
    });

    service = module.get<ShowService>(ShowService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  describe('createShowFromDto', () => {
    it('returns created show', async () => {
      const dto: CreateShowDto = {
        name: 'Morning Show',
        clientId: 'client_1',
        studioRoomId: 'room_1',
        showTypeId: 'type_1',
        showStatusId: 'status_1',
        showStandardId: 'standard_1',
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        metadata: {},
      } as CreateShowDto;

      const created = {
        uid: 'show_123',
        id: 1n,
        name: dto.name,
        clientId: 1n,
        studioRoomId: 1n,
        showTypeId: 1n,
        showStatusId: 1n,
        showStandardId: 1n,
        startTime: dto.startTime,
        endTime: dto.endTime,
        metadata: dto.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (showRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createShowFromDto(dto);

      expect(utilityMock.generateBrandedId).toHaveBeenCalledWith(
        'show',
        undefined,
      );
      expect(showRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'show_123',
          name: dto.name,
          startTime: dto.startTime,
          endTime: dto.endTime,
          metadata: {},
          client: { connect: { uid: dto.clientId } },
          studioRoom: { connect: { uid: dto.studioRoomId } },
          showType: { connect: { uid: dto.showTypeId } },
          showStatus: { connect: { uid: dto.showStatusId } },
          showStandard: { connect: { uid: dto.showStandardId } },
        }),
        undefined,
      );
      expect(result).toEqual(created);
    });

    it('throws error when endTime <= startTime', async () => {
      const dto: CreateShowDto = {
        name: 'Invalid Show',
        clientId: 'client_1',
        studioRoomId: 'room_1',
        showTypeId: 'type_1',
        showStatusId: 'status_1',
        showStandardId: 'standard_1',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T09:00:00Z'), // Before start time
        metadata: {},
      } as CreateShowDto;

      await expect(service.createShowFromDto(dto)).rejects.toMatchObject({
        status: 400,
        message: 'End time must be after start time',
      });
    });

    it('maps P2002 to Conflict', async () => {
      const dto: CreateShowDto = {
        name: 'Morning Show',
        clientId: 'client_1',
        studioRoomId: 'room_1',
        showTypeId: 'type_1',
        showStatusId: 'status_1',
        showStandardId: 'standard_1',
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        metadata: {},
      } as CreateShowDto;

      const error = createMockUniqueConstraintError(['uid']);
      (showRepositoryMock.create as jest.Mock).mockRejectedValue(error);

      await expect(service.createShowFromDto(dto)).rejects.toThrow(error);
    });
  });

  describe('getShowById', () => {
    it('returns show with includes', async () => {
      const show = {
        uid: 'show_123',
        id: 1n,
        name: 'Morning Show',
        clientId: 1n,
        studioRoomId: 1n,
        showTypeId: 1n,
        showStatusId: 1n,
        showStandardId: 1n,
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        client: { uid: 'client_1', name: 'Client A' },
      };

      (showRepositoryMock.findByUid as jest.Mock).mockResolvedValue(show);

      const result = await service.getShowById('show_123', { client: true });

      expect(showRepositoryMock.findByUid).toHaveBeenCalledWith('show_123', {
        client: true,
      });
      expect(result).toEqual(show);
    });

    it('throws not found', async () => {
      (showRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

      await expect(service.getShowById('show_404')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('getShows', () => {
    it('returns array of shows', async () => {
      const shows = [
        {
          uid: 'show_1',
          id: 1n,
          name: 'Show 1',
          clientId: 1n,
          studioRoomId: 1n,
          showTypeId: 1n,
          showStatusId: 1n,
          showStandardId: 1n,
          startTime: new Date(),
          endTime: new Date(),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showRepositoryMock.findMany as jest.Mock).mockResolvedValue(shows);

      const result = await service.getShows({
        skip: 0,
        take: 10,
      });

      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: undefined,
      });
      expect(result).toEqual(shows);
    });
  });

  describe('updateShowFromDto', () => {
    it('returns updated show', async () => {
      const existingShow = {
        uid: 'show_123',
        id: 1n,
        name: 'Old Name',
        clientId: 1n,
        studioRoomId: 1n,
        showTypeId: 1n,
        showStatusId: 1n,
        showStandardId: 1n,
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto: UpdateShowDto = {
        name: 'New Name',
      } as UpdateShowDto;

      const updated = { ...existingShow, name: 'New Name' };

      (showRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShow,
      );
      (showRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateShowFromDto('show_123', dto);

      expect(showRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_123',
        undefined,
      );
      expect(showRepositoryMock.update).toHaveBeenCalledWith(
        { uid: 'show_123' },
        expect.objectContaining({ name: 'New Name' }),
        undefined,
      );
      expect(result).toEqual(updated);
    });

    it('throws error when both times updated and invalid', async () => {
      const existingShow = {
        uid: 'show_123',
        id: 1n,
        name: 'Show',
        clientId: 1n,
        studioRoomId: 1n,
        showTypeId: 1n,
        showStatusId: 1n,
        showStandardId: 1n,
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto: UpdateShowDto = {
        startTime: new Date('2025-01-01T12:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'), // Before start time
      } as UpdateShowDto;

      (showRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShow,
      );

      await expect(
        service.updateShowFromDto('show_123', dto),
      ).rejects.toMatchObject({
        status: 400,
        message: 'End time must be after start time',
      });
    });

    it('maps P2002 to Conflict', async () => {
      const existingShow = {
        uid: 'show_123',
        id: 1n,
        name: 'Old Name',
        clientId: 1n,
        studioRoomId: 1n,
        showTypeId: 1n,
        showStatusId: 1n,
        showStandardId: 1n,
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const dto: UpdateShowDto = {
        name: 'Duplicate Name',
      } as UpdateShowDto;

      (showRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShow,
      );

      const error = createMockUniqueConstraintError(['name']);
      (showRepositoryMock.update as jest.Mock).mockRejectedValue(error);

      await expect(service.updateShowFromDto('show_123', dto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('deleteShow', () => {
    it('soft deletes show', async () => {
      const existingShow = {
        uid: 'show_123',
        id: 1n,
        name: 'Show to Delete',
        clientId: 1n,
        studioRoomId: 1n,
        showTypeId: 1n,
        showStatusId: 1n,
        showStandardId: 1n,
        startTime: new Date('2025-01-01T09:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const deletedShow = { ...existingShow, deletedAt: new Date() };

      (showRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        existingShow,
      );
      (showRepositoryMock.softDelete as jest.Mock).mockResolvedValue(
        deletedShow,
      );

      const result = await service.deleteShow('show_123');

      expect(showRepositoryMock.findByUid).toHaveBeenCalledWith(
        'show_123',
        undefined,
      );
      expect(showRepositoryMock.softDelete).toHaveBeenCalledWith({
        uid: 'show_123',
      });
      expect(result).toEqual(deletedShow);
    });
  });

  describe('countShows', () => {
    it('returns count', async () => {
      (showRepositoryMock.count as jest.Mock).mockResolvedValue(42);

      const result = await service.countShows();

      expect(showRepositoryMock.count).toHaveBeenCalledWith({});
      expect(result).toBe(42);
    });
  });

  describe('getActiveShows', () => {
    it('returns active shows', async () => {
      const shows = [
        {
          uid: 'show_1',
          id: 1n,
          name: 'Active Show',
          clientId: 1n,
          studioRoomId: 1n,
          showTypeId: 1n,
          showStatusId: 1n,
          showStandardId: 1n,
          startTime: new Date(),
          endTime: new Date(),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showRepositoryMock.findActiveShows as jest.Mock).mockResolvedValue(
        shows,
      );

      const result = await service.getActiveShows({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(showRepositoryMock.findActiveShows).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(shows);
    });
  });

  describe('getShowsByClient', () => {
    it('returns shows for client', async () => {
      const shows = [
        {
          uid: 'show_1',
          id: 1n,
          name: 'Client Show',
          clientId: 1n,
          studioRoomId: 1n,
          showTypeId: 1n,
          showStatusId: 1n,
          showStandardId: 1n,
          startTime: new Date(),
          endTime: new Date(),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showRepositoryMock.findShowsByClient as jest.Mock).mockResolvedValue(
        shows,
      );

      const result = await service.getShowsByClient(1n, {
        skip: 0,
        take: 10,
      });

      expect(showRepositoryMock.findShowsByClient).toHaveBeenCalledWith(1n, {
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(shows);
    });
  });

  describe('getShowsByStudioRoom', () => {
    it('returns shows for studio room', async () => {
      const shows = [
        {
          uid: 'show_1',
          id: 1n,
          name: 'Room Show',
          clientId: 1n,
          studioRoomId: 1n,
          showTypeId: 1n,
          showStatusId: 1n,
          showStandardId: 1n,
          startTime: new Date(),
          endTime: new Date(),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showRepositoryMock.findShowsByStudioRoom as jest.Mock).mockResolvedValue(
        shows,
      );

      const result = await service.getShowsByStudioRoom(1n, {
        skip: 0,
        take: 10,
      });

      expect(showRepositoryMock.findShowsByStudioRoom).toHaveBeenCalledWith(
        1n,
        {
          skip: 0,
          take: 10,
        },
      );
      expect(result).toEqual(shows);
    });
  });

  describe('getShowsByDateRange', () => {
    it('returns shows in date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const shows = [
        {
          uid: 'show_1',
          id: 1n,
          name: 'January Show',
          clientId: 1n,
          studioRoomId: 1n,
          showTypeId: 1n,
          showStatusId: 1n,
          showStandardId: 1n,
          startTime: new Date('2025-01-15'),
          endTime: new Date('2025-01-15'),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (showRepositoryMock.findShowsByDateRange as jest.Mock).mockResolvedValue(
        shows,
      );

      const result = await service.getShowsByDateRange(startDate, endDate, {
        skip: 0,
        take: 10,
      });

      expect(showRepositoryMock.findShowsByDateRange).toHaveBeenCalledWith(
        startDate,
        endDate,
        {
          skip: 0,
          take: 10,
        },
      );
      expect(result).toEqual(shows);
    });
  });

  describe('getPaginatedShows', () => {
    beforeEach(() => {
      showRepositoryMock.findMany = jest.fn().mockResolvedValue([mockShow]);
      showRepositoryMock.count = jest.fn().mockResolvedValue(1);
    });

    it('should return paginated shows with default filtering', async () => {
      const query: ListShowsQuery = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        order_by: 'created_at',
        order_direction: 'desc',
        include_deleted: false,
      };

      const result = await service.getPaginatedShows(query);

      expect(result.shows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null },
        include: {
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
        },
      });
      expect(showRepositoryMock.count).toHaveBeenCalledWith({
        deletedAt: null,
      });
    });

    it('should apply client filtering', async () => {
      const query: ListShowsQuery = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: mockClient.uid,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        order_by: 'created_at',
        order_direction: 'desc',
        include_deleted: false,
      };

      await service.getPaginatedShows(query);

      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
          client: {
            uid: { in: [mockClient.uid] },
            deletedAt: null,
          },
        },
        include: {
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
        },
      });
    });

    it('should apply date range filtering for start time', async () => {
      const query: ListShowsQuery = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        start_date_from: '2025-01-01T00:00:00Z',
        start_date_to: '2025-01-31T23:59:59Z',
        end_date_from: undefined,
        end_date_to: undefined,
        order_by: 'created_at',
        order_direction: 'desc',
        include_deleted: false,
      };

      await service.getPaginatedShows(query);

      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
          startTime: {
            gte: new Date('2025-01-01T00:00:00Z'),
            lte: new Date('2025-01-31T23:59:59Z'),
          },
        },
        include: {
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
        },
      });
    });

    it('should apply date range filtering for end time', async () => {
      const query: ListShowsQuery = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: '2025-01-01T00:00:00Z',
        end_date_to: '2025-01-31T23:59:59Z',
        order_by: 'created_at',
        order_direction: 'desc',
        include_deleted: false,
      };

      await service.getPaginatedShows(query);

      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
          endTime: {
            gte: new Date('2025-01-01T00:00:00Z'),
            lte: new Date('2025-01-31T23:59:59Z'),
          },
        },
        include: {
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
        },
      });
    });

    it('should apply custom ordering', async () => {
      const query: ListShowsQuery = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        order_by: 'start_time',
        order_direction: 'asc',
        include_deleted: false,
      };

      await service.getPaginatedShows(query);

      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { startTime: 'asc' },
        where: { deletedAt: null },
        include: {
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
        },
      });
    });

    it('should include deleted records when include_deleted is true', async () => {
      const query: ListShowsQuery = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: undefined,
        start_date_from: undefined,
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: undefined,
        order_by: 'created_at',
        order_direction: 'desc',
        include_deleted: true,
      };

      await service.getPaginatedShows(query);

      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {}, // No deletedAt filter
        include: {
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
        },
      });
    });

    it('should handle multiple filters combined', async () => {
      const query: ListShowsQuery = {
        skip: 0,
        take: 10,
        page: 1,
        limit: 10,
        client_id: [mockClient.uid],
        start_date_from: '2025-01-01T00:00:00Z',
        start_date_to: undefined,
        end_date_from: undefined,
        end_date_to: '2025-12-31T23:59:59Z',
        order_by: 'updated_at',
        order_direction: 'asc',
        include_deleted: false,
      };

      await service.getPaginatedShows(query);

      expect(showRepositoryMock.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'asc' },
        where: {
          deletedAt: null,
          client: {
            uid: { in: [mockClient.uid] },
            deletedAt: null,
          },
          startTime: {
            gte: new Date('2025-01-01T00:00:00Z'),
          },
          endTime: {
            lte: new Date('2025-12-31T23:59:59Z'),
          },
        },
        include: {
          client: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
        },
      });
    });
  });
});
