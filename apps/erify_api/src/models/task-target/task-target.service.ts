import { Injectable } from '@nestjs/common';
import type { TaskTarget } from '@prisma/client';

import { TaskTargetRepository } from './task-target.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class TaskTargetService extends BaseModelService {
  static readonly UID_PREFIX = 'tgt';
  protected readonly uidPrefix = TaskTargetService.UID_PREFIX;

  constructor(
    private readonly taskTargetRepository: TaskTargetRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async create(...args: Parameters<TaskTargetRepository['create']>): ReturnType<TaskTargetRepository['create']> {
    return this.taskTargetRepository.create(...args);
  }

  async findByShowId(showId: bigint): Promise<TaskTarget[]> {
    return this.taskTargetRepository.findMany({ where: { showId, deletedAt: null } });
  }

  async findAllByShowId(showId: bigint): Promise<TaskTarget[]> {
    // includeDeleted: true — this method is called by the deleteShow() cascade to collect
    // every taskId (including those on soft-deleted targets) before hard-deleting.
    return this.taskTargetRepository.findMany({ where: { showId }, includeDeleted: true });
  }

  async findByShowIds(...args: Parameters<TaskTargetRepository['findByShowIds']>): ReturnType<TaskTargetRepository['findByShowIds']> {
    return this.taskTargetRepository.findByShowIds(...args);
  }

  async findByTaskId(taskId: bigint): Promise<TaskTarget[]> {
    return this.taskTargetRepository.findMany({ where: { taskId, deletedAt: null } });
  }

  async undeleteByTaskId(...args: Parameters<TaskTargetRepository['undeleteByTaskId']>): ReturnType<TaskTargetRepository['undeleteByTaskId']> {
    return this.taskTargetRepository.undeleteByTaskId(...args);
  }

  async hardDeleteByShowId(...args: Parameters<TaskTargetRepository['hardDeleteByShowId']>): ReturnType<TaskTargetRepository['hardDeleteByShowId']> {
    return this.taskTargetRepository.hardDeleteByShowId(...args);
  }
}
