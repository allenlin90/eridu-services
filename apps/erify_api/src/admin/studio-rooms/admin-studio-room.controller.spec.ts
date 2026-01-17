import { AdminStudioRoomController } from './admin-studio-room.controller';

import type {
  UpdateStudioRoomDto,
} from '@/models/studio-room/schemas/studio-room.schema';

describe('adminStudioRoomController', () => {
  let controller: AdminStudioRoomController;

  const mockStudioRoomService = {
    createStudioRoomFromDto: jest.fn(),
    listStudioRooms: jest.fn(),
    getStudioRoomById: jest.fn(),
    updateStudioRoomFromDto: jest.fn(),
    deleteStudioRoom: jest.fn(),
  };

  beforeEach(() => {
    controller = new AdminStudioRoomController(mockStudioRoomService as any);
  });

  describe('getStudioRooms', () => {
    it('should return paginated list of studio rooms', async () => {
      const query = {
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

      mockStudioRoomService.listStudioRooms.mockResolvedValue({
        data: rooms,
        total,
      });

      const result = await controller.getStudioRooms(query as any);
      expect(mockStudioRoomService.listStudioRooms).toHaveBeenCalledWith(
        { skip: query.skip, take: query.take, where: {} },
        { studio: true },
      );
      expect(result).toEqual({
        data: rooms,
        meta: paginationMeta,
      });
    });

    it('should filter by name and id', async () => {
      const query = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        name: 'test',
        id: 'srm_123',
      };
      const rooms = [
        { uid: 'srm_123', studioId: 'studio_1', name: 'test room' },
      ];
      const total = 1;

      mockStudioRoomService.listStudioRooms.mockResolvedValue({
        data: rooms,
        total,
      });

      await controller.getStudioRooms(query as any);
      expect(mockStudioRoomService.listStudioRooms).toHaveBeenCalledWith(
        {
          skip: query.skip,
          take: query.take,
          where: {
            name: { contains: 'test', mode: 'insensitive' },
            uid: 'srm_123',
          },
        },
        { studio: true },
      );
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
