import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { showCreatorCompensationSummarySchema } from '@eridu/api-types/studio-creators';

import type { BulkAssignStudioShowCreatorsDto } from './schemas/studio-show-creator-assignment.schema';
import { StudioShowController } from './studio-show.controller';
import { StudioShowManagementService } from './studio-show-management.service';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';
import { ClientMechanicService } from '@/models/client-mechanic/client-mechanic.service';
import type { CreateStudioShowDto, UpdateStudioShowDto } from '@/models/show/schemas/show.schema';
import { CreatorCompensationService } from '@/show-orchestration/creator-compensation.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { ShowRunReviewService } from '@/show-orchestration/show-run-review.service';
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
    bulkAssignCreatorsToShow: jest.fn(),
    removeCreatorsFromShow: jest.fn(),
  };

  const showRunReviewServiceMock = {
    getShowRunReviewSummary: jest.fn(),
  };

  const creatorCompensationServiceMock = {
    getCreatorCompensationSummaryForShow: jest.fn(),
  };

  const studioShowManagementServiceMock = {
    getShowDetail: jest.fn(),
    createShow: jest.fn(),
    updateShow: jest.fn(),
    deleteShow: jest.fn(),
    cancelShowWithResolution: jest.fn(),
    resolveShowCancellation: jest.fn(),
    amendCancellationNote: jest.fn(),
    getCancellationStatus: jest.fn(),
  };

  const clientMechanicServiceMock = {
    getShowMechanicsCoverage: jest.fn(),
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
          provide: ShowRunReviewService,
          useValue: showRunReviewServiceMock,
        },
        {
          provide: CreatorCompensationService,
          useValue: creatorCompensationServiceMock,
        },
        {
          provide: StudioShowManagementService,
          useValue: studioShowManagementServiceMock,
        },
        {
          provide: ClientMechanicService,
          useValue: clientMechanicServiceMock,
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

      const result = await controller.creators(studioId, showId, { studioMembership: { role: 'admin' } } as any);

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
      creatorCompensationServiceMock.getCreatorCompensationSummaryForShow.mockResolvedValue({
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
      expect(creatorCompensationServiceMock.getCreatorCompensationSummaryForShow)
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
      const query = {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      };
      const expectedSummary = { shows: { total_count: 1 } };

      showRunReviewServiceMock.getShowRunReviewSummary.mockResolvedValue(expectedSummary);

      const result = await controller.runReview(studioId, query);

      expect(showRunReviewServiceMock.getShowRunReviewSummary).toHaveBeenCalledWith(studioId, query);
      expect(result).toEqual(expectedSummary);
    });
  });

  describe('aCCOUNT_MANAGER money redaction', () => {
    const studioId = 'std_123';
    const showId = 'show_123';
    const mockAMRequest = {
      studioMembership: {
        role: 'account_manager',
      },
    } as any;

    it('should redact agreed_rate, commission_rate, and compensation_type on creators in index', async () => {
      taskOrchestrationServiceMock.getStudioShowsWithTaskSummary.mockResolvedValue({
        data: [
          {
            uid: showId,
            creators: [
              {
                show_creator_id: 'sc_1',
                creator_id: 'cr_1',
                creator_name: 'Alice',
                creator_alias_name: 'Ali',
                compensation_type: 'FIXED',
                agreed_rate: '150.00',
                commission_rate: '10.00',
              },
            ],
          },
        ],
        total: 1,
      });

      const response = await controller.index(studioId, { skip: 0, take: 10 } as any, mockAMRequest);
      expect(response.data[0].creators[0].agreed_rate).toBeNull();
      expect(response.data[0].creators[0].commission_rate).toBeNull();
      expect(response.data[0].creators[0].compensation_type).toBeNull();
    });

    it('should redact gmv, ctr, and cto inside showPlatforms in show detail', async () => {
      studioShowManagementServiceMock.getShowDetail.mockResolvedValue({
        uid: showId,
        showPlatforms: [
          {
            uid: 'sp_1',
            platform: { uid: 'plt_1', name: 'Youtube' },
            liveStreamLink: 'https://youtube.com/live',
            platformShowId: 'yt_123',
            viewerCount: 42,
            gmv: '1000.00',
            ctr: '5.20',
            cto: '1.50',
          },
        ],
      });

      const response = await controller.show(studioId, showId, mockAMRequest);
      expect(response.showPlatforms[0].gmv).toBeNull();
      expect(response.showPlatforms[0].ctr).toBeNull();
      expect(response.showPlatforms[0].cto).toBeNull();
      expect(response.showPlatforms[0].uid).toBe('sp_1');
      expect(response.showPlatforms[0].viewerCount).toBe(42);
    });

    it('should redact agreed_rate, commission_rate, and compensation_type in show creators list', async () => {
      taskOrchestrationServiceMock.getStudioShow.mockResolvedValue({ uid: showId });
      showOrchestrationServiceMock.listCreatorsForShow.mockResolvedValue([
        {
          id: 'show_mc_1',
          creatorId: 'creator_1',
          creatorName: 'Alice',
          creatorAliasName: 'Ali',
          note: 'host',
          agreedRate: '150.00',
          compensationType: 'FIXED',
          commissionRate: '10.00',
          metadata: {},
        },
      ]);

      const response = await controller.creators(studioId, showId, mockAMRequest);
      expect(response[0].agreed_rate).toBeNull();
      expect(response[0].commission_rate).toBeNull();
      expect(response[0].compensation_type).toBeNull();
    });

    it('should strip the legacy audit sidecar from metadata in show creators list, since it carries historical rate values', async () => {
      taskOrchestrationServiceMock.getStudioShow.mockResolvedValue({ uid: showId });
      showOrchestrationServiceMock.listCreatorsForShow.mockResolvedValue([
        {
          id: 'show_mc_1',
          creatorId: 'creator_1',
          creatorName: 'Alice',
          creatorAliasName: 'Ali',
          note: 'host',
          agreedRate: '150.00',
          compensationType: 'FIXED',
          commissionRate: '10.00',
          metadata: {
            tags: ['vip'],
            audit: {
              snapshot_overrides: [
                { field: 'agreed_rate', old_value: '100.00', new_value: '150.00' },
              ],
            },
          },
        },
      ]);

      const response = await controller.creators(studioId, showId, mockAMRequest);
      expect(response[0].metadata).toEqual({ tags: ['vip'] });
    });
  });

  describe('tasks', () => {
    it('excludes ACCOUNT_MANAGER, since submitted task content is an unstructured blob that can carry money values', () => {
      const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioShowController.prototype.tasks);
      expect(roles).not.toContain(STUDIO_ROLE.ACCOUNT_MANAGER);
    });
  });

  describe('cancelWithResolution', () => {
    it('passes studioMembership.role and the actor ext_id through to the service', async () => {
      const request = { studioMembership: { role: STUDIO_ROLE.MANAGER } } as any;
      const user = { ext_id: 'ext_5' } as any;
      const body = { reason_category: 'EQUIPMENT_FAILURE', reason_note: 'note', outcome: 'CANCELLED' } as any;
      studioShowManagementServiceMock.cancelShowWithResolution.mockResolvedValue({ uid: 'show_123' });

      await controller.cancelWithResolution('std_123', 'show_123', body, user, request);

      expect(studioShowManagementServiceMock.cancelShowWithResolution).toHaveBeenCalledWith(
        'std_123',
        'show_123',
        body,
        STUDIO_ROLE.MANAGER,
        'ext_5',
      );
    });

    it('is open to any studio member at the decorator level (service enforces the actual tier)', () => {
      const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioShowController.prototype.cancelWithResolution);
      expect(roles).toEqual([]);
    });
  });

  describe('resolveCancellation', () => {
    it('passes studioMembership.role and the actor ext_id through to the service', async () => {
      const request = { studioMembership: { role: STUDIO_ROLE.MANAGER } } as any;
      const user = { ext_id: 'ext_5' } as any;
      const body = { outcome: 'CANCELLED', resolution_notes: 'note' } as any;
      studioShowManagementServiceMock.resolveShowCancellation.mockResolvedValue({ uid: 'show_123' });

      await controller.resolveCancellation('std_123', 'show_123', body, user, request);

      expect(studioShowManagementServiceMock.resolveShowCancellation).toHaveBeenCalledWith(
        'std_123',
        'show_123',
        body,
        STUDIO_ROLE.MANAGER,
        'ext_5',
      );
    });
  });

  describe('amendCancellationNote', () => {
    it('passes studioMembership.role and the actor ext_id through to the service', async () => {
      const request = { studioMembership: { role: STUDIO_ROLE.MEMBER } } as any;
      const user = { ext_id: 'ext_7' } as any;
      const body = { reason_note: 'Updated' } as any;
      studioShowManagementServiceMock.amendCancellationNote.mockResolvedValue({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Updated',
        openedBy: { uid: 'user_abc123', name: 'Jane Duty' },
        openedAt: new Date('2026-06-25T16:14:30.201Z'),
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [],
      });

      await controller.amendCancellationNote('std_123', 'show_123', body, user, request);

      expect(studioShowManagementServiceMock.amendCancellationNote).toHaveBeenCalledWith(
        'std_123',
        'show_123',
        body,
        STUDIO_ROLE.MEMBER,
        'ext_7',
      );
    });
  });

  describe('cancellationStatus', () => {
    it('delegates to the service and maps the result to snake_case API shape', async () => {
      studioShowManagementServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: false,
        gateKind: null,
        fromStatus: null,
        reasonCategory: null,
        reasonNote: null,
        openedBy: null,
        openedAt: null,
        allowedOutcomes: [],
        history: [],
      });

      const result = await controller.cancellationStatus('std_123', 'show_123');

      expect(studioShowManagementServiceMock.getCancellationStatus).toHaveBeenCalledWith('std_123', 'show_123');
      expect(result).toEqual({
        is_pending: false,
        gate_kind: null,
        from_status: null,
        reason_category: null,
        reason_note: null,
        opened_by: null,
        opened_at: null,
        allowed_outcomes: [],
        history: [],
      });
    });

    it('converts Date fields to ISO strings for a pending result with history', async () => {
      const openedAt = new Date('2026-06-25T16:14:30.201Z');
      studioShowManagementServiceMock.getCancellationStatus.mockResolvedValue({
        isPending: true,
        gateKind: 'show_cancellation',
        fromStatus: 'CONFIRMED',
        reasonCategory: 'EQUIPMENT_FAILURE',
        reasonNote: 'Camera failed',
        openedBy: { uid: 'user_abc123', name: 'Jane Duty' },
        openedAt,
        allowedOutcomes: ['CANCELLED', 'COMPLETED'],
        history: [{ event: 'opened', actor: { uid: 'user_abc123', name: 'Jane Duty' }, at: openedAt, note: 'Camera failed', outcome: null }],
      });

      const result = await controller.cancellationStatus('std_123', 'show_123');

      expect(result.opened_at).toBe('2026-06-25T16:14:30.201Z');
      expect(result.history[0].at).toBe('2026-06-25T16:14:30.201Z');
    });
  });

  describe('mechanicsCoverage', () => {
    it('restricts mechanics-coverage to ADMIN, MANAGER and ACCOUNT_MANAGER only', () => {
      const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioShowController.prototype.mechanicsCoverage);
      expect(roles).toEqual([
        STUDIO_ROLE.ADMIN,
        STUDIO_ROLE.MANAGER,
        STUDIO_ROLE.ACCOUNT_MANAGER,
      ]);
    });

    it('should delegate to clientMechanicService.getShowMechanicsCoverage', async () => {
      const studioId = 'std_123';
      const showId = 'show_123';
      const expectedResponse = {
        show_uid: showId,
        show_name: 'Show A',
        client_uid: 'client_1',
        client_name: 'Client 1',
        mechanics: [],
      };

      clientMechanicServiceMock.getShowMechanicsCoverage.mockResolvedValue(expectedResponse);

      const result = await controller.mechanicsCoverage(studioId, showId);

      expect(clientMechanicServiceMock.getShowMechanicsCoverage).toHaveBeenCalledWith(studioId, showId);
      expect(result).toBe(expectedResponse);
    });
  });
});
