import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { MeTaskController } from './me-task.controller';
import { MeTaskService } from './me-task.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { HttpError } from '@/lib/errors/http-error.util';

describe('meTaskController', () => {
  let controller: MeTaskController;
  let meTaskService: jest.Mocked<MeTaskService>;

  const mockUser: AuthenticatedUser = {
    id: 'user_1',
    ext_id: 'ext_1',
    email: 'test@example.com',
    name: 'Test User',
    payload: {} as any,
  };

  beforeEach(async () => {
    const mockMeTaskService = {
      listMyTasks: jest.fn(),
      getMyTask: jest.fn(),
      updateMyTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeTaskController],
      providers: [{ provide: MeTaskService, useValue: mockMeTaskService }],
    }).compile();

    controller = module.get<MeTaskController>(MeTaskController);
    meTaskService = module.get(MeTaskService);
  });

  describe('listTasks', () => {
    it('should return paginated tasks', async () => {
      const query = { page: 1, limit: 20 } as any;
      const mockResult = { items: [{ uid: 'task_1' }], total: 1 };

      meTaskService.listMyTasks.mockResolvedValue(mockResult as any);

      const result = await controller.listTasks(mockUser, query);

      expect(meTaskService.listMyTasks).toHaveBeenCalledWith(mockUser.ext_id, query);
      expect(result).toEqual({
        data: mockResult.items,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('getTask', () => {
    it('should return a task if found', async () => {
      const mockTask = { uid: 'task_1' };
      meTaskService.getMyTask.mockResolvedValue(mockTask as any);

      const result = await controller.getTask(mockUser, 'task_1');

      expect(meTaskService.getMyTask).toHaveBeenCalledWith(mockUser.ext_id, 'task_1');
      expect(result).toEqual(mockTask);
    });

    it('should throw HTTP Error if service throws', async () => {
      meTaskService.getMyTask.mockRejectedValue(HttpError.notFound('Not found'));

      await expect(controller.getTask(mockUser, 'task_1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTask', () => {
    it('should update and return task', async () => {
      const dto = { version: 1, content: { foo: 'bar' }, status: 'IN_PROGRESS' } as any;
      const mockTask = { uid: 'task_1' };

      meTaskService.updateMyTask.mockResolvedValue(mockTask as any);

      const result = await controller.updateTask(mockUser, 'task_1', dto);

      expect(meTaskService.updateMyTask).toHaveBeenCalledWith(
        mockUser.ext_id,
        'task_1',
        1,
        { content: dto.content, status: dto.status },
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw 404 if task not found during update', async () => {
      const dto = { version: 1 } as any;
      meTaskService.updateMyTask.mockResolvedValue(null);

      await expect(controller.updateTask(mockUser, 'task_1', dto)).rejects.toThrow(NotFoundException);
    });
  });
});
