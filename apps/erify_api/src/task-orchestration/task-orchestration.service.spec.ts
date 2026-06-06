import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TaskStatus, TaskType } from '@prisma/client';

import { TaskGenerationProcessor } from './task-generation-processor.service';
import { TaskOrchestrationService } from './task-orchestration.service';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { showDtoListInclude } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { showWithTaskSummaryDto } from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import { FactExtractionService } from '@/orchestration/fact-extraction/fact-extraction.service';
import { ShiftAlignmentService } from '@/orchestration/shift-alignment/shift-alignment.service';

describe('taskOrchestrationService', () => {
  let service: TaskOrchestrationService;
  let taskService: jest.Mocked<TaskService>;
  let taskTemplateService: jest.Mocked<TaskTemplateService>;
  let showService: jest.Mocked<ShowService>;
  let studioMembershipService: jest.Mocked<StudioMembershipService>;
  let taskGenerationProcessor: jest.Mocked<TaskGenerationProcessor>;
  let studioService: jest.Mocked<StudioService>;
  let taskTargetService: jest.Mocked<TaskTargetService>;
  let shiftAlignmentService: jest.Mocked<ShiftAlignmentService>;
  let factExtractionService: jest.Mocked<FactExtractionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskOrchestrationService,
        {
          provide: TaskService,
          useValue: {
            findTasksByShowIds: jest.fn(),
            updateAssigneeByTaskIds: jest.fn(),
            findByUid: jest.fn(),
            findByUidWithSnapshot: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            setAssignee: jest.fn(),
            updateTaskContentAndStatus: jest.fn(),
            updateTaskContentAndStatusAsAdmin: jest.fn(),
          },
        },
        {
          provide: TaskTargetService,
          useValue: {
            findByShowIds: jest.fn(),
          },
        },
        {
          provide: TaskTemplateService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: ShowService,
          useValue: {
            findMany: jest.fn(),
            getShowById: jest.fn(),
            findPaginatedWithTaskSummary: jest.fn(),
          },
        },
        {
          provide: StudioMembershipService,
          useValue: {
            listStudioMemberships: jest.fn(),
          },
        },
        {
          provide: TaskGenerationProcessor,
          useValue: {
            processShow: jest.fn(),
          },
        },
        {
          provide: StudioService,
          useValue: {
            findByUid: jest.fn(),
          },
        },
        {
          provide: ShiftAlignmentService,
          useValue: {
            getAlignment: jest.fn(),
          },
        },
        {
          provide: FactExtractionService,
          useValue: {
            extractFromTask: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskOrchestrationService>(TaskOrchestrationService);
    taskService = module.get(TaskService);
    taskTemplateService = module.get(TaskTemplateService);
    showService = module.get(ShowService);
    studioMembershipService = module.get(StudioMembershipService);
    taskGenerationProcessor = module.get(TaskGenerationProcessor);
    studioService = module.get(StudioService);
    taskTargetService = module.get(TaskTargetService);
    shiftAlignmentService = module.get(ShiftAlignmentService);
    factExtractionService = module.get(FactExtractionService);
  });

  describe('generateTasksForShows', () => {
    it('should generate tasks for shows successfully', async () => {
      const studioUid = 'std_1';
      const showUids = ['show_1'];
      const templateUids = ['tpl_1'];

      const mockTemplates = [{ id: 1, uid: 'tpl_1' }];
      const mockShows = [{ id: 10, uid: 'show_1', studioId: 1 }];

      taskTemplateService.findAll.mockResolvedValue(mockTemplates as any);
      showService.findMany.mockResolvedValue(mockShows as any);
      taskGenerationProcessor.processShow.mockResolvedValue({
        show_id: 'show_1',
        status: 'success',
        tasks_created: 2,
        tasks_skipped: 0,
        error: undefined,
      });

      const result = await service.generateTasksForShows(studioUid, showUids, templateUids);

      expect(taskTemplateService.findAll).toHaveBeenCalled();
      expect(showService.findMany).toHaveBeenCalled();
      expect(taskGenerationProcessor.processShow).toHaveBeenCalledWith(mockShows[0], mockTemplates, undefined);
      expect(result.summary.total_tasks_created).toBe(2);
    });

    it('should throw error if no templates found', async () => {
      taskTemplateService.findAll.mockResolvedValue([]);
      await expect(service.generateTasksForShows('std_1', ['show_1'], ['tpl_1'])).rejects.toThrow(BadRequestException);
    });

    it('should throw error if no shows found', async () => {
      taskTemplateService.findAll.mockResolvedValue([{ id: 1 }] as any);
      showService.findMany.mockResolvedValue([]);
      await expect(service.generateTasksForShows('std_1', ['show_1'], ['tpl_1'])).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignShowsToUser', () => {
    it('should assign multiple shows to a user', async () => {
      const studioUid = 'std_1';
      const showUids = ['show_1', 'show_2'];
      const assigneeUid = 'usr_1';

      studioMembershipService.listStudioMemberships.mockResolvedValue({
        data: [{ user: { uid: 'usr_1', name: 'John' }, userId: BigInt(1) }],
      } as any);
      showService.findMany.mockResolvedValue([
        { id: BigInt(10), uid: 'show_1' },
        { id: BigInt(11), uid: 'show_2' },
      ] as any);
      taskTargetService.findByShowIds.mockResolvedValue([
        { taskId: BigInt(100), showId: BigInt(10) },
        { taskId: BigInt(101), showId: BigInt(11) },
      ] as any);
      taskService.updateAssigneeByTaskIds.mockResolvedValue({ count: 2 } as any);

      const result = await service.assignShowsToUser(studioUid, showUids, assigneeUid);

      expect(taskService.updateAssigneeByTaskIds).toHaveBeenCalledWith([BigInt(100), BigInt(101)], BigInt(1));
      expect(result.updated_count).toBe(2);
    });

    it('should throw error if user is not a studio member', async () => {
      studioMembershipService.listStudioMemberships.mockResolvedValue({ data: [] } as any);
      await expect(service.assignShowsToUser('std_1', ['show_1'], 'usr_1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reassignTask', () => {
    it('should reassign a single task', async () => {
      const studioUid = 'std_1';
      const taskUid = 'task_1';
      const assigneeUid = 'usr_1';

      taskService.findByUid.mockResolvedValue({ uid: 'task_1', studioId: BigInt(1) } as any);
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);
      studioMembershipService.listStudioMemberships.mockResolvedValue({
        data: [{ user: { uid: 'usr_1' }, userId: BigInt(2) }],
      } as any);
      taskService.setAssignee.mockResolvedValue({ uid: 'task_1', assigneeId: BigInt(2) } as any);

      const result = await service.reassignTask(studioUid, taskUid, assigneeUid);

      expect(taskService.setAssignee).toHaveBeenCalledWith('task_1', BigInt(2), expect.any(Object));
      expect(result.uid).toBe('task_1');
    });

    it('should throw forbidden if task does not belong to studio', async () => {
      taskService.findByUid.mockResolvedValue({ uid: 'task_1', studioId: BigInt(2) } as any);
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);
      await expect(service.reassignTask('std_1', 'task_1', 'usr_1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getShowTasks', () => {
    it('should get and sort tasks for a show', async () => {
      showService.getShowById.mockResolvedValue({ id: BigInt(10), studioId: BigInt(1) } as any);
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);
      taskService.findTasksByShowIds.mockResolvedValue([
        { type: TaskType.ACTIVE, id: 1 },
        { type: TaskType.SETUP, id: 2 },
      ] as any);

      const result = await service.getShowTasks('std_1', 'show_1');

      expect(result[0].type).toBe(TaskType.SETUP);
      expect(result[1].type).toBe(TaskType.ACTIVE);
    });
  });

  describe('getStudioShow', () => {
    it('loads show details with DTO-shaped includes', async () => {
      const show = { uid: 'show_1', studioId: BigInt(1) };
      showService.getShowById.mockResolvedValue(show as any);
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);

      const result = await service.getStudioShow('std_1', 'show_1');

      expect(showService.getShowById).toHaveBeenCalledWith('show_1', showDtoListInclude);
      expect(result).toBe(show);
    });
  });

  describe('getStudioShowsWithTaskSummary', () => {
    it('should return paginated shows with task summaries', async () => {
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);
      const now = new Date();
      showService.findPaginatedWithTaskSummary.mockResolvedValue({
        data: [
          {
            id: BigInt(1),
            uid: 'show_1',
            clientId: BigInt(1),
            studioId: BigInt(1),
            studioRoomId: null,
            showTypeId: BigInt(1),
            showStatusId: BigInt(1),
            showStandardId: BigInt(1),
            name: 'Test Show',
            startTime: now,
            endTime: now,
            metadata: {},
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            showCreators: [
              {
                uid: 'show_mc_1',
                compensationType: 'FIXED',
                agreedRate: '125.00',
                commissionRate: null,
                creator: {
                  uid: 'creator_1',
                  name: 'Alice',
                  aliasName: 'Alice A',
                },
              },
            ],
            showPlatforms: [
              {
                uid: 'showplatform_1',
                liveStreamLink: 'https://youtube.com/live/abc',
                platformShowId: 'yt-123',
                viewerCount: 1500,
                gmv: '12345.67',
                ctr: null,
                cto: null,
                platform: {
                  uid: 'platform_1',
                  name: 'YouTube',
                },
              },
            ],
            taskTargets: [
              { task: { status: TaskStatus.COMPLETED, assigneeId: BigInt(1) } },
              { task: { status: TaskStatus.PENDING, assigneeId: null } },
            ],
          },
        ],
        total: 1,
      } as any);

      const result = await service.getStudioShowsWithTaskSummary('std_1', { page: 1, limit: 10, sort: 'desc', take: 10, skip: 0 });

      expect(result.data[0].task_summary).toEqual({
        total: 2,
        assigned: 1,
        unassigned: 1,
        completed: 1,
      });
      expect(result.data[0].has_proper_task_assignment).toBe(true);
      expect(result.data[0].creators).toEqual([
        {
          show_creator_id: 'show_mc_1',
          creator_id: 'creator_1',
          creator_name: 'Alice',
          creator_alias_name: 'Alice A',
          compensation_type: 'FIXED',
          agreed_rate: '125.00',
          commission_rate: null,
        },
      ]);
      expect(result.data[0].platforms).toEqual([
        {
          id: 'platform_1',
          name: 'YouTube',
          show_platform_uid: 'showplatform_1',
          live_stream_link: 'https://youtube.com/live/abc',
          platform_show_id: 'yt-123',
          viewer_count: 1500,
          gmv: '12345.67',
          ctr: null,
          cto: null,
        },
      ]);

      // Regression guard: the row must satisfy the response contract the
      // controller serializes through. `show_platform_uid` became required in
      // PR 21.7; the list mapper omitting it produced a 500 on every show with
      // platforms until this assertion was added.
      expect(() => showWithTaskSummaryDto.parse(result.data[0])).not.toThrow();
    });

    it('should flag has_proper_task_assignment=false when every task is unassigned or closed', async () => {
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);
      const now = new Date();
      showService.findPaginatedWithTaskSummary.mockResolvedValue({
        data: [
          {
            id: BigInt(2),
            uid: 'show_2',
            clientId: BigInt(1),
            studioId: BigInt(1),
            studioRoomId: null,
            showTypeId: BigInt(1),
            showStatusId: BigInt(1),
            showStandardId: BigInt(1),
            name: 'Unassigned Show',
            startTime: now,
            endTime: now,
            metadata: {},
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            showCreators: [],
            showPlatforms: [],
            taskTargets: [
              { task: { status: TaskStatus.PENDING, assigneeId: null } },
              // CLOSED task with assignee doesn't count — operator is no longer on the hook.
              { task: { status: TaskStatus.CLOSED, assigneeId: BigInt(5) } },
            ],
          },
        ],
        total: 1,
      } as any);

      const result = await service.getStudioShowsWithTaskSummary('std_1', { page: 1, limit: 10, sort: 'desc', take: 10, skip: 0 });

      expect(result.data[0].has_proper_task_assignment).toBe(false);
      expect(result.data[0].task_summary).toEqual({
        total: 2,
        assigned: 1,
        unassigned: 1,
        completed: 0,
      });
    });

    it('should filter by attention show ids when needs_attention is enabled', async () => {
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);
      shiftAlignmentService.getAlignment.mockResolvedValue({
        task_readiness_warnings: [
          { show_id: 'show_1' },
          { show_id: 'show_2' },
        ],
      } as any);
      showService.findPaginatedWithTaskSummary.mockResolvedValue({
        data: [],
        total: 0,
      } as any);

      await service.getStudioShowsWithTaskSummary('std_1', {
        page: 1,
        limit: 10,
        sort: 'desc',
        take: 10,
        skip: 0,
        needs_attention: true,
        date_from: '2026-03-01T00:00:00.000Z',
        date_to: '2026-03-07T23:59:59.999Z',
        planning_date_from: '2026-03-01',
        planning_date_to: '2026-03-07',
      });

      expect(shiftAlignmentService.getAlignment).toHaveBeenCalledWith('std_1', {
        dateFrom: new Date('2026-03-01T00:00:00.000Z'),
        dateTo: new Date('2026-03-07T23:59:59.999Z'),
        dateFromIsDateOnly: false,
        dateToIsDateOnly: false,
        includeCancelled: false,
        includePast: true,
        matchShowScope: true,
      });
      expect(showService.findPaginatedWithTaskSummary).toHaveBeenCalledWith(
        BigInt(1),
        expect.objectContaining({
          show_uids: ['show_1', 'show_2'],
        }),
      );
    });

    it('should reject invalid legacy planning date inputs for needs_attention', async () => {
      studioService.findByUid.mockResolvedValue({ id: BigInt(1) } as any);

      await expect(service.getStudioShowsWithTaskSummary('std_1', {
        page: 1,
        limit: 10,
        sort: 'desc',
        take: 10,
        skip: 0,
        needs_attention: true,
        planning_date_from: 'not-a-date',
      })).rejects.toThrow('planning_date_from must be a valid ISO date (YYYY-MM-DD)');

      expect(shiftAlignmentService.getAlignment).not.toHaveBeenCalled();
    });
  });

  describe('submitTaskContent', () => {
    function buildShowTargetedTask(overrides?: { status?: TaskStatus }) {
      return {
        id: BigInt(99),
        uid: 'task_alpha',
        status: overrides?.status ?? TaskStatus.PENDING,
        studioId: BigInt(1),
        targets: [
          { show: { id: BigInt(10), uid: 'sho_10' } },
        ],
      } as never;
    }

    it('dispatches assignee-mode through TaskService.updateTaskContentAndStatus', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask());
      taskService.updateTaskContentAndStatus.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.IN_PROGRESS,
      } as never);

      const result = await service.submitTaskContent('task_alpha', 1, { status: 'IN_PROGRESS' as never }, {
        mode: 'assignee',
      });

      expect(taskService.updateTaskContentAndStatus).toHaveBeenCalledWith(
        'task_alpha',
        1,
        { status: 'IN_PROGRESS' },
        undefined,
      );
      expect(taskService.updateTaskContentAndStatusAsAdmin).not.toHaveBeenCalled();
      expect(result).toEqual({ uid: 'task_alpha', status: TaskStatus.IN_PROGRESS });
    });

    it('dispatches admin-mode through TaskService.updateTaskContentAndStatusAsAdmin and forwards the audit context', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask());
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.IN_PROGRESS,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { status: 'IN_PROGRESS' as never }, {
        mode: 'admin',
        auditContext: { actorExtId: 'user_ext_1', source: 'studio' },
      });

      expect(taskService.updateTaskContentAndStatusAsAdmin).toHaveBeenCalledWith(
        'task_alpha',
        1,
        { status: 'IN_PROGRESS' },
        { actorExtId: 'user_ext_1', source: 'studio' },
      );
      expect(taskService.updateTaskContentAndStatus).not.toHaveBeenCalled();
    });

    it('fires fact extraction once when the task transitions into COMPLETED with a show target', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask());
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { status: 'COMPLETED' as never }, {
        mode: 'admin',
      });

      expect(factExtractionService.extractFromTask).toHaveBeenCalledWith({
        taskId: BigInt(99),
        taskUid: 'task_alpha',
        studioId: BigInt(1),
        showId: BigInt(10),
        showUid: 'sho_10',
        source: 'OPERATOR',
      });
    });

    it('does not fire extraction when the task was already COMPLETED and no content was updated', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask({ status: TaskStatus.COMPLETED }));
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { status: TaskStatus.COMPLETED as any }, { mode: 'admin' });

      expect(factExtractionService.extractFromTask).not.toHaveBeenCalled();
    });

    it('re-extracts with MANAGER provenance when a manager edits an already-COMPLETED task', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask({ status: TaskStatus.COMPLETED }));
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { content: {} as never }, {
        mode: 'admin',
        auditContext: { actorRole: 'manager' },
      });

      expect(factExtractionService.extractFromTask).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'MANAGER' }),
      );
    });

    it('uses MANAGER provenance for an admin-role content override', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask({ status: TaskStatus.COMPLETED }));
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { content: {} as never }, {
        mode: 'admin',
        auditContext: { actorRole: 'admin' },
      });

      expect(factExtractionService.extractFromTask).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'MANAGER' }),
      );
    });

    it('keeps OPERATOR provenance for a manager approval that does not change content', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask({ status: TaskStatus.REVIEW }));
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { status: TaskStatus.COMPLETED as never }, {
        mode: 'admin',
        auditContext: { actorRole: 'manager' },
      });

      expect(factExtractionService.extractFromTask).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'OPERATOR' }),
      );
    });

    it('keeps OPERATOR provenance when content changes but the actor is not an admin/manager', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask({ status: TaskStatus.REVIEW }));
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { content: {} as never }, {
        mode: 'admin',
        auditContext: { actorRole: 'member' },
      });

      expect(factExtractionService.extractFromTask).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'OPERATOR' }),
      );
    });

    it('does not fire extraction for status transitions that do not land at COMPLETED', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask());
      taskService.updateTaskContentAndStatus.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.IN_PROGRESS,
      } as never);

      await service.submitTaskContent('task_alpha', 1, { status: 'IN_PROGRESS' as never }, { mode: 'assignee' });

      expect(factExtractionService.extractFromTask).not.toHaveBeenCalled();
    });

    it('swallows extraction errors so the submission still resolves with the updated task', async () => {
      taskService.findByUidWithSnapshot.mockResolvedValue(buildShowTargetedTask());
      taskService.updateTaskContentAndStatusAsAdmin.mockResolvedValue({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
      } as never);
      factExtractionService.extractFromTask.mockRejectedValue(new Error('extractor blew up'));

      const result = await service.submitTaskContent('task_alpha', 1, { status: 'COMPLETED' as never }, {
        mode: 'admin',
      });

      expect(result).toEqual({
        uid: 'task_alpha',
        status: TaskStatus.COMPLETED,
        extractionError: 'extractor blew up',
        extractionResult: undefined,
      });
    });
  });

  describe('bulkApproveTasks', () => {
    it('successfully bulk approves multiple tasks in REVIEW status', async () => {
      const studioUid = 'std_1';
      const taskUids = ['task_1', 'task_2'];

      // Mock task findOne
      taskService.findOne
        .mockResolvedValueOnce({ uid: 'task_1', version: 1, status: TaskStatus.REVIEW } as any)
        .mockResolvedValueOnce({ uid: 'task_2', version: 2, status: TaskStatus.REVIEW } as any);

      // Mock submitTaskContent to behave successfully
      jest.spyOn(service, 'submitTaskContent').mockImplementation(async (uid) => {
        if (uid === 'task_1') {
          return {
            uid: 'task_1',
            status: TaskStatus.COMPLETED,
            extractionResult: {
              entries: [
                { factKey: 'show_actual_start_time', sourceFieldId: 'f1', targetUid: 't1', outcome: 'written', auditUid: 'a1' },
              ],
            },
          } as any;
        } else {
          return {
            uid: 'task_2',
            status: TaskStatus.COMPLETED,
            extractionResult: {
              entries: [
                { factKey: 'show_actual_end_time', sourceFieldId: 'f2', targetUid: 't2', outcome: 'noop', reason: 'value_absent' },
              ],
            },
          } as any;
        }
      });

      const result = await service.bulkApproveTasks(studioUid, taskUids, { actorExtId: 'actor_1' });

      expect(result.summary).toEqual({
        total_processed: 2,
        total_success: 2,
        total_failed: 0,
      });

      expect(result.results[0]).toEqual({
        task_uid: 'task_1',
        status: 'success',
        extraction: {
          status: 'success',
          error: undefined,
          entries: [
            { fact_key: 'show_actual_start_time', source_field_id: 'f1', target_uid: 't1', outcome: 'written', audit_uid: 'a1', reason: undefined },
          ],
        },
      });
    });

    it('reports failure for individual tasks when they are not in REVIEW or not found, without blocking others', async () => {
      const studioUid = 'std_1';
      const taskUids = ['task_not_found', 'task_not_review', 'task_ok'];

      // Mock findOne
      taskService.findOne
        .mockResolvedValueOnce(null) // task_not_found
        .mockResolvedValueOnce({ uid: 'task_not_review', version: 1, status: TaskStatus.IN_PROGRESS } as any)
        .mockResolvedValueOnce({ uid: 'task_ok', version: 2, status: TaskStatus.REVIEW } as any);

      // Mock submitTaskContent
      jest.spyOn(service, 'submitTaskContent').mockResolvedValue({
        uid: 'task_ok',
        status: TaskStatus.COMPLETED,
      } as any);

      const result = await service.bulkApproveTasks(studioUid, taskUids);

      expect(result.summary).toEqual({
        total_processed: 3,
        total_success: 1,
        total_failed: 2,
      });

      expect(result.results.find((r) => r.task_uid === 'task_not_found')?.status).toBe('error');
      expect(result.results.find((r) => r.task_uid === 'task_not_review')?.status).toBe('error');
      expect(result.results.find((r) => r.task_uid === 'task_ok')?.status).toBe('success');
    });

    it('reports failure if the extraction throws or returns an extractor error', async () => {
      const studioUid = 'std_1';
      const taskUids = ['task_err'];

      taskService.findOne.mockResolvedValue({ uid: 'task_err', version: 1, status: TaskStatus.REVIEW } as any);

      jest.spyOn(service, 'submitTaskContent').mockResolvedValue({
        uid: 'task_err',
        status: TaskStatus.COMPLETED,
        extractionError: 'Database extraction connection timeout',
      } as any);

      const result = await service.bulkApproveTasks(studioUid, taskUids);

      expect(result.results[0]).toEqual({
        task_uid: 'task_err',
        status: 'success',
        extraction: {
          status: 'error',
          error: 'Database extraction connection timeout',
          entries: [],
        },
      });
    });
  });
});
