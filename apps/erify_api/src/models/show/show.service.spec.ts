import { Test, TestingModule } from '@nestjs/testing';

import { createMockUniqueConstraintError } from '@/common/test-helpers/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

import { CreateShowDto, UpdateShowDto } from './schemas/show.schema';
import { ShowRepository } from './show.repository';
import { ShowService } from './show.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('ShowService', () => {
  let service: ShowService;

  const showRepositoryMock: Partial<jest.Mocked<ShowRepository>> = {
    create: jest.fn(),
    findByUid: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findActiveShows: jest.fn(),
    findShowsByClient: jest.fn(),
    findShowsByStudioRoom: jest.fn(),
    findShowsByDateRange: jest.fn(),
  };

  const utilityMock: Partial<jest.Mocked<UtilityService>> = {
    generateBrandedId: jest.fn().mockReturnValue('show_123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowService,
        { provide: ShowRepository, useValue: showRepositoryMock },
        { provide: UtilityService, useValue: utilityMock },
      ],
    }).compile();

    service = module.get<ShowService>(ShowService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
});
