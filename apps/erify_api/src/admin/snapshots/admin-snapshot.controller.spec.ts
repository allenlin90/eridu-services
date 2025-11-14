import { Test, TestingModule } from '@nestjs/testing';

import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import { UserService } from '@/models/user/user.service';
import { SchedulePlanningService } from '@/schedule-planning/schedule-planning.service';
import { UtilityService } from '@/utility/utility.service';

import { AdminSnapshotController } from './admin-snapshot.controller';

describe('AdminSnapshotController', () => {
  let controller: AdminSnapshotController;

  const mockScheduleSnapshotService = {
    getScheduleSnapshotById: jest.fn(),
  };

  const mockSchedulePlanningService = {
    restoreFromSnapshot: jest.fn(),
  };

  const mockUserService = {
    getUserById: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSnapshotController],
      providers: [
        {
          provide: ScheduleSnapshotService,
          useValue: mockScheduleSnapshotService,
        },
        {
          provide: SchedulePlanningService,
          useValue: mockSchedulePlanningService,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    controller = module.get<AdminSnapshotController>(AdminSnapshotController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSnapshot', () => {
    it('should return a snapshot by id', async () => {
      const snapshotId = 'snapshot_123';
      const snapshot = {
        uid: snapshotId,
        scheduleId: 'schedule_123',
        userId: 1,
        schedule: {
          uid: 'schedule_123',
          client: { uid: 'client_123' },
          createdByUser: { uid: 'user_123' },
          publishedByUser: null,
        },
        user: { uid: 'user_123' },
      };

      mockScheduleSnapshotService.getScheduleSnapshotById.mockResolvedValue(
        snapshot as any,
      );

      const result = await controller.getSnapshot(snapshotId);

      expect(
        mockScheduleSnapshotService.getScheduleSnapshotById,
      ).toHaveBeenCalledWith(snapshotId, {
        schedule: {
          include: {
            client: true,
            createdByUser: true,
            publishedByUser: true,
          },
        },
        user: true,
      });
      expect(result).toEqual(snapshot);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('should restore a schedule from snapshot', async () => {
      const snapshotId = 'snapshot_123';
      const userId = 'user_123';
      const user = { uid: userId, id: 1 };
      const restoredSchedule = {
        uid: 'schedule_123',
        name: 'Restored Schedule',
      };

      mockUserService.getUserById.mockResolvedValue(user as any);
      mockSchedulePlanningService.restoreFromSnapshot.mockResolvedValue(
        restoredSchedule as any,
      );

      const result = await controller.restoreFromSnapshot(snapshotId, {
        user_id: userId,
      });

      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(
        mockSchedulePlanningService.restoreFromSnapshot,
      ).toHaveBeenCalledWith(snapshotId, user.id);
      expect(result).toEqual(restoredSchedule);
    });
  });
});
