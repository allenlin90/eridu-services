import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';

import {
  type ListMyTasksQueryTransformed,
  TASK_STATUS,
} from '@eridu/api-types/task-management';

import { UpdateTaskPayload } from './schemas/task.schema';
import { TaskRepository } from './task.repository';
import { TaskValidationService } from './task-validation.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { TaskValidationError } from '@/lib/errors/task-validation.error';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { ShowService } from '@/models/show/show.service';
import { UtilityService } from '@/utility/utility.service';

type TaskUpdateAuditContext = {
  actorExtId?: string;
  actorEmail?: string;
  actorRole?: string;
  source?: 'studio' | 'me' | 'admin';
};

@Injectable()
export class TaskService extends BaseModelService {
  static readonly UID_PREFIX = 'task';
  protected readonly uidPrefix = TaskService.UID_PREFIX;

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskValidationService: TaskValidationService,
    private readonly showService: ShowService,
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
  async findByUidWithSnapshot(...args: Parameters<TaskRepository['findByUidWithSnapshot']>): ReturnType<TaskRepository['findByUidWithSnapshot']> {
    return this.taskRepository.findByUidWithSnapshot(...args);
  }

  async findByUidWithRelations(...args: Parameters<TaskRepository['findByUidWithRelations']>): ReturnType<TaskRepository['findByUidWithRelations']> {
    return this.taskRepository.findByUidWithRelations(...args);
  }

  async findByUidWithRelationsAdmin(...args: Parameters<TaskRepository['findByUidWithRelationsAdmin']>): ReturnType<TaskRepository['findByUidWithRelationsAdmin']> {
    return this.taskRepository.findByUidWithRelationsAdmin(...args);
  }

  /** @internal */
  async reserveMaterialAssetUploadVersion(...args: Parameters<TaskRepository['reserveMaterialAssetUploadVersion']>): ReturnType<TaskRepository['reserveMaterialAssetUploadVersion']> {
    return this.taskRepository.reserveMaterialAssetUploadVersion(...args);
  }

  /** @internal */
  async findByShowAndTemplate(...args: Parameters<TaskRepository['findByShowAndTemplate']>): ReturnType<TaskRepository['findByShowAndTemplate']> {
    return this.taskRepository.findByShowAndTemplate(...args);
  }

  async bulkSoftDelete(studioId: bigint, taskUids: string[]) {
    return this.taskRepository.bulkSoftDelete(studioId, taskUids);
  }

  async resumeTask(...args: Parameters<TaskRepository['resumeTask']>): ReturnType<TaskRepository['resumeTask']> {
    return this.taskRepository.resumeTask(...args);
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

  async findTasks(query: ListMyTasksQueryTransformed) {
    return this.taskRepository.findTasks(query);
  }

  /** @internal */
  async update(...args: Parameters<TaskRepository['update']>): ReturnType<TaskRepository['update']> {
    return this.taskRepository.update(...args);
  }

  /** @internal */
  async setAssignee(...args: Parameters<TaskRepository['setAssignee']>): ReturnType<TaskRepository['setAssignee']> {
    return this.taskRepository.setAssignee(...args);
  }

  async reassignTaskToShowAsAdmin(taskUid: string, showUid: string) {
    const task = await this.taskRepository.findByUidWithSnapshot(taskUid);
    if (!task) {
      return null;
    }

    if (task.status !== TaskStatus.PENDING) {
      throw HttpError.badRequest('Only PENDING tasks can be reassigned to another show');
    }

    if (!task.studioId) {
      throw HttpError.badRequest('Task has no studio scope and cannot be reassigned');
    }

    const show = await this.showService.getShowById(showUid);
    if (!show.studioId) {
      throw HttpError.badRequest('Target show has no studio scope');
    }

    if (show.studioId !== task.studioId) {
      throw HttpError.badRequest('Target show must belong to the same studio as the task');
    }

    const dueDate = this.resolveDueDateForShowTaskType(show.startTime, show.endTime, task.type, task.dueDate);
    return this.taskRepository.reassignTaskToShow(taskUid, show.id, show.studioId, dueDate);
  }

  async updateTaskContentAndStatus(
    uid: string,
    version: number,
    payload: UpdateTaskPayload,
    auditContext?: TaskUpdateAuditContext,
  ) {
    return this.updateTaskContentAndStatusCore(uid, version, payload, true, auditContext);
  }

  async updateTaskContentAndStatusAsAdmin(
    uid: string,
    version: number,
    payload: UpdateTaskPayload,
    auditContext?: TaskUpdateAuditContext,
  ) {
    return this.updateTaskContentAndStatusCore(uid, version, payload, false, auditContext);
  }

  private async updateTaskContentAndStatusCore(
    uid: string,
    version: number,
    payload: UpdateTaskPayload,
    enforceSubmitWindow: boolean,
    auditContext?: TaskUpdateAuditContext,
  ) {
    const task = await this.taskRepository.findByUidWithSnapshot(uid);

    if (!task) {
      return null;
    }

    let newContent = task.content;
    let newStatus = task.status;
    let completedAt = task.completedAt;
    let newMetadata = task.metadata;
    let newDueDate = task.dueDate;

    const uiSchema = task.snapshot?.schema as any;
    const targetShow = task.targets?.[0]?.show;

    try {
      if (payload.content !== undefined) {
        if (uiSchema) {
          this.taskValidationService.validateContent(payload.content, uiSchema);
        }
        newContent = payload.content;
      }

      if (payload.metadata !== undefined) {
        const metadataObj = (newMetadata as Record<string, unknown> | null) ?? {};
        const incomingMetadata = payload.metadata as Record<string, unknown>;
        newMetadata = {
          ...metadataObj,
          ...incomingMetadata,
        } as unknown as typeof task.metadata;
      }

      if (payload.dueDate !== undefined) {
        newDueDate = payload.dueDate;
      }

      if (payload.status && payload.status !== task.status) {
        const isSubmitTransition = payload.status === TASK_STATUS.REVIEW || payload.status === TASK_STATUS.COMPLETED;

        if (isSubmitTransition && targetShow) {
          const now = new Date();

          if (
            enforceSubmitWindow
            && (
              (task.type === TaskType.ACTIVE || task.type === TaskType.CLOSURE)
              && now < targetShow.startTime
            )
          ) {
            throw HttpError.badRequest(
              `${task.type} tasks cannot be submitted before show start time`,
            );
          }

          if (task.dueDate && now > task.dueDate) {
            const metadataObj = (newMetadata as Record<string, unknown> | null) ?? {};
            newMetadata = {
              ...metadataObj,
              due_warning: {
                is_overdue: true,
                submitted_at: now.toISOString(),
                due_date: task.dueDate.toISOString(),
              },
            };
          }
        }

        newStatus = payload.status;

        if (auditContext?.source === 'studio') {
          const metadataObj = (newMetadata as Record<string, unknown> | null) ?? {};
          const auditObj = (metadataObj.audit as Record<string, unknown> | null) ?? {};
          const nowIso = new Date().toISOString();

          newMetadata = {
            ...metadataObj,
            audit: {
              ...auditObj,
              last_transition: {
                from: task.status,
                to: payload.status,
                at: nowIso,
                actor_ext_id: auditContext.actorExtId ?? null,
                actor_email: auditContext.actorEmail ?? null,
                actor_role: auditContext.actorRole ?? null,
                source: auditContext.source,
                had_assignee: task.assigneeId !== null,
              },
            },
          } as unknown as typeof task.metadata;
        }

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

      return await this.taskRepository.updateWithVersionCheck(
        { uid, version },
        {
          content: newContent ?? undefined,
          metadata: newMetadata ?? undefined,
          status: newStatus,
          dueDate: newDueDate === undefined ? undefined : newDueDate,
          completedAt,
          version: version + 1,
        },
      );
    } catch (error) {
      if (error instanceof TaskValidationError) {
        throw HttpError.badRequestWithDetails(error.message, {
          fields: error.validationErrors,
        });
      }
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          `Record is out of date. Please refresh and try again.`,
        );
      }
      throw error;
    }
  }

  private resolveDueDateForShowTaskType(
    showStartTime: Date,
    showEndTime: Date,
    taskType: TaskType,
    currentDueDate: Date | null,
  ): Date | null {
    if (taskType === TaskType.SETUP) {
      return new Date(showStartTime.getTime() - 60 * 60 * 1000);
    }
    if (taskType === TaskType.ACTIVE) {
      return new Date(showEndTime.getTime() + 60 * 60 * 1000);
    }
    if (taskType === TaskType.CLOSURE) {
      return new Date(showEndTime.getTime() + 6 * 60 * 60 * 1000);
    }
    return currentDueDate;
  }
}
