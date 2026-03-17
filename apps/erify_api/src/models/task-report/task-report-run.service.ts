import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import type {
  SharedFieldCategory,
  TaskReportResult,
  TaskReportRunRequest,
} from '@eridu/api-types/task-management';
import {
  FieldTypeEnum,
  taskReportColumnSchema,
  TemplateSchemaValidator,
} from '@eridu/api-types/task-management';

import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';

type FieldType = z.infer<typeof FieldTypeEnum>;
type TaskReportColumn = z.infer<typeof taskReportColumnSchema>;
type SelectedKeyMeta = {
  type: FieldType;
  standard?: boolean;
  category?: SharedFieldCategory;
  sourceTemplateId?: string;
  sourceTemplateName?: string;
};
type RowsByShowUid = Map<string, Record<string, unknown>>;
type RunProjection = {
  rowsByShowUid: RowsByShowUid;
  selectedKeyMeta: Map<string, SelectedKeyMeta>;
  duplicateSourceCount: Map<string, number>;
};
type CompiledProjectionField = {
  fieldKey: string;
  columnKey: string;
  meta: SelectedKeyMeta;
};
type ScopedTask = Awaited<ReturnType<TaskReportScopeRepository['findSubmittedTasksInScope']>>[number];

/**
 * Executes the report generation pipeline for the run endpoint.
 * Use case: transform scoped submitted tasks into one-row-per-show result rows.
 */
@Injectable()
export class TaskReportRunService {
  constructor(
    private readonly taskReportScopeService: TaskReportScopeService,
    private readonly taskReportScopeRepository: TaskReportScopeRepository,
    private readonly studioService: StudioService,
  ) {}

  /**
   * Run full report generation from resolved scope + selected columns.
   *
   * Design doc mapping:
   * 1) Layer 1 guardrail (preflight): verify scope size before heavy extraction.
   * 2) Layer 2 extraction: scan scoped tasks and merge values into show-centric rows.
   * 3) Result assembly: fill null gaps, add duplicate warnings, build column metadata.
   */
  async run(studioUid: string, payload: TaskReportRunRequest): Promise<TaskReportResult> {
    const selectedColumns = payload.columns;
    const selectedColumnKeys = new Set(selectedColumns.map((column) => column.key));

    await this.enforcePreflightLimit(studioUid, payload.scope);

    const filters = this.taskReportScopeService.resolveScopeFilters(payload.scope);
    const [shows, tasks, sharedFieldByKey] = await this.loadRunInputs(studioUid, filters);

    const projection = this.buildRunProjection(tasks, shows, selectedColumnKeys, sharedFieldByKey);
    this.assertKnownSelectedColumns(selectedColumns, projection.selectedKeyMeta, tasks.length);

    const rows = this.buildRows(shows.map((show) => show.uid), projection.rowsByShowUid, selectedColumns);
    const warnings = this.buildWarnings(projection.duplicateSourceCount);
    const columns = this.buildColumns(selectedColumns, projection.selectedKeyMeta);
    const columnMap = this.buildColumnMap(columns);

    return {
      rows,
      columns,
      column_map: columnMap,
      warnings,
      row_count: rows.length,
      generated_at: new Date().toISOString(),
    };
  }

  private async enforcePreflightLimit(
    studioUid: string,
    scope: Parameters<TaskReportScopeService['resolveScopeFilters']>[0],
  ): Promise<void> {
    const preflight = await this.taskReportScopeService.preflight(studioUid, { scope });
    if (!preflight.within_limit) {
      throw HttpError.badRequest(
        `Scope includes ${preflight.task_count} tasks (limit: ${preflight.limit}). Narrow your scope filters.`,
      );
    }
  }

  private async loadRunInputs(studioUid: string, filters: ReturnType<TaskReportScopeService['resolveScopeFilters']>) {
    const [shows, tasks, sharedFields] = await Promise.all([
      this.taskReportScopeRepository.findShowsInScope(studioUid, filters),
      this.taskReportScopeRepository.findSubmittedTasksInScope(studioUid, filters),
      this.studioService.getSharedFields(studioUid),
    ]);

    return [shows, tasks, new Map(sharedFields.map((field) => [field.key, field]))] as const;
  }

  private buildRunProjection(
    tasks: Awaited<ReturnType<TaskReportScopeRepository['findSubmittedTasksInScope']>>,
    shows: Awaited<ReturnType<TaskReportScopeRepository['findShowsInScope']>>,
    selectedColumnKeys: Set<string>,
    sharedFieldByKey: Map<string, Awaited<ReturnType<StudioService['getSharedFields']>>[number]>,
  ): RunProjection {
    const rowsByShowUid: RowsByShowUid = new Map(shows.map((show) => [show.uid, {}]));
    const selectedKeyMeta = new Map<string, SelectedKeyMeta>();
    const duplicateSourceCount = new Map<string, number>();
    // Compile selected-field projectors once per template+snapshot. This avoids
    // repeatedly scanning snapshot schema.items for every task row.
    const projectorCache = new Map<string, CompiledProjectionField[]>();

    for (const task of tasks) {
      const cacheKey = `${task.templateUid}|${task.snapshotId}`;
      const projectionFields
        = projectorCache.get(cacheKey)
        ?? this.compileProjectionFields(task, selectedColumnKeys, sharedFieldByKey);
      if (!projectorCache.has(cacheKey)) {
        projectorCache.set(cacheKey, projectionFields);
      }
      if (projectionFields.length === 0) {
        continue;
      }
      const contentRecord = this.readTaskContent(task.content);

      for (const showUid of task.targetShowUids) {
        const row = rowsByShowUid.get(showUid);
        if (!row) {
          continue;
        }

        const duplicateKey = `${showUid}|${task.templateUid}`;
        duplicateSourceCount.set(duplicateKey, (duplicateSourceCount.get(duplicateKey) ?? 0) + 1);

        for (const projectedField of projectionFields) {
          const { columnKey } = projectedField;
          if (!(columnKey in row)) {
            row[columnKey] = this.normalizeFieldValue(contentRecord[projectedField.fieldKey], projectedField.meta.type);
          }

          if (!selectedKeyMeta.has(columnKey)) {
            selectedKeyMeta.set(columnKey, projectedField.meta);
          }
        }
      }
    }

    return { rowsByShowUid, selectedKeyMeta, duplicateSourceCount };
  }

  private compileProjectionFields(
    task: ScopedTask,
    selectedColumnKeys: Set<string>,
    sharedFieldByKey: Map<string, Awaited<ReturnType<StudioService['getSharedFields']>>[number]>,
  ): CompiledProjectionField[] {
    const parsedSnapshot = TemplateSchemaValidator.safeParse(task.snapshotSchema);
    if (!parsedSnapshot.success) {
      throw HttpError.internalServerError('Task template snapshot schema is invalid');
    }

    return parsedSnapshot.data.items.flatMap((field) => {
      const columnKey = field.standard ? field.key : `${task.templateUid}:${field.key}`;
      if (!selectedColumnKeys.has(columnKey)) {
        return [];
      }

      return [{
        fieldKey: field.key,
        columnKey,
        meta: {
          type: field.type,
          standard: field.standard || undefined,
          category: field.standard ? sharedFieldByKey.get(field.key)?.category : undefined,
          sourceTemplateId: field.standard ? undefined : task.templateUid,
          sourceTemplateName: field.standard ? undefined : task.templateName,
        },
      }];
    });
  }

  private assertKnownSelectedColumns(
    selectedColumns: Array<{ key: string }>,
    selectedKeyMeta: Map<string, SelectedKeyMeta>,
    taskCount: number,
  ): void {
    if (taskCount === 0) {
      return;
    }

    const unknownColumn = selectedColumns.find((column) => !selectedKeyMeta.has(column.key));
    if (unknownColumn) {
      throw HttpError.badRequest(`Unknown column key: ${unknownColumn.key}`);
    }
  }

  private buildRows(
    showUids: string[],
    rowsByShowUid: RowsByShowUid,
    selectedColumns: Array<{ key: string }>,
  ): Array<Record<string, unknown>> {
    return showUids.map((showUid) => {
      const row = rowsByShowUid.get(showUid) ?? {};
      for (const column of selectedColumns) {
        if (!(column.key in row)) {
          row[column.key] = null;
        }
      }
      return row;
    });
  }

  private buildWarnings(duplicateSourceCount: Map<string, number>) {
    return [...duplicateSourceCount.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => {
        const [showId, templateId] = key.split('|');
        return {
          code: 'DUPLICATE_SOURCE',
          message: `Multiple submitted tasks found for show ${showId} and template ${templateId}; latest values were used.`,
          show_id: showId,
        };
      });
  }

  private buildColumns(
    selectedColumns: Array<{ key: string; label: string; type?: FieldType }>,
    selectedKeyMeta: Map<string, SelectedKeyMeta>,
  ): TaskReportColumn[] {
    return selectedColumns.map((column) => {
      const selectedMeta = selectedKeyMeta.get(column.key);
      const fallbackTemplateId = this.readTemplateUidFromColumnKey(column.key);

      return {
        key: column.key,
        label: column.label,
        type: selectedMeta?.type ?? column.type ?? 'text',
        source_template_id: selectedMeta?.sourceTemplateId ?? fallbackTemplateId ?? null,
        source_template_name: selectedMeta?.sourceTemplateName ?? null,
        standard: selectedMeta?.standard,
        category: selectedMeta?.category,
      };
    });
  }

  private buildColumnMap(columns: TaskReportColumn[]) {
    return Object.fromEntries(
      columns.map((column) => [column.key, column.source_template_id ?? null]),
    );
  }

  private readTaskContent(content: ScopedTask['content']): Record<string, unknown> {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return {};
    }

    return content as Record<string, unknown>;
  }

  private normalizeFieldValue(value: unknown, type: FieldType): unknown {
    if (value === undefined || value === null) {
      return null;
    }

    switch (type) {
      case 'number': {
        if (typeof value === 'number') {
          return Number.isFinite(value) ? value : null;
        }
        const coerced = Number(value);
        return Number.isFinite(coerced) ? coerced : null;
      }
      case 'checkbox':
        if (typeof value === 'boolean') {
          return value;
        }
        return String(value).toLowerCase() === 'true';
      case 'multiselect':
        return Array.isArray(value) ? value.map((item) => String(item)) : null;
      case 'date':
      case 'datetime':
      case 'file':
      case 'url':
      case 'select':
      case 'text':
      case 'textarea':
        return String(value);
      default:
        return value;
    }
  }

  private readTemplateUidFromColumnKey(columnKey: string): string | null {
    const separatorIndex = columnKey.indexOf(':');
    if (separatorIndex < 0) {
      return null;
    }

    const templateUid = columnKey.slice(0, separatorIndex);
    return templateUid.length > 0 ? templateUid : null;
  }
}
