import { Injectable, NotImplementedException } from '@nestjs/common';

import { TaskReportDefinitionRepository } from './task-report-definition.repository';

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
  async listDefinitions(studioUid: string): Promise<never> {
    void studioUid;
    void this.taskReportDefinitionRepository;
    throw new NotImplementedException('Task report definitions list is not implemented yet');
  }

  /**
   * Get one saved definition by external definition uid.
   */
  async getDefinition(studioUid: string, definitionUid: string): Promise<never> {
    void studioUid;
    void definitionUid;
    void this.taskReportDefinitionRepository;
    throw new NotImplementedException('Task report definition detail is not implemented yet');
  }

  /**
   * Create a new saved definition from FE builder payload.
   */
  async createDefinition(studioUid: string, payload: unknown): Promise<never> {
    void studioUid;
    void payload;
    void this.taskReportDefinitionRepository;
    throw new NotImplementedException('Task report definition create is not implemented yet');
  }

  /**
   * Update mutable metadata/payload of an existing definition.
   */
  async updateDefinition(studioUid: string, definitionUid: string, payload: unknown): Promise<never> {
    void studioUid;
    void definitionUid;
    void payload;
    void this.taskReportDefinitionRepository;
    throw new NotImplementedException('Task report definition update is not implemented yet');
  }

  /**
   * Delete an existing saved definition.
   */
  async deleteDefinition(studioUid: string, definitionUid: string): Promise<never> {
    void studioUid;
    void definitionUid;
    void this.taskReportDefinitionRepository;
    throw new NotImplementedException('Task report definition delete is not implemented yet');
  }
}
