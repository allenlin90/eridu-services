import { Injectable } from '@nestjs/common';

import type {
  CreateTaskReportDefinitionInput,
  TaskReportDefinition,
  UpdateTaskReportDefinitionInput,
} from '@eridu/api-types/task-management';
import { taskReportDefinitionSchema } from '@eridu/api-types/task-management';

import {
  TaskReportDefinitionRepository,
  type TaskReportDefinitionWithCreator,
} from './task-report-definition.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

/**
 * Manages saved task report definitions (named presets) for studio managers.
 * Use case: create/list/update personal report configurations before running reports.
 */
@Injectable()
export class TaskReportDefinitionService extends BaseModelService {
  static readonly UID_PREFIX = 'trd';
  protected readonly uidPrefix = TaskReportDefinitionService.UID_PREFIX;

  constructor(
    private readonly taskReportDefinitionRepository: TaskReportDefinitionRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * List saved definitions for the current studio context.
   */
  async listDefinitions(
    studioUid: string,
    params: { skip?: number; take?: number; search?: string },
  ): Promise<{ data: TaskReportDefinition[]; total: number }> {
    const { data, total } = await this.taskReportDefinitionRepository.findPaginated({
      studioUid,
      skip: params.skip,
      take: params.take,
      search: params.search,
    });

    return {
      data: data.map((row) => this.toTaskReportDefinition(row)),
      total,
    };
  }

  /**
   * Get one saved definition by external definition uid.
   */
  async getDefinition(studioUid: string, definitionUid: string): Promise<TaskReportDefinition> {
    const definition = await this.taskReportDefinitionRepository.findByUidInStudio(studioUid, definitionUid);
    if (!definition) {
      throw HttpError.notFound('Task report definition not found');
    }

    return this.toTaskReportDefinition(definition);
  }

  /**
   * Create a new saved definition from FE builder payload.
   */
  async createDefinition(
    studioUid: string,
    payload: CreateTaskReportDefinitionInput,
  ): Promise<TaskReportDefinition> {
    const definition = await this.taskReportDefinitionRepository.createInStudio({
      studioUid,
      uid: this.generateUid(),
      name: payload.name,
      description: payload.description ?? null,
      definition: payload.definition,
    });

    return this.toTaskReportDefinition(definition);
  }

  /**
   * Update mutable metadata/payload of an existing definition.
   */
  async updateDefinition(
    studioUid: string,
    definitionUid: string,
    payload: UpdateTaskReportDefinitionInput,
  ): Promise<TaskReportDefinition> {
    const existing = await this.taskReportDefinitionRepository.findByUidInStudio(studioUid, definitionUid);
    if (!existing) {
      throw HttpError.notFound('Task report definition not found');
    }

    const updated = await this.taskReportDefinitionRepository.updateInStudio({
      id: existing.id,
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description ?? null } : {}),
        ...(payload.definition !== undefined ? { definition: payload.definition } : {}),
      },
    });

    return this.toTaskReportDefinition(updated);
  }

  /**
   * Delete an existing saved definition.
   */
  async deleteDefinition(studioUid: string, definitionUid: string): Promise<void> {
    const existing = await this.taskReportDefinitionRepository.findByUidInStudio(studioUid, definitionUid);
    if (!existing) {
      throw HttpError.notFound('Task report definition not found');
    }

    await this.taskReportDefinitionRepository.softDeleteById(existing.id);
  }

  private toTaskReportDefinition(
    row: TaskReportDefinitionWithCreator,
  ): TaskReportDefinition {
    return taskReportDefinitionSchema.parse({
      id: row.uid,
      name: row.name,
      description: row.description,
      definition: row.definition,
      created_by_id: row.createdBy?.uid ?? null,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    });
  }
}
