import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { TaskTargetRepository } from './task-target.repository';
import { TaskTargetService } from './task-target.service';

import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

describe('taskTargetService', () => {
  let service: TaskTargetService;
  const taskTargetRepositoryMock = {
    countActiveByShowId: jest.fn(),
  };
  const uidGeneratorMock = { generateBrandedId: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTargetService,
        { provide: TaskTargetRepository, useValue: taskTargetRepositoryMock },
        { provide: UidGeneratorService, useValue: uidGeneratorMock },
      ],
    }).compile();
    service = module.get(TaskTargetService);
  });

  describe('countActiveByShowId', () => {
    it('delegates to the repository', async () => {
      taskTargetRepositoryMock.countActiveByShowId.mockResolvedValue(3);

      const result = await service.countActiveByShowId(42n);

      expect(taskTargetRepositoryMock.countActiveByShowId).toHaveBeenCalledWith(42n);
      expect(result).toBe(3);
    });
  });
});
