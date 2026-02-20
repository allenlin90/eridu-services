import { Injectable } from '@nestjs/common';

import { TaskRepository } from './task.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class TaskService extends BaseModelService {
  static readonly UID_PREFIX = 'task';
  protected readonly uidPrefix = TaskService.UID_PREFIX;

  constructor(
    private readonly taskRepository: TaskRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  generateTaskUid(): string {
    return this.generateUid();
  }

  async findOne(...args: Parameters<TaskRepository['findOne']>): ReturnType<TaskRepository['findOne']> {
    return this.taskRepository.findOne(...args);
  }

  async softDelete(...args: Parameters<TaskRepository['softDelete']>): ReturnType<TaskRepository['softDelete']> {
    return this.taskRepository.softDelete(...args);
  }

  /** @internal */
  async create(...args: Parameters<TaskRepository['create']>): ReturnType<TaskRepository['create']> {
    return this.taskRepository.create(...args);
  }

  /** @internal */
  async findByUid(...args: Parameters<TaskRepository['findByUid']>): ReturnType<TaskRepository['findByUid']> {
    return this.taskRepository.findByUid(...args);
  }

  /** @internal */
  async findByShowAndTemplate(...args: Parameters<TaskRepository['findByShowAndTemplate']>): ReturnType<TaskRepository['findByShowAndTemplate']> {
    return this.taskRepository.findByShowAndTemplate(...args);
  }

  /** @internal */
  async findTasksByShowIds(...args: Parameters<TaskRepository['findTasksByShowIds']>): ReturnType<TaskRepository['findTasksByShowIds']> {
    return this.taskRepository.findTasksByShowIds(...args);
  }

  /** @internal */
  async updateAssigneeByTaskIds(...args: Parameters<TaskRepository['updateAssigneeByTaskIds']>): ReturnType<TaskRepository['updateAssigneeByTaskIds']> {
    return this.taskRepository.updateAssigneeByTaskIds(...args);
  }

  /** @internal */
  async update(...args: Parameters<TaskRepository['update']>): ReturnType<TaskRepository['update']> {
    return this.taskRepository.update(...args);
  }
}
