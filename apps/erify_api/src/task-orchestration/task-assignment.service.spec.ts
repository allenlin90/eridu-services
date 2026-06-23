import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { TaskAssignmentService } from './task-assignment.service';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';
import { TaskRepository } from '@/models/task/task.repository';
import { TaskService } from '@/models/task/task.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';
import { UserService } from '@/models/user/user.service';

describe('taskAssignmentService', () => {
  let service: TaskAssignmentService;
  let taskService: jest.Mocked<TaskService>;
  let studioService: jest.Mocked<StudioService>;
  let taskRepository: jest.Mocked<TaskRepository>;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssignmentService,
        {
          provide: TaskService,
          useValue: {
            findByUid: jest.fn(),
            setAssignee: jest.fn(),
          },
        },
        { provide: ShowService, useValue: {} },
        { provide: StudioService, useValue: { findByUid: jest.fn() } },
        {
          provide: StudioMembershipService,
          useValue: { listStudioMemberships: jest.fn() },
        },
        { provide: TaskTargetService, useValue: {} },
        {
          provide: TaskRepository,
          useValue: { updateWithVersionCheck: jest.fn() },
        },
        { provide: UserService, useValue: { getUserByExtId: jest.fn() } },
      ],
    }).compile();

    service = module.get(TaskAssignmentService);
    taskService = module.get(TaskService);
    studioService = module.get(StudioService);
    taskRepository = module.get(TaskRepository);
    userService = module.get(UserService);
  });

  describe('reassignTask - STATE_GATE history', () => {
    it('appends a reassigned history entry with the note and from/to assignee when the task is a STATE_GATE', async () => {
      taskService.findByUid.mockResolvedValue({
        id: 4n,
        uid: 'task_gate1',
        studioId: 1n,
        type: 'STATE_GATE',
        assigneeId: 5n,
        version: 2,
        content: {
          history: [
            {
              event: 'opened',
              actor_id: 'user_owner',
              at: '2026-06-23T00:00:00.000Z',
            },
          ],
        },
      } as any);
      studioService.findByUid.mockResolvedValue({ id: 1n } as any);
      userService.getUserByExtId.mockResolvedValue({ uid: 'user_caller' } as any);
      jest.spyOn(service as any, 'resolveStudioMember').mockResolvedValue({
        userId: 9n,
        user: { uid: 'user_new_owner' },
      });

      await service.reassignTask(
        'studio_1',
        'task_gate1',
        'stdmem_new',
        'ext_caller_1',
        'heads up, handing this off',
      );

      expect(taskRepository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'task_gate1', version: 2 },
        expect.objectContaining({
          assigneeId: 9n,
          version: { increment: 1 },
          content: expect.objectContaining({
            history: [
              expect.objectContaining({ event: 'opened' }),
              expect.objectContaining({
                event: 'reassigned',
                actor_id: 'user_caller',
                note: expect.stringContaining('heads up, handing this off'),
              }),
            ],
          }),
        }),
      );
    });

    it('falls back to setAssignee with no history for a non-gate task type', async () => {
      taskService.findByUid.mockResolvedValue({
        id: 4n,
        uid: 'task_normal',
        studioId: 1n,
        type: 'ROUTINE',
      } as any);
      studioService.findByUid.mockResolvedValue({ id: 1n } as any);
      jest.spyOn(service as any, 'resolveStudioMember').mockResolvedValue({
        userId: 9n,
        user: { uid: 'user_new' },
      });

      await service.reassignTask(
        'studio_1',
        'task_normal',
        'stdmem_new',
        'ext_caller_1',
      );

      expect(taskService.setAssignee).toHaveBeenCalledWith(
        'task_normal',
        9n,
        { assignee: true, template: true },
      );
      expect(taskRepository.updateWithVersionCheck).not.toHaveBeenCalled();
    });
  });
});
