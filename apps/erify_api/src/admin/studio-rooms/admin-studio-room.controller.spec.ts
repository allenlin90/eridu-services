import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminStudioRoomController } from './admin-studio-room.controller';

import type { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import type {
  CreateStudioRoomDto,
  UpdateStudioRoomDto,
} from '@/models/studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

describe('adminStudioRoomController', () => {
  let controller: AdminStudioRoomController;

  const mockStudioRoomService = {
    createStudioRoomFromDto: jest.fn(),
    getStudioRooms: jest.fn(),
    countStudioRooms: jest.fn(),
    getStudioRoomById: jest.fn(),
    updateStudioRoomFromDto: jest.fn(),
    deleteStudioRoom: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStudioRoomController],
      providers: [
        { provide: StudioRoomService, useValue: mockStudioRoomService },
      ],
    }).compile();

    controller = module.get<AdminStudioRoomController>(
      AdminStudioRoomController,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudioRoom', () => {
    it('should create a studio room', async () => {
      const createDto: CreateStudioRoomDto = {
        studioId: 'studio_123',
        name: 'Room 1',
        metadata: {},
      } as CreateStudioRoomDto;
      const createdRoom = { uid: 'studio_room_123', ...createDto };

      mockStudioRoomService.createStudioRoomFromDto.mockResolvedValue(
        createdRoom as any,
      );

      const result = await controller.createStudioRoom(createDto);
      expect(
        mockStudioRoomService.createStudioRoomFromDto,
      ).toHaveBeenCalledWith(createDto, { studio: true });
      expect(result).toEqual(createdRoom);
    });
  });

  describe('getStudioRooms', () => {
    it('should return paginated list of studio rooms', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const rooms = [
        { uid: 'studio_room_1', studioId: 'studio_1', name: 'Room 1' },
        { uid: 'studio_room_2', studioId: 'studio_2', name: 'Room 2' },
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

      mockStudioRoomService.getStudioRooms.mockResolvedValue(rooms as any);
      mockStudioRoomService.countStudioRooms.mockResolvedValue(total);

      const result = await controller.getStudioRooms(query);
      expect(mockStudioRoomService.getStudioRooms).toHaveBeenCalledWith(
        { skip: query.skip, take: query.take },
        { studio: true },
      );
      expect(mockStudioRoomService.countStudioRooms).toHaveBeenCalled();
      expect(result).toEqual({
        data: rooms,
        meta: paginationMeta,
      });
    });
  });

  describe('getStudioRoom', () => {
    it('should return a studio room by id', async () => {
      const roomId = 'studio_room_123';
      const room = {
        uid: roomId,
        studioId: 'studio_123',
        name: 'Room 1',
        studio: { uid: 'studio_123' },
      };

      mockStudioRoomService.getStudioRoomById.mockResolvedValue(room as any);

      const result = await controller.getStudioRoom(roomId);
      expect(mockStudioRoomService.getStudioRoomById).toHaveBeenCalledWith(
        roomId,
        {
          studio: true,
        },
      );
      expect(result).toEqual(room);
    });
  });

  describe('updateStudioRoom', () => {
    it('should update a studio room', async () => {
      const roomId = 'studio_room_123';
      const updateDto: UpdateStudioRoomDto = {
        name: 'Updated Room',
      } as UpdateStudioRoomDto;
      const updatedRoom = { uid: roomId, ...updateDto };

      mockStudioRoomService.updateStudioRoomFromDto.mockResolvedValue(
        updatedRoom as any,
      );

      const result = await controller.updateStudioRoom(roomId, updateDto);
      expect(
        mockStudioRoomService.updateStudioRoomFromDto,
      ).toHaveBeenCalledWith(roomId, updateDto, { studio: true });
      expect(result).toEqual(updatedRoom);
    });
  });

  describe('deleteStudioRoom', () => {
    it('should delete a studio room', async () => {
      const roomId = 'studio_room_123';

      mockStudioRoomService.deleteStudioRoom.mockResolvedValue(undefined);

      await controller.deleteStudioRoom(roomId);
      expect(mockStudioRoomService.deleteStudioRoom).toHaveBeenCalledWith(
        roomId,
      );
    });
  });
});
