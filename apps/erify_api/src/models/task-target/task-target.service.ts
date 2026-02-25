import { Injectable } from '@nestjs/common';

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

  async findByShowId(...args: Parameters<TaskTargetRepository['findByShowId']>): ReturnType<TaskTargetRepository['findByShowId']> {
    return this.taskTargetRepository.findByShowId(...args);
  }

  async findByShowIds(...args: Parameters<TaskTargetRepository['findByShowIds']>): ReturnType<TaskTargetRepository['findByShowIds']> {
    return this.taskTargetRepository.findByShowIds(...args);
  }

  async findByTaskId(...args: Parameters<TaskTargetRepository['findByTaskId']>): ReturnType<TaskTargetRepository['findByTaskId']> {
    return this.taskTargetRepository.findByTaskId(...args);
  }

  async undeleteByTaskId(...args: Parameters<TaskTargetRepository['undeleteByTaskId']>): ReturnType<TaskTargetRepository['undeleteByTaskId']> {
    return this.taskTargetRepository.undeleteByTaskId(...args);
  }
}
