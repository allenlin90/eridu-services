import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TaskStatus, TaskType } from '@prisma/client';

import { TaskGenerationProcessor } from './task-generation-processor.service';
import { TaskOrchestrationService } from './task-orchestration.service';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
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
            update: jest.fn(),
            setAssignee: jest.fn(),
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
        show_uid: 'show_1',
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
  });
});
