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

  // Orchestration service will handle complex creation/generation
}
