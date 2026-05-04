import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import type {
  SharedFieldCategory,
  TaskReportResult,
  TaskReportRunRequest,
  TaskReportSystemColumnKey,
} from '@eridu/api-types/task-management';
import {
  FieldTypeEnum,
  TASK_REPORT_SYSTEM_COLUMN,
  taskReportColumnSchema,
  TemplateSchemaValidator,
} from '@eridu/api-types/task-management';

import { normalizeTaskReportContentValue } from './task-report-content-value';
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
type ViewFilterMetaByShowUid = Map<string, {
  clientId: string | null;
  clientName: string | null;
  studioRoomId: string | null;
  studioRoomName: string | null;
  showStatusId: string | null;
  showStatusName: string | null;
  assigneeIds: Set<string>;
  assigneeNames: Set<string>;
}>;
type RunProjection = {
  rowsByShowUid: RowsByShowUid;
  selectedKeyMeta: Map<string, SelectedKeyMeta>;
  duplicateSourceCount: Map<string, number>;
  viewFilterMetaByShowUid: ViewFilterMetaByShowUid;
};
type CompiledProjectionField = {
  fieldId: string;
  fieldKey: string;
  fieldLabel: string;
  columnKey: string;
  meta: SelectedKeyMeta;
};
type ScopedTask = Awaited<ReturnType<TaskReportScopeRepository['findSubmittedTasksInScope']>>[number];
type ScopedShow = Awaited<ReturnType<TaskReportScopeRepository['findShowsInScope']>>[number];

const SYSTEM_COLUMN_META: Record<TaskReportSystemColumnKey, { type: FieldType }> = {
  [TASK_REPORT_SYSTEM_COLUMN.SHOW_ID]: { type: 'text' },
  [TASK_REPORT_SYSTEM_COLUMN.SHOW_NAME]: { type: 'text' },
  [TASK_REPORT_SYSTEM_COLUMN.SHOW_EXTERNAL_ID]: { type: 'text' },
  [TASK_REPORT_SYSTEM_COLUMN.CLIENT_NAME]: { type: 'text' },
  [TASK_REPORT_SYSTEM_COLUMN.STUDIO_ROOM_NAME]: { type: 'text' },
  [TASK_REPORT_SYSTEM_COLUMN.SHOW_STANDARD_NAME]: { type: 'text' },
  [TASK_REPORT_SYSTEM_COLUMN.SHOW_TYPE_NAME]: { type: 'text' },
  [TASK_REPORT_SYSTEM_COLUMN.START_TIME]: { type: 'datetime' },
  [TASK_REPORT_SYSTEM_COLUMN.END_TIME]: { type: 'datetime' },
};

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
    this.addSystemColumnMeta(selectedColumns, projection.selectedKeyMeta);
    this.assertKnownSelectedColumns(selectedColumns, projection.selectedKeyMeta, sharedFieldByKey);

    const rows = this.buildRows(shows, projection, selectedColumns);
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
      if (preflight.show_count > preflight.limit) {
        throw HttpError.badRequest(
          `Scope includes ${preflight.show_count} shows (limit: ${preflight.limit}). Narrow your scope filters.`,
        );
      }

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
    const hasSelectedTaskColumns = Array.from(selectedColumnKeys).some((columnKey) => !this.isSystemColumn(columnKey));
    const rowsByShowUid: RowsByShowUid = new Map(shows.map((show) => [show.uid, {}]));
    const selectedKeyMeta = new Map<string, SelectedKeyMeta>();
    const duplicateSourceCount = new Map<string, number>();
    const viewFilterMetaByShowUid: ViewFilterMetaByShowUid = new Map(
      shows.map((show) => [show.uid, {
        clientId: show.clientUid,
        clientName: show.clientName,
        studioRoomId: show.studioRoomUid,
        studioRoomName: show.studioRoomName,
        showStatusId: show.showStatusUid,
        showStatusName: show.showStatusName,
        assigneeIds: new Set<string>(),
        assigneeNames: new Set<string>(),
      }]),
    );
    // Compile selected-field projectors once per template+snapshot. This avoids
    // repeatedly scanning snapshot schema.items for every task row.
    const projectorCache = new Map<string, CompiledProjectionField[]>();

    for (const task of tasks) {
      for (const showUid of task.targetShowUids) {
        const viewFilterMeta = viewFilterMetaByShowUid.get(showUid);
        if (viewFilterMeta) {
          if (task.assigneeUid) {
            viewFilterMeta.assigneeIds.add(task.assigneeUid);
          }
          if (task.assigneeName) {
            viewFilterMeta.assigneeNames.add(task.assigneeName);
          }
        }
      }

      if (!hasSelectedTaskColumns) {
        continue;
      }

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
            row[columnKey] = normalizeTaskReportContentValue(contentRecord, {
              id: projectedField.fieldId,
              key: projectedField.fieldKey,
              label: projectedField.fieldLabel,
              type: projectedField.meta.type,
            });
          }

          if (!selectedKeyMeta.has(columnKey)) {
            selectedKeyMeta.set(columnKey, projectedField.meta);
          }
        }
      }
    }

    return { rowsByShowUid, selectedKeyMeta, duplicateSourceCount, viewFilterMetaByShowUid };
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
        fieldId: field.id,
        fieldKey: field.key,
        fieldLabel: field.label,
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
    selectedColumns: Array<{ key: string; label?: string }>,
    selectedKeyMeta: Map<string, SelectedKeyMeta>,
    sharedFieldByKey: Map<string, Awaited<ReturnType<StudioService['getSharedFields']>>[number]>,
  ): void {
    const incompatibleColumns = selectedColumns
      .filter((column) => !this.isSystemColumn(column.key) && !selectedKeyMeta.has(column.key))
      .map((column) => ({
        key: column.key,
        label: column.label ?? column.key,
        reason: this.getColumnConflictReason(column.key, sharedFieldByKey),
      }));

    if (incompatibleColumns.length > 0) {
      throw HttpError.badRequestWithDetails(
        'Selected columns are incompatible with the current scope',
        {
          incompatible_columns: incompatibleColumns,
        },
      );
    }
  }

  private getColumnConflictReason(
    columnKey: string,
    sharedFieldByKey: Map<string, Awaited<ReturnType<StudioService['getSharedFields']>>[number]>,
  ): 'shared_field_not_in_scope' | 'template_field_not_in_scope' | 'unknown_column_key' {
    if (sharedFieldByKey.has(columnKey)) {
      return 'shared_field_not_in_scope';
    }

    if (this.isTemplateScopedColumnKey(columnKey)) {
      return 'template_field_not_in_scope';
    }

    return 'unknown_column_key';
  }

  private buildRows(
    shows: ScopedShow[],
    projection: RunProjection,
    selectedColumns: Array<{ key: string }>,
  ): Array<Record<string, unknown>> {
    return shows.map((show) => {
      const row = projection.rowsByShowUid.get(show.uid) ?? {};
      const viewFilterMeta = projection.viewFilterMetaByShowUid.get(show.uid);
      const assigneeIds = viewFilterMeta ? [...viewFilterMeta.assigneeIds].sort() : [];
      const assigneeNames = viewFilterMeta ? [...viewFilterMeta.assigneeNames].sort() : [];

      row.client_id = viewFilterMeta?.clientId ?? null;
      row.client_name = viewFilterMeta?.clientName ?? null;
      row.studio_room_id = viewFilterMeta?.studioRoomId ?? null;
      row.studio_room_name = viewFilterMeta?.studioRoomName ?? null;
      row.show_status_id = viewFilterMeta?.showStatusId ?? null;
      row.show_status_name = viewFilterMeta?.showStatusName ?? null;
      row.assignee_ids = assigneeIds;
      row.assignee_names = assigneeNames;
      row.assignee_id = assigneeIds.length === 1 ? assigneeIds[0] : null;
      row.assignee_name = assigneeNames.length === 1 ? assigneeNames[0] : null;

      const systemRow = this.buildSystemRow(show);
      for (const column of selectedColumns) {
        if (Object.hasOwn(systemRow, column.key)) {
          row[column.key] = systemRow[column.key as TaskReportSystemColumnKey] ?? null;
          continue;
        }

        if (!Object.hasOwn(row, column.key)) {
          row[column.key] = null;
        }
      }
      return row;
    });
  }

  private addSystemColumnMeta(
    selectedColumns: Array<{ key: string }>,
    selectedKeyMeta: Map<string, SelectedKeyMeta>,
  ): void {
    for (const column of selectedColumns) {
      const systemMeta = this.readSystemColumnMeta(column.key);
      if (!systemMeta || selectedKeyMeta.has(column.key)) {
        continue;
      }

      selectedKeyMeta.set(column.key, {
        type: systemMeta.type,
      });
    }
  }

  private buildWarnings(duplicateSourceCount: Map<string, number>) {
    return [...duplicateSourceCount.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => {
        // Both parts are UID-prefixed strings (show_uid|template_uid), not internal DB ids.
        const [showUid, templateUid] = key.split('|');
        return {
          code: 'DUPLICATE_SOURCE',
          message: `Multiple submitted tasks found for show ${showUid} and template ${templateUid}; latest values were used.`,
          show_id: showUid,
          template_id: templateUid,
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
        type: selectedMeta?.type ?? this.readSystemColumnMeta(column.key)?.type ?? column.type ?? 'text',
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

  private readTemplateUidFromColumnKey(columnKey: string): string | null {
    return this.readTemplateScopedColumnParts(columnKey)?.templateUid ?? null;
  }

  private buildSystemRow(show: ScopedShow): Record<TaskReportSystemColumnKey, unknown> {
    return {
      [TASK_REPORT_SYSTEM_COLUMN.SHOW_ID]: show.uid,
      [TASK_REPORT_SYSTEM_COLUMN.SHOW_NAME]: show.name,
      [TASK_REPORT_SYSTEM_COLUMN.SHOW_EXTERNAL_ID]: show.externalId,
      [TASK_REPORT_SYSTEM_COLUMN.CLIENT_NAME]: show.clientName,
      [TASK_REPORT_SYSTEM_COLUMN.STUDIO_ROOM_NAME]: show.studioRoomName,
      [TASK_REPORT_SYSTEM_COLUMN.SHOW_STANDARD_NAME]: show.showStandardName,
      [TASK_REPORT_SYSTEM_COLUMN.SHOW_TYPE_NAME]: show.showTypeName,
      [TASK_REPORT_SYSTEM_COLUMN.START_TIME]: show.startTime.toISOString(),
      [TASK_REPORT_SYSTEM_COLUMN.END_TIME]: show.endTime.toISOString(),
    };
  }

  private readSystemColumnMeta(key: string): { type: FieldType } | null {
    if (!this.isSystemColumn(key)) {
      return null;
    }

    return SYSTEM_COLUMN_META[key];
  }

  private isSystemColumn(key: string): key is TaskReportSystemColumnKey {
    return Object.hasOwn(SYSTEM_COLUMN_META, key);
  }

  private isTemplateScopedColumnKey(columnKey: string): boolean {
    return this.readTemplateScopedColumnParts(columnKey) !== null;
  }

  private readTemplateScopedColumnParts(columnKey: string): { templateUid: string; fieldKey: string } | null {
    if (this.isSystemColumn(columnKey)) {
      return null;
    }

    const separatorIndex = columnKey.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex >= columnKey.length - 1) {
      return null;
    }

    const templateUid = columnKey.slice(0, separatorIndex);
    if (!templateUid.startsWith(UID_PREFIXES.TASK_TEMPLATE)) {
      return null;
    }

    const fieldKey = columnKey.slice(separatorIndex + 1);
    return fieldKey.length > 0 ? { templateUid, fieldKey } : null;
  }
}
