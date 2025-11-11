import { Test, TestingModule } from '@nestjs/testing';

import { UtilityService } from '@/utility/utility.service';

import { StudioRoomRepository } from './studio-room.repository';
import { StudioRoomService } from './studio-room.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('StudioRoomService', () => {
  let service: StudioRoomService;

  const studioRoomRepositoryMock: Partial<jest.Mocked<StudioRoomRepository>> = {
    create: jest.fn(),
    findByUid: jest.fn(),
    findActiveStudioRooms: jest.fn(),
    findByStudioId: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
  };

  const utilityServiceMock: Partial<jest.Mocked<UtilityService>> = {
    generateBrandedId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioRoomService,
        { provide: StudioRoomRepository, useValue: studioRoomRepositoryMock },
        { provide: UtilityService, useValue: utilityServiceMock },
      ],
    }).compile();

    service = module.get<StudioRoomService>(StudioRoomService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (utilityServiceMock.generateBrandedId as jest.Mock).mockReturnValue(
      'srm_test_id',
    );
  });

  describe('createStudioRoom', () => {
    it('creates studio room successfully', async () => {
      const data = {
        studio: { connect: { id: 1n } },
        name: 'Room A',
        capacity: 50,
        metadata: { type: 'recording' },
      };
      const created = {
        id: 1n,
        uid: 'srm_test_id',
        studioId: 1n,
        name: 'Room A',
        capacity: 50,
        metadata: { type: 'recording' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (studioRoomRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createStudioRoom(data);

      expect(utilityServiceMock.generateBrandedId).toHaveBeenCalledWith(
        'srm',
        undefined,
      );
      expect(studioRoomRepositoryMock.create).toHaveBeenCalledWith(
        { ...data, uid: 'srm_test_id' },
        undefined,
      );
      expect(result).toEqual(created);
    });

    it('creates studio room with include parameter', async () => {
      const data = {
        studio: { connect: { id: 1n } },
        name: 'Room A',
        capacity: 50,
        metadata: {},
      };
      const include = { studio: true };
      const created = {
        id: 1n,
        uid: 'srm_test_id',
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
      };

      (studioRoomRepositoryMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createStudioRoom(data, include);

      expect(studioRoomRepositoryMock.create).toHaveBeenCalledWith(
        { ...data, uid: 'srm_test_id' },
        include,
      );
      expect(result).toEqual(created);
    });
  });

  describe('getStudioRoomById', () => {
    it('returns studio room when found', async () => {
      const uid = 'srm_123';
      const studioRoom = {
        id: 1n,
        uid: 'srm_123',
        studioId: 1n,
        name: 'Room A',
        capacity: 50,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (studioRoomRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        studioRoom,
      );

      const result = await service.getStudioRoomById(uid);

      expect(studioRoomRepositoryMock.findByUid).toHaveBeenCalledWith(
        uid,
        undefined,
      );
      expect(result).toEqual(studioRoom);
    });

    it('throws NotFoundException when not found', async () => {
      const uid = 'srm_nonexistent';

      (studioRoomRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

      await expect(service.getStudioRoomById(uid)).rejects.toMatchObject({
        status: 404,
        message: 'Studio Room not found with id srm_nonexistent',
      });

      expect(studioRoomRepositoryMock.findByUid).toHaveBeenCalledWith(
        uid,
        undefined,
      );
    });

    it('returns studio room with include parameter', async () => {
      const uid = 'srm_123';
      const include = { studio: true };
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
      };

      (studioRoomRepositoryMock.findByUid as jest.Mock).mockResolvedValue(
        studioRoom,
      );

      const result = await service.getStudioRoomById(uid, include);

      expect(studioRoomRepositoryMock.findByUid).toHaveBeenCalledWith(
        uid,
        include,
      );
      expect(result).toEqual(studioRoom);
    });
  });

  describe('getStudioRooms', () => {
    it('returns studio rooms with pagination', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' as const },
      };
      const studioRooms = [
        {
          id: 1n,
          uid: 'srm_1',
          studioId: 1n,
          name: 'Room A',
          capacity: 50,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'srm_2',
          studioId: 1n,
          name: 'Room B',
          capacity: 30,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (
        studioRoomRepositoryMock.findActiveStudioRooms as jest.Mock
      ).mockResolvedValue(studioRooms);

      const result = await service.getStudioRooms(params);

      expect(
        studioRoomRepositoryMock.findActiveStudioRooms,
      ).toHaveBeenCalledWith(params, undefined);
      expect(result).toEqual(studioRooms);
    });

    it('returns studio rooms with include parameter', async () => {
      const params = {
        skip: 0,
        take: 10,
      };
      const include = { studio: true };
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
      ];

      (
        studioRoomRepositoryMock.findActiveStudioRooms as jest.Mock
      ).mockResolvedValue(studioRooms);

      const result = await service.getStudioRooms(params, include);

      expect(
        studioRoomRepositoryMock.findActiveStudioRooms,
      ).toHaveBeenCalledWith(params, include);
      expect(result).toEqual(studioRooms);
    });
  });

  describe('getStudioRoomsByStudioId', () => {
    it('returns studio rooms for specific studio', async () => {
      const studioId = 1n;
      const studioRooms = [
        {
          id: 1n,
          uid: 'srm_1',
          studioId: 1n,
          name: 'Room A',
          capacity: 50,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (studioRoomRepositoryMock.findByStudioId as jest.Mock).mockResolvedValue(
        studioRooms,
      );

      const result = await service.getStudioRoomsByStudioId(studioId);

      expect(studioRoomRepositoryMock.findByStudioId).toHaveBeenCalledWith(
        studioId,
      );
      expect(result).toEqual(studioRooms);
    });
  });

  describe('updateStudioRoom', () => {
    it('updates studio room successfully', async () => {
      const uid = 'srm_123';
      const data = {
        name: 'Updated Room',
        capacity: 60,
        metadata: { type: 'live' },
      };
      const updated = {
        id: 1n,
        uid: 'srm_123',
        studioId: 1n,
        name: 'Updated Room',
        capacity: 60,
        metadata: { type: 'live' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (studioRoomRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateStudioRoom(uid, data);

      expect(studioRoomRepositoryMock.update).toHaveBeenCalledWith(
        { uid },
        data,
        undefined,
      );
      expect(result).toEqual(updated);
    });

    it('updates studio room with include parameter', async () => {
      const uid = 'srm_123';
      const data = {
        name: 'Updated Room',
        capacity: 60,
      };
      const include = { studio: true };
      const updated = {
        id: 1n,
        uid: 'srm_123',
        studioId: 1n,
        name: 'Updated Room',
        capacity: 60,
        metadata: {},
        studio: {
          id: 1n,
          uid: 'studio_123',
          name: 'Studio A',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (studioRoomRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateStudioRoom(uid, data, include);

      expect(studioRoomRepositoryMock.update).toHaveBeenCalledWith(
        { uid },
        data,
        include,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteStudioRoom', () => {
    it('deletes studio room successfully', async () => {
      const uid = 'srm_123';
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
      };

      (studioRoomRepositoryMock.softDelete as jest.Mock).mockResolvedValue(
        deleted,
      );

      const result = await service.deleteStudioRoom(uid);

      expect(studioRoomRepositoryMock.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(deleted);
    });
  });

  describe('countStudioRooms', () => {
    it('returns total count of studio rooms', async () => {
      const total = 5;

      (studioRoomRepositoryMock.count as jest.Mock).mockResolvedValue(total);

      const result = await service.countStudioRooms();

      expect(studioRoomRepositoryMock.count).toHaveBeenCalledWith({});
      expect(result).toBe(total);
    });
  });

  describe('countStudioRoomsByStudioId', () => {
    it('returns count of studio rooms for specific studio', async () => {
      const studioId = 1n;
      const count = 3;

      (studioRoomRepositoryMock.count as jest.Mock).mockResolvedValue(count);

      const result = await service.countStudioRoomsByStudioId(studioId);

      expect(studioRoomRepositoryMock.count).toHaveBeenCalledWith({ studioId });
      expect(result).toBe(count);
    });
  });
});
