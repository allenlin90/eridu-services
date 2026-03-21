import { Injectable } from '@nestjs/common';

import { STUDIO_ROLE, type StudioRole } from '@eridu/api-types/memberships';
import type {
  CreateTaskReportDefinitionInput,
  TaskReportDefinition,
  UpdateTaskReportDefinitionInput,
} from '@eridu/api-types/task-management';

import {
  TaskReportDefinitionRepository,
  type TaskReportDefinitionWithCreator,
} from './task-report-definition.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UserService } from '@/models/user/user.service';
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
    private readonly userService: UserService,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * List all saved definitions visible to the studio.
   * Definitions are studio-shared — all authorized roles can view.
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
      throw HttpError.notFound('Task report definition', definitionUid);
    }

    return this.toTaskReportDefinition(definition);
  }

  /**
   * Create a new saved definition from FE builder payload.
   */
  async createDefinition(
    studioUid: string,
    actorExtId: string,
    payload: CreateTaskReportDefinitionInput,
  ): Promise<TaskReportDefinition> {
    const actor = await this.resolveActorUser(actorExtId);
    const definition = await this.taskReportDefinitionRepository.createInStudio({
      studioUid,
      createdById: actor.id,
      uid: this.generateUid(),
      name: payload.name,
      description: payload.description ?? null,
      definition: payload.definition,
    });

    return this.toTaskReportDefinition(definition);
  }

  /**
   * Update mutable metadata/payload of an existing definition.
   * Permission: creator can update their own; ADMIN can update any.
   */
  async updateDefinition(
    studioUid: string,
    actorExtId: string,
    actorRole: StudioRole,
    definitionUid: string,
    payload: UpdateTaskReportDefinitionInput,
  ): Promise<TaskReportDefinition> {
    const actor = await this.resolveActorUser(actorExtId);
    const existing = await this.taskReportDefinitionRepository.findByUidInStudio(studioUid, definitionUid);
    if (!existing) {
      throw HttpError.notFound('Task report definition', definitionUid);
    }

    this.assertCanModify(existing, actor.id, actorRole);

    if (existing.version !== payload.version) {
      throw HttpError.conflict(
        `Version mismatch. Expected ${payload.version}, but definition is at version ${existing.version}`,
      );
    }

    const updated = await this.taskReportDefinitionRepository.updateInStudio({
      id: existing.id,
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description ?? null } : {}),
        ...(payload.definition !== undefined ? { definition: payload.definition } : {}),
        version: { increment: 1 },
      },
    });

    return this.toTaskReportDefinition(updated);
  }

  /**
   * Soft-delete an existing saved definition.
   * Permission: creator can delete their own; ADMIN can delete any.
   */
  async deleteDefinition(
    studioUid: string,
    actorExtId: string,
    actorRole: StudioRole,
    definitionUid: string,
  ): Promise<void> {
    const actor = await this.resolveActorUser(actorExtId);
    const existing = await this.taskReportDefinitionRepository.findByUidInStudio(studioUid, definitionUid);
    if (!existing) {
      throw HttpError.notFound('Task report definition', definitionUid);
    }

    this.assertCanModify(existing, actor.id, actorRole);
    await this.taskReportDefinitionRepository.softDeleteById(existing.id);
  }

  private toTaskReportDefinition(
    row: TaskReportDefinitionWithCreator,
  ): TaskReportDefinition {
    return {
      id: row.uid,
      name: row.name,
      description: row.description,
      definition: row.definition as TaskReportDefinition['definition'],
      version: row.version,
      created_by_id: row.createdBy?.uid ?? null,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  /**
   * Verify the actor can modify (update/delete) the definition.
   * Creator can modify their own; ADMIN can modify any definition in the studio.
   */
  private assertCanModify(
    definition: TaskReportDefinitionWithCreator,
    actorId: bigint,
    actorRole: StudioRole,
  ): void {
    if (actorRole === STUDIO_ROLE.ADMIN) {
      return;
    }

    if (definition.createdById !== actorId) {
      throw HttpError.forbidden('Only the definition creator or a studio admin can modify this definition');
    }
  }

  private async resolveActorUser(actorExtId: string) {
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.forbidden('Authenticated user profile was not found');
    }

    return actor;
  }
}
