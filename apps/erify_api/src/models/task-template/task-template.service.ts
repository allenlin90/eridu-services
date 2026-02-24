import { Injectable } from '@nestjs/common';
import type { TaskStatus } from '@prisma/client';

import { TASK_TYPE, TemplateSchemaValidator } from '@eridu/api-types/task-management';

import type {
  CreateTaskTemplatePayload,
  UpdateTaskTemplatePayload,
} from './schemas/task-template.schema';
import { TaskTemplateRepository } from './task-template.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class TaskTemplateService extends BaseModelService {
  static readonly UID_PREFIX = 'ttpl';
  protected readonly uidPrefix = TaskTemplateService.UID_PREFIX;

  constructor(
    private readonly taskTemplateRepository: TaskTemplateRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  generateTaskTemplateUid(): string {
    return this.generateUid();
  }

  private withTaskTypeInSchema(schema: unknown, taskType: string) {
    const schemaObj = (schema && typeof schema === 'object') ? schema as Record<string, unknown> : {};
    const metadataObj = (schemaObj.metadata && typeof schemaObj.metadata === 'object')
      ? schemaObj.metadata as Record<string, unknown>
      : {};

    return {
      ...schemaObj,
      metadata: {
        ...metadataObj,
        task_type: taskType,
      },
    };
  }

  async create(payload: CreateTaskTemplatePayload): ReturnType<TaskTemplateRepository['create']> {
    const schemaWithTaskType = this.withTaskTypeInSchema(payload.currentSchema, payload.taskType);

    this.validateSchema(schemaWithTaskType);

    const data = {
      name: payload.name,
      description: payload.description ?? null,
      currentSchema: schemaWithTaskType,
      studio: { connect: { uid: payload.studioId } },
      uid: payload.uid ?? this.generateTaskTemplateUid(),
      version: payload.version ?? 1,
    };

    return this.taskTemplateRepository.create(data);
  }

  async createTemplateWithSnapshot(payload: CreateTaskTemplatePayload): ReturnType<TaskTemplateRepository['create']> {
    const schemaWithTaskType = this.withTaskTypeInSchema(payload.currentSchema, payload.taskType);

    this.validateSchema(schemaWithTaskType);

    const version = payload.version ?? 1;
    const uid = payload.uid ?? this.generateTaskTemplateUid();

    const data = {
      name: payload.name,
      description: payload.description ?? null,
      currentSchema: schemaWithTaskType,
      studio: { connect: { uid: payload.studioId } },
      uid,
      version,
      snapshots: {
        create: {
          version,
          schema: schemaWithTaskType ?? {},
        },
      },
    };

    return this.taskTemplateRepository.create(data);
  }

  async updateTemplateWithSnapshot(
    uid: string,
    studioId: string,
    payload: UpdateTaskTemplatePayload,
  ): ReturnType<TaskTemplateRepository['update']> {
    try {
      const existing = await this.taskTemplateRepository.findOne({
        uid,
        studio: { uid: studioId },
        deletedAt: null,
      });

      if (!existing) {
        throw HttpError.notFound('Task template not found');
      }

      const nextSchema = payload.currentSchema
        ? this.withTaskTypeInSchema(payload.currentSchema, payload.taskType ?? ((existing.currentSchema as any)?.metadata?.task_type ?? TASK_TYPE.OTHER))
        : (payload.taskType
            ? this.withTaskTypeInSchema(existing.currentSchema, payload.taskType)
            : null);

      if (nextSchema) {
        this.validateSchema(nextSchema);
      }

      const params = {
        uid,
        studioUid: studioId,
        version: payload.version,
      };

      if (nextSchema) {
        // Increment version and create snapshot
        const newVersion = (payload.version ?? 1) + 1;
        const data = {
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.description !== undefined && { description: payload.description }),
          currentSchema: nextSchema,
          version: newVersion,
          snapshots: {
            create: {
              version: newVersion,
              schema: nextSchema,
            },
          },
        };

        return await this.taskTemplateRepository.updateWithVersionCheck(params, data);
      }

      const data = {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && { description: payload.description }),
      };

      return await this.taskTemplateRepository.update(params, data);
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          `TaskTemplate record is out of date. Please refresh your record and try again.`,
        );
      }
      throw error;
    }
  }

  validateSchema(schema: CreateTaskTemplatePayload['currentSchema']): void {
    const result = TemplateSchemaValidator.safeParse(schema);

    if (!result.success) {
      throw HttpError.badRequestWithDetails('Invalid template schema', result.error.issues);
    }

    const taskType = (schema as { metadata?: { task_type?: string } })?.metadata?.task_type;
    if (!taskType || !Object.values(TASK_TYPE).includes(taskType as any)) {
      throw HttpError.badRequest('Template metadata.task_type is required and must be a valid task type');
    }

    // Additional business rules
    for (const item of result.data.items) {
      // Validate require_reason rule usage
      if (item.validation?.require_reason) {
        if (Array.isArray(item.validation.require_reason)) {
          // Validate logic based on type
          if (item.type === 'checkbox') {
            throw HttpError.badRequest(
              `Checkbox fields do not support property-based require_reason rules. Use string 'on-true'/'on-false' instead. Field: ${item.key}`,
            );
          }

          for (const criterion of item.validation.require_reason) {
            const { op, value } = criterion;

            // Number validation
            if (item.type === 'number') {
              if (typeof value !== 'number') {
                throw HttpError.badRequest(
                  `Number fields require numeric comparison values. Field: ${item.key}`,
                );
              }
              if (['in', 'not_in'].includes(op)) {
                throw HttpError.badRequest(
                  `Number fields do not support 'in'/'not_in' operators yet. Field: ${item.key}`,
                );
              }
            }

            // Date/datetime validation
            if (['date', 'datetime'].includes(item.type)) {
              if (typeof value !== 'string') {
                throw HttpError.badRequest(
                  `Date fields require string (ISO) comparison values. Field: ${item.key}`,
                );
              }
              if (['in', 'not_in'].includes(op)) {
                throw HttpError.badRequest(
                  `Date fields do not support 'in'/'not_in' operators. Field: ${item.key}`,
                );
              }
            }

            // Select/Multiselect validation
            if (['select', 'multiselect'].includes(item.type)) {
              if (['in', 'not_in'].includes(op) && !Array.isArray(value)) {
                throw HttpError.badRequest(
                  `'in'/'not_in' operators require array values. Field: ${item.key}`,
                );
              }
            }
          }
        } else {
          // String format (on-true/on-false/always) is ONLY for checkbox fields
          if (item.type !== 'checkbox') {
            throw HttpError.badRequest(
              `'${item.validation.require_reason}' require_reason only allowed on checkbox fields. Field: ${item.key}`,
            );
          }
        }
      }
    }
  }

  async findOne(...args: Parameters<TaskTemplateRepository['findOne']>): ReturnType<TaskTemplateRepository['findOne']> {
    return this.taskTemplateRepository.findOne(...args);
  }

  /** @internal */
  async findAll(...args: Parameters<TaskTemplateRepository['findAll']>): ReturnType<TaskTemplateRepository['findAll']> {
    return this.taskTemplateRepository.findAll(...args);
  }

  /** @internal */
  async findByUid(...args: Parameters<TaskTemplateRepository['findByUid']>): ReturnType<TaskTemplateRepository['findByUid']> {
    return this.taskTemplateRepository.findByUid(...args);
  }

  async getTaskTemplates(...args: Parameters<TaskTemplateRepository['findPaginated']>): ReturnType<TaskTemplateRepository['findPaginated']> {
    return this.taskTemplateRepository.findPaginated(...args);
  }

  async softDelete(...args: Parameters<TaskTemplateRepository['softDelete']>): ReturnType<TaskTemplateRepository['softDelete']> {
    return this.taskTemplateRepository.softDelete(...args);
  }

  async getAdminTaskTemplatesWithUsage(
    ...args: Parameters<TaskTemplateRepository['findPaginatedAdminWithUsage']>
  ): ReturnType<TaskTemplateRepository['findPaginatedAdminWithUsage']> {
    return this.taskTemplateRepository.findPaginatedAdminWithUsage(...args);
  }

  async getTemplateUsageSummary(
    ...args: Parameters<TaskTemplateRepository['getTemplateUsageSummary']>
  ): ReturnType<TaskTemplateRepository['getTemplateUsageSummary']> {
    return this.taskTemplateRepository.getTemplateUsageSummary(...args);
  }

  async getTemplateBindings(params: {
    templateUid: string;
    status?: TaskStatus | TaskStatus[];
    showStartFrom?: string;
    showStartTo?: string;
    includeDeleted?: boolean;
    skip?: number;
    take?: number;
  }) {
    return this.taskTemplateRepository.findTemplateBindings(params);
  }
}
