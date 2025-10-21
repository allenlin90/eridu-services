import { Test, TestingModule } from '@nestjs/testing';

import { StudioService } from '../../studio/studio.service';
import {
  CreateStudioRoomDto,
  UpdateStudioRoomDto,
} from '../../studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '../../studio-room/studio-room.service';
import { UtilityService } from '../../utility/utility.service';
import { AdminStudioRoomService } from './admin-studio-room.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminStudioRoomService', () => {
  let service: AdminStudioRoomService;

  const studioRoomServiceMock: Partial<jest.Mocked<StudioRoomService>> = {
    createStudioRoom: jest.fn(),
    getStudioRoomById: jest.fn(),
    updateStudioRoom: jest.fn(),
    deleteStudioRoom: jest.fn(),
    getStudioRooms: jest.fn(),
    countStudioRooms: jest.fn(),
  };

  const studioServiceMock: Partial<jest.Mocked<StudioService>> = {
    getStudioById: jest.fn(),
  };

  const utilityServiceMock: Partial<jest.Mocked<UtilityService>> = {
    createPaginationMeta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStudioRoomService,
        { provide: StudioRoomService, useValue: studioRoomServiceMock },
        { provide: StudioService, useValue: studioServiceMock },
        { provide: UtilityService, useValue: utilityServiceMock },
      ],
    }).compile();

    service = module.get<AdminStudioRoomService>(AdminStudioRoomService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudioRoom', () => {
    it('creates studio room with valid studio_id', async () => {
      const dto = {
        studioId: 'studio_123',
        name: 'Room A',
        capacity: 50,
        metadata: { type: 'recording' },
      } as CreateStudioRoomDto;
      const studio = { id: 1n, uid: 'studio_123', name: 'Studio A' } as const;
      const created = {
        id: 1n,
        uid: 'srm_test_id',
        studioId: 1n,
        name: 'Room A',
        capacity: 50,
        metadata: { type: 'recording' },
        studio: {
          id: 1n,
          uid: 'studio_123',
          name: 'Studio A',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as const;

      (studioServiceMock.getStudioById as jest.Mock).mockResolvedValue(studio);
      (studioRoomServiceMock.createStudioRoom as jest.Mock).mockResolvedValue(
        created,
      );

      const result = await service.createStudioRoom(dto);

      expect(studioServiceMock.getStudioById).toHaveBeenCalledWith(
        'studio_123',
      );
      expect(studioRoomServiceMock.createStudioRoom).toHaveBeenCalledWith(
        {
          studio: { connect: { id: 1n } },
          name: 'Room A',
          capacity: 50,
          metadata: { type: 'recording' },
        },
        { studio: true },
      );
      expect(result).toEqual(created);
    });

    it('throws error when studio_id is invalid', async () => {
      const dto = {
        studioId: 'studio_invalid',
        name: 'Room A',
        capacity: 50,
        metadata: {},
      } as CreateStudioRoomDto;

      (studioServiceMock.getStudioById as jest.Mock).mockResolvedValue(null);

      await expect(service.createStudioRoom(dto)).rejects.toThrow(
        'studio_id: studio_invalid not found',
      );
      expect(studioServiceMock.getStudioById).toHaveBeenCalledWith(
        'studio_invalid',
      );
      expect(studioRoomServiceMock.createStudioRoom).not.toHaveBeenCalled();
    });
  });

  describe('getStudioRoomById', () => {
    it('returns studio room with studio information', async () => {
      const studioRoom = {
        id: 1n,
        uid: 'srm_123',
        studioId: 1n,
        name: 'Room A',
        capacity: 50,
        metadata: {},
        studio: {
          id: 1n,
          uid: 'studio_123',
          name: 'Studio A',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as const;

      (studioRoomServiceMock.getStudioRoomById as jest.Mock).mockResolvedValue(
        studioRoom,
      );

      const result = await service.getStudioRoomById('srm_123');

      expect(studioRoomServiceMock.getStudioRoomById).toHaveBeenCalledWith(
        'srm_123',
        {
          studio: true,
        },
      );
      expect(result).toEqual(studioRoom);
    });

    it('returns null when studio room is not found', async () => {
      (studioRoomServiceMock.getStudioRoomById as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.getStudioRoomById('srm_nonexistent');

      expect(studioRoomServiceMock.getStudioRoomById).toHaveBeenCalledWith(
        'srm_nonexistent',
        {
          studio: true,
        },
      );
      expect(result).toBeNull();
    });
  });

  describe('updateStudioRoom', () => {
    it('updates studio room without studio_id', async () => {
      const dto = {
        name: 'Updated Room',
        capacity: 60,
        metadata: { type: 'live' },
      } as UpdateStudioRoomDto;
      const updated = {
        id: 1n,
        uid: 'srm_123',
        studioId: 1n,
        name: 'Updated Room',
        capacity: 60,
        metadata: { type: 'live' },
        studio: {
          id: 1n,
          uid: 'studio_123',
          name: 'Studio A',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as const;

      (studioRoomServiceMock.updateStudioRoom as jest.Mock).mockResolvedValue(
        updated,
      );

      const result = await service.updateStudioRoom('srm_123', dto);

      expect(studioRoomServiceMock.updateStudioRoom).toHaveBeenCalledWith(
        'srm_123',
        dto,
        { studio: true },
      );
      expect(result).toEqual(updated);
    });

    it('updates studio room with valid studio_id', async () => {
      const dto = {
        studioId: 'studio_456',
        name: 'Updated Room',
        capacity: 60,
      } as UpdateStudioRoomDto;
      const studio = { id: 2n, uid: 'studio_456', name: 'Studio B' } as const;
      const updated = {
        id: 1n,
        uid: 'srm_123',
        studioId: 2n,
        name: 'Updated Room',
        capacity: 60,
        metadata: {},
        studio: {
          id: 2n,
          uid: 'studio_456',
          name: 'Studio B',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as const;

      (studioServiceMock.getStudioById as jest.Mock).mockResolvedValue(studio);
      (studioRoomServiceMock.updateStudioRoom as jest.Mock).mockResolvedValue(
        updated,
      );

      const result = await service.updateStudioRoom('srm_123', dto);

      expect(studioServiceMock.getStudioById).toHaveBeenCalledWith(
        'studio_456',
      );
      expect(studioRoomServiceMock.updateStudioRoom).toHaveBeenCalledWith(
        'srm_123',
        {
          name: 'Updated Room',
          capacity: 60,
          studio: { connect: { id: 2n } },
        },
        { studio: true },
      );
      expect(result).toEqual(updated);
    });

    it('throws error when studio_id is invalid', async () => {
      const dto = {
        studioId: 'studio_invalid',
        name: 'Updated Room',
        capacity: 60,
      } as UpdateStudioRoomDto;

      (studioServiceMock.getStudioById as jest.Mock).mockResolvedValue(null);

      await expect(service.updateStudioRoom('srm_123', dto)).rejects.toThrow(
        'studio_id: studio_invalid not found',
      );
      expect(studioServiceMock.getStudioById).toHaveBeenCalledWith(
        'studio_invalid',
      );
      expect(studioRoomServiceMock.updateStudioRoom).not.toHaveBeenCalled();
    });
  });

  describe('deleteStudioRoom', () => {
    it('deletes studio room successfully', async () => {
      const deleted = {
        id: 1n,
        uid: 'srm_123',
        studioId: 1n,
        name: 'Room A',
        capacity: 50,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      } as const;

      (studioRoomServiceMock.deleteStudioRoom as jest.Mock).mockResolvedValue(
        deleted,
      );

      const result = await service.deleteStudioRoom('srm_123');

      expect(studioRoomServiceMock.deleteStudioRoom).toHaveBeenCalledWith(
        'srm_123',
      );
      expect(result).toEqual(deleted);
    });
  });

  describe('getStudioRooms', () => {
    it('returns paginated studio rooms with studio information', async () => {
      const studioRooms = [
        {
          id: 1n,
          uid: 'srm_1',
          studioId: 1n,
          name: 'Room A',
          capacity: 50,
          metadata: {},
          studio: {
            id: 1n,
            uid: 'studio_123',
            name: 'Studio A',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'srm_2',
          studioId: 2n,
          name: 'Room B',
          capacity: 30,
          metadata: {},
          studio: {
            id: 2n,
            uid: 'studio_456',
            name: 'Studio B',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ] as const;

      (studioRoomServiceMock.getStudioRooms as jest.Mock).mockResolvedValue(
        studioRooms,
      );
      (studioRoomServiceMock.countStudioRooms as jest.Mock).mockResolvedValue(
        2,
      );
      (utilityServiceMock.createPaginationMeta as jest.Mock).mockReturnValue({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await service.getStudioRooms({
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      });

      expect(studioRoomServiceMock.getStudioRooms).toHaveBeenCalledWith(
        { skip: 0, take: 10 },
        { studio: true },
      );
      expect(studioRoomServiceMock.countStudioRooms).toHaveBeenCalledWith();
      expect(utilityServiceMock.createPaginationMeta).toHaveBeenCalledWith(
        1,
        10,
        2,
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(studioRooms[0]);
      expect(result.data[1]).toEqual(studioRooms[1]);

      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('returns empty data when no studio rooms exist', async () => {
      (studioRoomServiceMock.getStudioRooms as jest.Mock).mockResolvedValue([]);
      (studioRoomServiceMock.countStudioRooms as jest.Mock).mockResolvedValue(
        0,
      );
      (utilityServiceMock.createPaginationMeta as jest.Mock).mockReturnValue({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await service.getStudioRooms({
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('calculates pagination meta correctly for multiple pages', async () => {
      (studioRoomServiceMock.getStudioRooms as jest.Mock).mockResolvedValue([]);
      (studioRoomServiceMock.countStudioRooms as jest.Mock).mockResolvedValue(
        25,
      );
      (utilityServiceMock.createPaginationMeta as jest.Mock).mockReturnValue({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });

      const result = await service.getStudioRooms({
        page: 2,
        limit: 10,
        skip: 10,
        take: 10,
      });

      expect(utilityServiceMock.createPaginationMeta).toHaveBeenCalledWith(
        2,
        10,
        25,
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });
});
