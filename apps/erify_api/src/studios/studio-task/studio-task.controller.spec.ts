import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioTaskController } from './studio-task.controller';

import type { AssignShowsDto, GenerateTasksDto, ReassignTaskDto } from '@/models/task/schemas/task.schema';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

describe('studioTaskController', () => {
  let controller: StudioTaskController;
  let service: jest.Mocked<TaskOrchestrationService>;

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
      ],
    }).compile();

    controller = module.get<StudioTaskController>(StudioTaskController);
    service = module.get(TaskOrchestrationService);
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
});
