import { Injectable } from '@nestjs/common';

import type {
  GetTaskReportSourcesQuery,
  TaskReportPreflightRequest,
  TaskReportPreflightResponse,
  TaskReportScope,
  TaskReportSourcesResponse,
  TaskStatus,
  UiSchema,
} from '@eridu/api-types/task-management';
import { TASK_REPORT_DATE_PRESET, TemplateSchemaValidator } from '@eridu/api-types/task-management';

import { TaskReportScopeRepository } from './task-report-scope.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';

/**
 * Resolves reporting scope for lightweight operations shared by endpoints.
 * Use case: source discovery and preflight counts before expensive report generation.
 */
@Injectable()
export class TaskReportScopeService {
  private static readonly DEFAULT_ROW_LIMIT = 10_000;

  constructor(
    private readonly taskReportScopeRepository: TaskReportScopeRepository,
    private readonly studioService: StudioService,
  ) {}

  /**
   * Return contextual source templates/fields for the selected scope.
   */
  async getSources(studioUid: string, query: GetTaskReportSourcesQuery): Promise<TaskReportSourcesResponse> {
    const { dateFrom, dateTo } = this.resolveDateRange(query);

    const filters = {
      dateFrom,
      dateTo,
      showStandardId: query.show_standard_id,
      showTypeId: query.show_type_id,
      showIds: query.show_ids,
      sourceTemplateIds: query.source_templates,
      submittedStatuses: query.submitted_statuses as TaskStatus[],
    };

    const [sourceSnapshots, studioSharedFields] = await Promise.all([
      this.taskReportScopeRepository.findSourceSnapshotsInScope(studioUid, filters),
      this.studioService.getSharedFields(studioUid),
    ]);

    const sourceMap = new Map<
      string,
      {
        template_id: string;
        template_name: string;
        task_type: string;
        submitted_task_count: number;
        fieldsByKey: Map<string, TaskReportSourcesResponse['sources'][number]['fields'][number]>;
      }
    >();
    const standardFieldKeys = new Set<string>();
    const sharedFieldByKey = new Map(studioSharedFields.map((field) => [field.key, field]));

    for (const sourceSnapshot of sourceSnapshots) {
      const parsedSnapshot = TemplateSchemaValidator.safeParse(sourceSnapshot.snapshotSchema);
      if (!parsedSnapshot.success) {
        throw HttpError.internalServerError('Task template snapshot schema is invalid');
      }

      const source
        = sourceMap.get(sourceSnapshot.templateUid)
        ?? {
          template_id: sourceSnapshot.templateUid,
          template_name: sourceSnapshot.templateName,
          task_type: this.readTaskType(parsedSnapshot.data.metadata),
          submitted_task_count: 0,
          fieldsByKey: new Map(),
        };

      source.submitted_task_count += sourceSnapshot.taskCount;

      for (const item of parsedSnapshot.data.items) {
        if (source.fieldsByKey.has(item.key)) {
          continue;
        }

        const sharedField = item.standard ? sharedFieldByKey.get(item.key) : undefined;
        source.fieldsByKey.set(item.key, {
          key: item.key,
          label: item.label,
          type: item.type,
          standard: item.standard || undefined,
          category: sharedField?.category,
          source_template_id: sourceSnapshot.templateUid,
          source_template_name: sourceSnapshot.templateName,
        });

        if (item.standard) {
          standardFieldKeys.add(item.key);
        }
      }

      sourceMap.set(sourceSnapshot.templateUid, source);
    }

    return {
      sources: [...sourceMap.values()]
        .map((source) => ({
          template_id: source.template_id,
          template_name: source.template_name,
          task_type: source.task_type,
          submitted_task_count: source.submitted_task_count,
          fields: [...source.fieldsByKey.values()],
        }))
        // Sort after aggregation (not DB-level) because this list is assembled from
        // merged in-memory structures; this guarantees deterministic API output.
        .sort((a, b) => a.template_name.localeCompare(b.template_name)),
      shared_fields: studioSharedFields.filter((field) => standardFieldKeys.has(field.key)),
    };
  }

  /**
   * Return show/task counts and limit check for preflight confirmation.
   */
  async preflight(
    studioUid: string,
    payload: TaskReportPreflightRequest,
  ): Promise<TaskReportPreflightResponse> {
    const { dateFrom, dateTo } = this.resolveDateRange(payload.scope);

    const filters = {
      dateFrom,
      dateTo,
      showStandardId: payload.scope.show_standard_id,
      showTypeId: payload.scope.show_type_id,
      showIds: payload.scope.show_ids,
      sourceTemplateIds: payload.scope.source_templates,
      submittedStatuses: payload.scope.submitted_statuses,
    };

    const [showCount, taskCount] = await Promise.all([
      this.taskReportScopeRepository.countShowsInScope(studioUid, filters),
      this.taskReportScopeRepository.countSubmittedTasksInScope(studioUid, filters),
    ]);

    const limit = TaskReportScopeService.DEFAULT_ROW_LIMIT;
    return {
      show_count: showCount,
      task_count: taskCount,
      within_limit: taskCount <= limit,
      limit,
    };
  }

  private resolveDateRange(
    scope: Pick<TaskReportScope, 'date_preset' | 'date_from' | 'date_to'>,
  ): { dateFrom?: Date; dateTo?: Date } {
    // Keep date boundaries in local timezone to match existing show/task filtering behavior.
    if (scope.date_from && scope.date_to) {
      const dateFrom = new Date(`${scope.date_from}T00:00:00`);
      const dateTo = new Date(`${scope.date_to}T00:00:00`);
      dateTo.setHours(23, 59, 59, 999);
      return {
        dateFrom,
        dateTo,
      };
    }

    const now = new Date();
    if (scope.date_preset === TASK_REPORT_DATE_PRESET.THIS_WEEK) {
      const day = now.getDay();
      const offsetToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetToMonday, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      return {
        dateFrom: monday,
        dateTo: sunday,
      };
    }

    if (scope.date_preset === TASK_REPORT_DATE_PRESET.THIS_MONTH) {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        dateFrom: firstDay,
        dateTo: lastDay,
      };
    }

    return {};
  }

  private readTaskType(metadata: UiSchema['metadata'], fallback = 'OTHER'): string {
    const taskType = metadata?.task_type;
    return typeof taskType === 'string' && taskType.length > 0 ? taskType : fallback;
  }
}
