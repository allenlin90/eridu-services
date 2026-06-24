import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TaskStatus } from '@prisma/client';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { TASK_STATUS, TASK_TYPE } from '@eridu/api-types/task-management';

import { StudioTaskController } from './studio-task.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';
import type { AssignShowsDto, GenerateTasksDto, ReassignTaskDto } from '@/models/task/schemas/task.schema';
import { taskDto, taskWithRelationsDto } from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

describe('studioTaskController', () => {
  let controller: StudioTaskController;
  let service: jest.Mocked<TaskOrchestrationService>;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioTaskController],
      providers: [
        {
          provide: TaskOrchestrationService,
          useValue: {
            generateTasksForShows: jest.fn(),
            assignShowsToUser: jest.fn(),
            reassignTask: jest.fn(),
            claimTask: jest.fn(),
            submitTaskContent: jest.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioTaskController>(StudioTaskController);
    service = module.get(TaskOrchestrationService);
    taskService = module.get(TaskService);
  });

  describe('generate', () => {
    it('should call generateTasksForShows on service', async () => {
      const studioId = 'std_123';
      const dto: GenerateTasksDto = {
        show_ids: ['show_1'],
        template_uids: ['tpl_1'],
      };

      await controller.generate(studioId, dto);

      expect(service.generateTasksForShows).toHaveBeenCalledWith(
        studioId,
        dto.show_ids,
        dto.template_uids,
        dto.due_dates,
      );
    });
  });

  describe('assignShows', () => {
    it('should call assignShowsToUser on service', async () => {
      const studioId = 'std_123';
      const dto: AssignShowsDto = {
        show_ids: ['show_1'],
        assignee_uid: 'usr_1',
      };

      await controller.assignShows(studioId, dto);

      expect(service.assignShowsToUser).toHaveBeenCalledWith(
        studioId,
        dto.show_ids,
        dto.assignee_uid,
      );
    });
  });

  describe('reassign', () => {
    it('should call reassignTask on service', async () => {
      const studioId = 'std_123';
      const taskId = 'task_123';
      const dto: ReassignTaskDto = {
        assignee_uid: 'usr_1',
        note: 'handoff',
      };
      const user = { ext_id: 'ext_1' } as any;

      await controller.reassign(studioId, taskId, dto, user);

      expect(service.reassignTask).toHaveBeenCalledWith(
        studioId,
        taskId,
        dto.assignee_uid,
        'ext_1',
        'handoff',
      );
    });
  });

  describe('claim', () => {
    it('delegates to taskOrchestrationService.claimTask with the caller ext_id', async () => {
      await controller.claim('studio_1', 'task_gate1', { ext_id: 'ext_1' } as any);

      expect(service.claimTask).toHaveBeenCalledWith('studio_1', 'task_gate1', 'ext_1');
    });

    it('allows managers to claim unowned state-gate tasks', () => {
      const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, StudioTaskController.prototype.claim);

      expect(roles).toEqual([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER]);
    });

    it('serializes state-gate tasks without a template snapshot', () => {
      const rawTask = {
        id: 1n,
        uid: 'task_gate1',
        studioId: 10n,
        templateId: null,
        snapshotId: null,
        assigneeId: null,
        description: 'Show lifecycle gate: show_cancellation',
        status: TASK_STATUS.PENDING,
        type: TASK_TYPE.STATE_GATE,
        dueDate: null,
        completedAt: null,
        content: { history: [] },
        metadata: { gate_kind: 'show_cancellation' },
        version: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      };

      expect(taskDto.parse(rawTask)).toMatchObject({
        id: 'task_gate1',
        type: TASK_TYPE.STATE_GATE,
      });
      expect(taskWithRelationsDto.parse({ ...rawTask, snapshot: null })).toMatchObject({
        id: 'task_gate1',
        snapshot: null,
        type: TASK_TYPE.STATE_GATE,
      });
    });
  });

  describe('updateTask', () => {
    it('routes the manager update through the orchestrator in admin mode with audit context', async () => {
      const studioId = 'std_123';
      const taskId = 'task_123';
      const dto = {
        version: 1,
        content: { foo: 'bar' },
        status: TaskStatus.IN_PROGRESS,
      } as any;

      const mockTask = { uid: taskId, studioId: BigInt(1), status: TaskStatus.PENDING };
      const mockUpdatedTask = { uid: taskId, version: 2, status: TaskStatus.IN_PROGRESS };

      taskService.findOne.mockResolvedValue(mockTask as any);
      service.submitTaskContent.mockResolvedValue(mockUpdatedTask as any);

      await controller.updateTask(studioId, taskId, dto, {
        studioMembership: { role: 'MANAGER' },
      } as any);

      expect(taskService.findOne).toHaveBeenCalledWith({
        uid: taskId,
        studio: { uid: studioId },
        deletedAt: null,
      });
      expect(service.submitTaskContent).toHaveBeenCalledWith(
        taskId,
        dto.version,
        { content: dto.content, status: dto.status, dueDate: undefined },
        {
          mode: 'admin',
          auditContext: {
            actorExtId: undefined,
            actorEmail: undefined,
            actorRole: 'MANAGER',
            source: 'studio',
          },
        },
      );
    });

    it('should throw 404 if task not found in studio', async () => {
      const studioId = 'std_123';
      const taskId = 'task_123';
      const dto = { version: 1, content: { foo: 'bar' } } as any;

      taskService.findOne.mockResolvedValue(null);

      await expect(
        controller.updateTask(studioId, taskId, dto, {
          studioMembership: { role: 'ADMIN' },
        } as any),
      ).rejects.toThrow();
    });
  });
});
