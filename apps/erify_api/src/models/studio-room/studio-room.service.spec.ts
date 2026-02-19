import { StudioRoomRepository } from './studio-room.repository';
import { StudioRoomService } from './studio-room.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import type { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('studioRoomService', () => {
  let service: StudioRoomService;
  let studioRoomRepositoryMock: Partial<jest.Mocked<StudioRoomRepository>>;
  let utilityServiceMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    studioRoomRepositoryMock = createMockRepository<StudioRoomRepository>({
      create: jest.fn(),
      findOne: jest.fn(),
      findPaginated: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    });

    utilityServiceMock = createMockUtilityService('srm_test_id');

    const module = await createModelServiceTestModule({
      serviceClass: StudioRoomService,
      repositoryClass: StudioRoomRepository,
      repositoryMock: studioRoomRepositoryMock,
      utilityMock: utilityServiceMock,
    });

    service = module.get<StudioRoomService>(StudioRoomService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  describe('createStudioRoom', () => {
    it('creates studio room successfully', async () => {
      const data = {
        studioId: 'studio_123',
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

      const result = await service.create(data);

      const { studioId, ...dataWithoutStudioId } = data;
      expect(studioRoomRepositoryMock.create).toHaveBeenCalledWith(
        {
          ...dataWithoutStudioId,
          studio: { connect: { uid: studioId } },
          uid: 'srm_test_id',
        },
      );
      expect(result).toEqual(created);
    });

    it('creates studio room with include parameter', async () => {
      const data = {
        studioId: 'studio_123',
        name: 'Room A',
        capacity: 50,
        metadata: {},
        includeStudio: true,
      };
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

      const result = await service.create(data);

      const { studioId, includeStudio: _includeStudio, ...dataWithoutStudioId } = data;
      expect(studioRoomRepositoryMock.create).toHaveBeenCalledWith(
        {
          ...dataWithoutStudioId,
          studio: { connect: { uid: studioId } },
          uid: 'srm_test_id',
        },
        { studio: true },
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

      (studioRoomRepositoryMock.findOne as jest.Mock).mockResolvedValue(
        studioRoom,
      );

      const result = await service.findOne({ uid });

      expect(studioRoomRepositoryMock.findOne).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(studioRoom);
    });

    it('returns null when not found', async () => {
      (studioRoomRepositoryMock.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne({ uid: 'srm_nonexistent' });

      expect(result).toBeNull();
      expect(studioRoomRepositoryMock.findOne).toHaveBeenCalledWith({
        uid: 'srm_nonexistent',
      });
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

      (studioRoomRepositoryMock.findOne as jest.Mock).mockResolvedValue(
        studioRoom,
      );

      const result = await service.findOne(
        { uid },
        include,
      );

      expect(studioRoomRepositoryMock.findOne).toHaveBeenCalledWith(
        { uid },
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
        orderBy: 'asc' as const,
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
        studioRoomRepositoryMock.findPaginated as jest.Mock
      ).mockResolvedValue({ data: studioRooms, total: 2 });

      const result = await service.getStudioRooms(params);

      expect(studioRoomRepositoryMock.findPaginated).toHaveBeenCalledWith(params);
      expect(result).toEqual({ data: studioRooms, total: 2 });
    });

    it('returns studio rooms with include parameter', async () => {
      const params = {
        skip: 0,
        take: 10,
      };
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
        studioRoomRepositoryMock.findPaginated as jest.Mock
      ).mockResolvedValue({ data: studioRooms, total: 1 });

      const result = await service.getStudioRooms({ ...params, includeStudio: true });

      expect(studioRoomRepositoryMock.findPaginated).toHaveBeenCalledWith({
        ...params,
        includeStudio: true,
      });
      expect(result).toEqual({ data: studioRooms, total: 1 });
    });

    it('returns studio rooms filtered by studioId', async () => {
      const params = {
        skip: 0,
        take: 10,
        studioUid: 'studio_123',
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
      ];

      (
        studioRoomRepositoryMock.findPaginated as jest.Mock
      ).mockResolvedValue({ data: studioRooms, total: 1 });

      const result = await service.getStudioRooms(params);

      expect(studioRoomRepositoryMock.findPaginated).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        studioUid: 'studio_123',
      });
      expect(result).toEqual({ data: studioRooms, total: 1 });
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

      const result = await service.update(uid, data);

      expect(studioRoomRepositoryMock.update).toHaveBeenCalledWith(
        { uid },
        expect.objectContaining(data),
      );
      expect(result).toEqual(updated);
    });

    it('updates studio room with include parameter', async () => {
      const uid = 'srm_123';
      const data = {
        name: 'Updated Room',
        capacity: 60,
      };
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

      const result = await service.update(uid, { ...data, includeStudio: true });

      expect(studioRoomRepositoryMock.update).toHaveBeenCalledWith(
        { uid },
        expect.objectContaining(data),
        { studio: true },
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

      const result = await service.softDelete({ uid });

      expect(studioRoomRepositoryMock.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(deleted);
    });
  });
});
