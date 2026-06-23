import { TaskTargetRepository } from './task-target.repository';
import { TaskTargetService } from './task-target.service';

import {
  createMockRepository,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';

describe('taskTargetService', () => {
  let service: TaskTargetService;
  let taskTargetRepository: TaskTargetRepository;

  beforeEach(async () => {
    const taskTargetRepositoryMock = createMockRepository<TaskTargetRepository>({
      countActiveByShowId: jest.fn(),
    });

    const module = await createModelServiceTestModule({
      serviceClass: TaskTargetService,
      repositoryClass: TaskTargetRepository,
      repositoryMock: taskTargetRepositoryMock,
    });

    service = module.get<TaskTargetService>(TaskTargetService);
    taskTargetRepository = module.get<TaskTargetRepository>(TaskTargetRepository);
  });

  describe('countActiveByShowId', () => {
    it('delegates to the repository', async () => {
      jest.spyOn(taskTargetRepository, 'countActiveByShowId').mockResolvedValue(3);

      const result = await service.countActiveByShowId(42n);

      expect(taskTargetRepository.countActiveByShowId).toHaveBeenCalledWith(42n);
      expect(result).toBe(3);
    });
  });
});
