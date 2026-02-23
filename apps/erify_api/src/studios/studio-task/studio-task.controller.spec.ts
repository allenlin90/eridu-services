import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioTaskController } from './studio-task.controller';

import type { AssignShowsDto, GenerateTasksDto, ReassignTaskDto } from '@/models/task/schemas/task.schema';
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
          },
        },
        {
          provide: TaskService,
          useValue: {
            findOne: jest.fn(),
            updateTaskContentAndStatus: jest.fn(),
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
        show_uids: ['show_1'],
        template_uids: ['tpl_1'],
      };

      await controller.generate(studioId, dto);

      expect(service.generateTasksForShows).toHaveBeenCalledWith(
        studioId,
        dto.show_uids,
        dto.template_uids,
        dto.due_dates,
      );
    });
  });

  describe('assignShows', () => {
    it('should call assignShowsToUser on service', async () => {
      const studioId = 'std_123';
      const dto: AssignShowsDto = {
        show_uids: ['show_1'],
        assignee_uid: 'usr_1',
      };

      await controller.assignShows(studioId, dto);

      expect(service.assignShowsToUser).toHaveBeenCalledWith(
        studioId,
        dto.show_uids,
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
      };

      await controller.reassign(studioId, taskId, dto);

      expect(service.reassignTask).toHaveBeenCalledWith(
        studioId,
        taskId,
        dto.assignee_uid,
      );
    });
  });

  describe('updateTask', () => {
    it('should call updateTaskContentAndStatus on TaskService', async () => {
      const studioId = 'std_123';
      const taskId = 'task_123';
      const dto = {
        version: 1,
        content: { foo: 'bar' },
        status: 'IN_PROGRESS',
      } as any;

      const mockTask = { uid: taskId, studioId: BigInt(1) };
      const mockUpdatedTask = { uid: taskId, version: 2, status: 'IN_PROGRESS' };

      taskService.findOne.mockResolvedValue(mockTask as any);
      taskService.updateTaskContentAndStatus.mockResolvedValue(mockUpdatedTask as any);

      await controller.updateTask(studioId, taskId, dto);

      expect(taskService.findOne).toHaveBeenCalledWith({
        uid: taskId,
        studio: { uid: studioId },
        deletedAt: null,
      });
      expect(taskService.updateTaskContentAndStatus).toHaveBeenCalledWith(
        taskId,
        dto.version,
        { content: dto.content, status: dto.status },
      );
    });

    it('should throw 404 if task not found in studio', async () => {
      const studioId = 'std_123';
      const taskId = 'task_123';
      const dto = { version: 1, content: { foo: 'bar' } } as any;

      taskService.findOne.mockResolvedValue(null);

      await expect(controller.updateTask(studioId, taskId, dto)).rejects.toThrow();
    });
  });
});
