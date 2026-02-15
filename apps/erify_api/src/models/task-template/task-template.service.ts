import { Injectable } from '@nestjs/common';
import { Prisma, TaskTemplate } from '@prisma/client';

import { TemplateSchemaValidator } from '@eridu/api-types/task-management';

import type { CreateTaskTemplatePayload } from './schemas/task-template.schema';
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

  async create(payload: CreateTaskTemplatePayload): Promise<TaskTemplate> {
    if (!this.validateSchema(payload.currentSchema)) {
      throw HttpError.badRequest('Invalid schema');
    }

    return this.taskTemplateRepository.create({
      ...payload,
      uid: payload.uid ?? this.generateTaskTemplateUid(),
      version: payload.version ?? 1,
    });
  }

  async createTemplateWithSnapshot(payload: CreateTaskTemplatePayload): Promise<TaskTemplate> {
    if (!this.validateSchema(payload.currentSchema)) {
      throw HttpError.badRequest('Invalid schema');
    }

    const version = payload.version ?? 1;

    const taskTemplate = await this.create({
      ...payload,
      uid: payload.uid ?? this.generateTaskTemplateUid(),
      version,
      snapshots: {
        create: {
          version,
          schema: payload.currentSchema ?? {},
        },
      },
    });

    return taskTemplate;
  }

  async updateTemplateWithSnapshot(
    where: Prisma.TaskTemplateWhereUniqueInput & { version?: number; studio?: { uid: string } },
    payload: Prisma.TaskTemplateUpdateInput & { version?: number; currentSchema?: any },
  ): Promise<TaskTemplate> {
    if (payload.currentSchema && !this.validateSchema(payload.currentSchema)) {
      throw HttpError.badRequest('Invalid schema');
    }

    try {
      if (payload.currentSchema) {
        // Increment version and create snapshot
        const newVersion = (payload.version as number) + 1;
        const result = await this.taskTemplateRepository.updateWithVersionCheck(
          where,
          {
            name: payload.name,
            description: payload.description,
            currentSchema: payload.currentSchema,
            version: newVersion,
            snapshots: {
              create: {
                version: newVersion,
                schema: payload.currentSchema,
              },
            },
          },
        );

        return result;
      }

      const result = await this.taskTemplateRepository.update(
        where,
        {
          name: payload.name,
          description: payload.description,
        },
      );

      return result;
    } catch (error) {
      if (error instanceof VersionConflictError) {
        throw HttpError.conflict(
          `TaskTemplate record is out of date. Please refresh your record and try again.`,
        );
      }
      throw error;
    }
  }

  validateSchema(schema: CreateTaskTemplatePayload['currentSchema']): boolean {
    const result = TemplateSchemaValidator.safeParse(schema);

    if (!result.success) {
      throw HttpError.badRequestWithDetails('Invalid template schema', result.error.issues);
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

    return true;
  }

  async findOne(...args: Parameters<TaskTemplateRepository['findOne']>): Promise<TaskTemplate | null> {
    return this.taskTemplateRepository.findOne(...args);
  }

  async getTaskTemplates(...args: Parameters<TaskTemplateRepository['findPaginated']>): Promise<{ data: TaskTemplate[]; total: number }> {
    return this.taskTemplateRepository.findPaginated(...args);
  }

  async softDelete(...args: Parameters<TaskTemplateRepository['softDelete']>): Promise<TaskTemplate> {
    return this.taskTemplateRepository.softDelete(...args);
  }
}
