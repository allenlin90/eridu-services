import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { BulkAssignStudioShowCreatorsDto } from './schemas/studio-show-creator-assignment.schema';
import { StudioShowController } from './studio-show.controller';
import { StudioShowManagementService } from './studio-show-management.service';

import type { CreateStudioShowDto, UpdateStudioShowDto } from '@/models/show/schemas/show.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

describe('studioShowController', () => {
  let controller: StudioShowController;

  const taskOrchestrationServiceMock = {
    getStudioShowsWithTaskSummary: jest.fn(),
    getStudioShow: jest.fn(),
    getShowTasks: jest.fn(),
  };

  const showOrchestrationServiceMock = {
    listCreatorsForShow: jest.fn(),
    bulkAssignCreatorsToShow: jest.fn(),
    removeCreatorsFromShow: jest.fn(),
  };

  const studioShowManagementServiceMock = {
    createShow: jest.fn(),
    updateShow: jest.fn(),
    deleteShow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioShowController],
      providers: [
        {
          provide: TaskOrchestrationService,
          useValue: taskOrchestrationServiceMock,
        },
        {
          provide: ShowOrchestrationService,
          useValue: showOrchestrationServiceMock,
        },
        {
          provide: StudioShowManagementService,
          useValue: studioShowManagementServiceMock,
        },
      ],
    }).compile();

    controller = module.get<StudioShowController>(StudioShowController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkAssignCreators', () => {
    it('should validate studio show and bulk assign creators', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';
      const dto: BulkAssignStudioShowCreatorsDto = {
        creators: [
          {
            creatorId: 'creator_1',
            note: 'Host',
            agreedRate: '100.00',
            compensationType: 'FIXED',
            commissionRate: '5.00',
            metadata: {},
          },
        ],
      };

      taskOrchestrationServiceMock.getStudioShow.mockResolvedValue({ uid: showId });
      showOrchestrationServiceMock.bulkAssignCreatorsToShow.mockResolvedValue({
        assigned: 1,
        skipped: 0,
        failed: [],
      });

      const result = await controller.bulkAssignCreators(studioId, showId, dto);

      expect(taskOrchestrationServiceMock.getStudioShow).toHaveBeenCalledWith(studioId, showId);
      expect(showOrchestrationServiceMock.bulkAssignCreatorsToShow).toHaveBeenCalledWith(
        studioId,
        showId,
        dto.creators,
      );
      expect(result).toEqual({ assigned: 1, skipped: 0, failed: [] });
    });
  });

  describe('create', () => {
    it('should create a studio-scoped show', async () => {
      const studioId = 'std_123';
      const dto = {
        clientId: 'cli_1',
        showTypeId: 'sht_1',
        showStatusId: 'shs_1',
        showStandardId: 'shn_1',
        studioRoomId: 'srm_1',
        name: 'Studio Show',
        startTime: new Date('2026-04-02T10:00:00.000Z'),
        endTime: new Date('2026-04-02T12:00:00.000Z'),
        platformIds: ['plt_1'],
      } as CreateStudioShowDto;

      studioShowManagementServiceMock.createShow.mockResolvedValue({ id: 'show_123' });

      const result = await controller.create(studioId, dto);

      expect(studioShowManagementServiceMock.createShow).toHaveBeenCalledWith(studioId, dto);
      expect(result).toEqual({ id: 'show_123' });
    });
  });

  describe('update', () => {
    it('should update a studio-scoped show', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';
      const dto = {
        name: 'Updated Show',
        platformIds: ['plt_1', 'plt_2'],
      } as UpdateStudioShowDto;

      studioShowManagementServiceMock.updateShow.mockResolvedValue({ id: showId });

      const result = await controller.update(studioId, showId, dto);

      expect(studioShowManagementServiceMock.updateShow).toHaveBeenCalledWith(studioId, showId, dto);
      expect(result).toEqual({ id: showId });
    });
  });

  describe('delete', () => {
    it('should delete a studio-scoped show', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';

      studioShowManagementServiceMock.deleteShow.mockResolvedValue(undefined);

      await controller.delete(studioId, showId);

      expect(studioShowManagementServiceMock.deleteShow).toHaveBeenCalledWith(studioId, showId);
    });
  });

  describe('creators', () => {
    it('should validate studio show and list assigned creators', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';

      taskOrchestrationServiceMock.getStudioShow.mockResolvedValue({ uid: showId });
      showOrchestrationServiceMock.listCreatorsForShow.mockResolvedValue([
        {
          creatorId: 'creator_1',
          creatorName: 'Alice',
          creatorAliasName: 'Ali',
          note: 'Primary host',
          agreedRate: '120.00',
          compensationType: 'FIXED',
          commissionRate: null,
          metadata: {},
        },
      ]);

      const result = await controller.creators(studioId, showId);

      expect(taskOrchestrationServiceMock.getStudioShow).toHaveBeenCalledWith(studioId, showId);
      expect(showOrchestrationServiceMock.listCreatorsForShow).toHaveBeenCalledWith(showId);
      expect(result).toEqual([
        expect.objectContaining({
          creator_id: 'creator_1',
          creator_name: 'Alice',
          creator_alias_name: 'Ali',
        }),
      ]);
    });
  });

  describe('removeCreator', () => {
    it('should validate studio show and remove creator assignment', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';
      const creatorId = 'creator_1';

      taskOrchestrationServiceMock.getStudioShow.mockResolvedValue({ uid: showId });
      showOrchestrationServiceMock.removeCreatorsFromShow.mockResolvedValue(undefined);

      await controller.removeCreator(studioId, showId, creatorId);

      expect(taskOrchestrationServiceMock.getStudioShow).toHaveBeenCalledWith(studioId, showId);
      expect(showOrchestrationServiceMock.removeCreatorsFromShow).toHaveBeenCalledWith(showId, [creatorId]);
    });
  });
});
