import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { ListMyTasksQueryTransformed, TaskStatus } from '@eridu/api-types/task-management';

import { MeTaskService } from './me-task.service';

import { TaskService } from '@/models/task/task.service';
import { UserService } from '@/models/user/user.service';

describe('meTaskService', () => {
  let service: MeTaskService;
  let taskService: jest.Mocked<TaskService>;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockTaskService = {
      findByUid: jest.fn(),
      findOne: jest.fn(),
      findTasksByAssignee: jest.fn(),
      updateTaskContentAndStatus: jest.fn(),
    };

    const mockUserService = {
      getUserByExtId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeTaskService,
        { provide: TaskService, useValue: mockTaskService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<MeTaskService>(MeTaskService);
    taskService = module.get(TaskService);
    userService = module.get(UserService);
  });

  describe('listMyTasks', () => {
    it('should throw unauthorized if user not found', async () => {
      userService.getUserByExtId.mockResolvedValue(null);
      await expect(service.listMyTasks('ext_1', {} as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should return paginated tasks for user', async () => {
      const mockUser = { id: BigInt(1) };
      const mockResult = { items: [], total: 0 };
      const query: ListMyTasksQueryTransformed = { page: 1, limit: 20, take: 20, skip: 0, sort: 'due_date:asc' };

      userService.getUserByExtId.mockResolvedValue(mockUser as any);
      taskService.findTasksByAssignee.mockResolvedValue(mockResult as any);

      const result = await service.listMyTasks('ext_1', query);

      expect(userService.getUserByExtId).toHaveBeenCalledWith('ext_1');
      expect(taskService.findTasksByAssignee).toHaveBeenCalledWith(BigInt(1), query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getMyTask', () => {
    it('should throw unauthorized if user not found', async () => {
      userService.getUserByExtId.mockResolvedValue(null);
      await expect(service.getMyTask('ext_1', 'task_1')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw not found if task does not exist or not assigned', async () => {
      const mockUser = { id: BigInt(1) };
      userService.getUserByExtId.mockResolvedValue(mockUser as any);
      taskService.findOne.mockResolvedValue(null);

      await expect(service.getMyTask('ext_1', 'task_1')).rejects.toThrow(NotFoundException);
    });

    it('should return task if found and assigned', async () => {
      const mockUser = { id: BigInt(1) };
      const mockTask = { uid: 'task_1', assigneeId: BigInt(1) };

      userService.getUserByExtId.mockResolvedValue(mockUser as any);
      taskService.findOne.mockResolvedValue(mockTask as any);

      const result = await service.getMyTask('ext_1', 'task_1');

      expect(taskService.findOne).toHaveBeenCalledWith(
        { uid: 'task_1', deletedAt: null, assigneeId: BigInt(1) },
        expect.any(Object),
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('updateMyTask', () => {
    it('should throw unauthorized if user not found', async () => {
      userService.getUserByExtId.mockResolvedValue(null);
      await expect(
        service.updateMyTask('ext_1', 'task_1', 1, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return null if task not found', async () => {
      userService.getUserByExtId.mockResolvedValue({ id: BigInt(1) } as any);
      taskService.findByUid.mockResolvedValue(null);

      const result = await service.updateMyTask('ext_1', 'task_1', 1, {});
      expect(result).toBeNull();
    });

    it('should throw forbidden if task is not assigned to user', async () => {
      userService.getUserByExtId.mockResolvedValue({ id: BigInt(1) } as any);
      taskService.findByUid.mockResolvedValue({ assigneeId: BigInt(2) } as any);

      await expect(
        service.updateMyTask('ext_1', 'task_1', 1, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should call updateTaskContentAndStatus if assigned', async () => {
      userService.getUserByExtId.mockResolvedValue({ id: BigInt(1) } as any);
      taskService.findByUid.mockResolvedValue({ assigneeId: BigInt(1) } as any);
      taskService.updateTaskContentAndStatus.mockResolvedValue({ uid: 'task_1' } as any);

      const result = await service.updateMyTask('ext_1', 'task_1', 1, {
        status: 'IN_PROGRESS' as TaskStatus,
      });

      expect(taskService.updateTaskContentAndStatus).toHaveBeenCalledWith(
        'task_1',
        1,
        { status: 'IN_PROGRESS' },
      );
      expect(result).toEqual({ uid: 'task_1' });
    });
  });
});
