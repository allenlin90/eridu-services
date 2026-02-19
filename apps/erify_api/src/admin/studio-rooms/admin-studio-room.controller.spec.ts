import { AdminStudioRoomController } from './admin-studio-room.controller';

import type {
  UpdateStudioRoomDto,
} from '@/models/studio-room/schemas/studio-room.schema';

describe('adminStudioRoomController', () => {
  let controller: AdminStudioRoomController;

  const mockStudioRoomService = {
    create: jest.fn(),
    getStudioRooms: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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

      mockStudioRoomService.getStudioRooms.mockResolvedValue({
        data: rooms,
        total,
      });

      const result = await controller.getStudioRooms(query as any);
      expect(mockStudioRoomService.getStudioRooms).toHaveBeenCalledWith(
        {
          skip: query.skip,
          take: query.take,
          studioUid: undefined,
          name: undefined,
          uid: undefined,
          includeStudio: true,
        },
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

      mockStudioRoomService.getStudioRooms.mockResolvedValue({
        data: rooms,
        total,
      });

      await controller.getStudioRooms(query as any);
      expect(mockStudioRoomService.getStudioRooms).toHaveBeenCalledWith(
        {
          skip: query.skip,
          take: query.take,
          name: 'test',
          uid: 'srm_123',
          includeStudio: true,
        },
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

      mockStudioRoomService.findOne.mockResolvedValue(room as any);

      const result = await controller.getStudioRoom(roomId);
      expect(mockStudioRoomService.findOne).toHaveBeenCalledWith(
        { uid: roomId },
        { studio: true },
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

      mockStudioRoomService.update.mockResolvedValue(
        updatedRoom as any,
      );

      const result = await controller.updateStudioRoom(roomId, updateDto);
      expect(
        mockStudioRoomService.update,
      ).toHaveBeenCalledWith(roomId, { ...updateDto, includeStudio: true });
      expect(result).toEqual(updatedRoom);
    });
  });

  describe('deleteStudioRoom', () => {
    it('should delete a studio room', async () => {
      const roomId = 'studio_room_123';

      mockStudioRoomService.findOne.mockResolvedValue({ uid: roomId } as any);
      mockStudioRoomService.softDelete.mockResolvedValue(undefined);

      await controller.deleteStudioRoom(roomId);
      expect(mockStudioRoomService.findOne).toHaveBeenCalledWith({ uid: roomId });
      expect(mockStudioRoomService.softDelete).toHaveBeenCalledWith({
        uid: roomId,
      });
    });
  });
});
