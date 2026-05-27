import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { showCreatorCompensationSummarySchema } from '@eridu/api-types/studio-creators';

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
    updateCreatorForShow: jest.fn(),
    getCreatorCompensationSummaryForShow: jest.fn(),
    bulkAssignCreatorsToShow: jest.fn(),
    removeCreatorsFromShow: jest.fn(),
    getShowRunReviewSummary: jest.fn(),
  };

  const studioShowManagementServiceMock = {
    getShowDetail: jest.fn(),
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

      const mockUser = { ext_id: 'actor_123' } as any;
      const result = await controller.bulkAssignCreators(studioId, showId, dto, mockUser);

      expect(taskOrchestrationServiceMock.getStudioShow).toHaveBeenCalledWith(studioId, showId);
      expect(showOrchestrationServiceMock.bulkAssignCreatorsToShow).toHaveBeenCalledWith(
        studioId,
        showId,
        dto.creators,
        'actor_123',
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
          id: 'show_mc_1',
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
          id: 'show_mc_1',
          creator_id: 'creator_1',
          creator_name: 'Alice',
          creator_alias_name: 'Ali',
        }),
      ]);
    });

    it('should validate studio show and return creator compensation summary', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';

      taskOrchestrationServiceMock.getStudioShow.mockResolvedValue({ uid: showId });
      showOrchestrationServiceMock.getCreatorCompensationSummaryForShow.mockResolvedValue({
        showId,
        totalAmount: '120.00',
        unresolvedCount: 0,
        creators: [
          {
            showCreatorId: 'show_mc_1',
            creatorId: 'creator_1',
            creatorName: 'Alice',
            creatorAliasName: 'Ali',
            compensationType: 'FIXED',
            agreedRate: '100.00',
            commissionRate: null,
            baseAmount: '100.00',
            adjustmentTotal: '20.00',
            totalAmount: '120.00',
            unresolvedReason: null,
          },
        ],
      });

      const result = await controller.creatorCompensationSummary(studioId, showId);

      expect(taskOrchestrationServiceMock.getStudioShow).toHaveBeenCalledWith(studioId, showId);
      expect(showOrchestrationServiceMock.getCreatorCompensationSummaryForShow)
        .toHaveBeenCalledWith(studioId, showId);
      expect(() => showCreatorCompensationSummarySchema.parse(result)).not.toThrow();
      expect(result).toEqual(expect.objectContaining({
        show_id: showId,
        total_amount: '120.00',
        unresolved_count: 0,
      }));
    });

    it('should validate studio show and update creator assignment compensation terms', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';
      const showCreatorId = 'show_mc_1';
      const dto = {
        note: 'Updated assignment',
        agreedRate: '175',
        compensationType: 'FIXED',
        commissionRate: null,
        overrideReason: 'Negotiated for this show',
      } as any;

      taskOrchestrationServiceMock.getStudioShow.mockResolvedValue({ uid: showId });
      showOrchestrationServiceMock.updateCreatorForShow.mockResolvedValue({
        creatorId: 'creator_1',
        id: showCreatorId,
        creatorName: 'Alice',
        creatorAliasName: 'Ali',
        note: 'Updated assignment',
        agreedRate: '175.00',
        compensationType: 'FIXED',
        commissionRate: null,
        metadata: {},
      });

      const result = await controller.updateCreatorAssignment(
        studioId,
        showId,
        showCreatorId,
        dto,
        { ext_id: 'actor_123' } as any,
      );

      expect(taskOrchestrationServiceMock.getStudioShow).toHaveBeenCalledWith(studioId, showId);
      expect(showOrchestrationServiceMock.updateCreatorForShow).toHaveBeenCalledWith(
        showId,
        showCreatorId,
        dto,
        'actor_123',
      );
      expect(result).toEqual(expect.objectContaining({
        id: showCreatorId,
        agreed_rate: '175.00',
        compensation_type: 'FIXED',
      }));
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

  describe('runReview', () => {
    it('should retrieve the operational summary for show run review', async () => {
      const studioId = 'std_123';
      const query = { date_from: '2026-05-12', date_to: '2026-05-12' };
      const expectedSummary = { shows: { total_count: 1 } };

      showOrchestrationServiceMock.getShowRunReviewSummary.mockResolvedValue(expectedSummary);

      const result = await controller.runReview(studioId, query);

      expect(showOrchestrationServiceMock.getShowRunReviewSummary).toHaveBeenCalledWith(studioId, query);
      expect(result).toEqual(expectedSummary);
    });
  });
});
