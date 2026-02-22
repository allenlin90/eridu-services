import { Injectable } from '@nestjs/common';

import { TASK_STATUS } from '@eridu/api-types/task-management';

import { UpdateTaskPayload } from './schemas/task.schema';
import { TaskRepository } from './task.repository';
import { TaskValidationService } from './task-validation.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class TaskService extends BaseModelService {
  static readonly UID_PREFIX = 'task';
  protected readonly uidPrefix = TaskService.UID_PREFIX;

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskValidationService: TaskValidationService,
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
  async findTasksByAssignee(...args: Parameters<TaskRepository['findTasksByAssignee']>): ReturnType<TaskRepository['findTasksByAssignee']> {
    return this.taskRepository.findTasksByAssignee(...args);
  }

  /** @internal */
  async update(...args: Parameters<TaskRepository['update']>): ReturnType<TaskRepository['update']> {
    return this.taskRepository.update(...args);
  }

  /** @internal */
  async setAssignee(...args: Parameters<TaskRepository['setAssignee']>): ReturnType<TaskRepository['setAssignee']> {
    return this.taskRepository.setAssignee(...args);
  }

  async updateTaskContentAndStatus(
    uid: string,
    version: number,
    payload: UpdateTaskPayload,
  ) {
    const task = await this.taskRepository.findByUidWithSnapshot(uid);

    if (!task) {
      return null;
    }

    let newContent = task.content;
    let newStatus = task.status;
    let completedAt = task.completedAt;

    const uiSchema = task.snapshot?.schema as any;

    if (payload.content !== undefined) {
      if (uiSchema) {
        this.taskValidationService.validateContent(payload.content, uiSchema);
      }
      newContent = payload.content;
    }

    if (payload.status && payload.status !== task.status) {
      newStatus = payload.status;

      if (newStatus === TASK_STATUS.COMPLETED) {
        if (uiSchema) {
          // Validate the final content thoroughly if marking completed
          this.taskValidationService.validateContent(newContent || {}, uiSchema);
        }
        completedAt = new Date();
      } else {
        completedAt = null;
      }
    }

    try {
      return await this.taskRepository.updateWithVersionCheck(
        { uid, version },
        {
          content: newContent ?? undefined,
          status: newStatus,
          completedAt,
          version: version + 1,
        },
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          `Record is out of date. Please refresh and try again.`,
        );
      }
      throw error;
    }
  }
}
