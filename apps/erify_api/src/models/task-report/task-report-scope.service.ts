import { Injectable, NotImplementedException } from '@nestjs/common';

import type {
  TaskReportPreflightRequest,
  TaskReportPreflightResponse,
  TaskReportScope,
} from '@eridu/api-types/task-management';
import { TASK_REPORT_DATE_PRESET } from '@eridu/api-types/task-management';

import { TaskReportScopeRepository } from './task-report-scope.repository';

/**
 * Resolves reporting scope for lightweight operations shared by endpoints.
 * Use case: source discovery and preflight counts before expensive report generation.
 */
@Injectable()
export class TaskReportScopeService {
  private static readonly DEFAULT_ROW_LIMIT = 10_000;

  constructor(private readonly taskReportScopeRepository: TaskReportScopeRepository) {}

  /**
   * Return contextual source templates/fields for the selected scope.
   */
  async getSources(studioUid: string, query: unknown): Promise<never> {
    void studioUid;
    void query;
    throw new NotImplementedException('Task report sources is not implemented yet');
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

  private resolveDateRange(scope: TaskReportScope): { dateFrom?: Date; dateTo?: Date } {
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

}
