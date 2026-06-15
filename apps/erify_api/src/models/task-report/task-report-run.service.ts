import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import type {
  SharedFieldCategory,
  SystemFactKey,
  TaskReportResult,
  TaskReportRunRequest,
  TaskReportSystemColumnKey,
} from '@eridu/api-types/task-management';
import {
  FieldTypeEnum,
  getFieldContentKey,
  getFieldReportDescriptor,
  getFieldSharedKey,
  getSystemFactKeyDefinition,
  safeParseTemplateSchema,
  TASK_REPORT_SYSTEM_COLUMN,
  taskReportColumnSchema,
} from '@eridu/api-types/task-management';

import { projectTaskReportContentInput } from './task-report-content-value';
import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

import { HttpError } from '@/lib/errors/http-error.util';
import {
  aggregateShowPlatformPerformance,
  type ShowPerformanceAggregate,
} from '@/lib/performance/show-platform-performance';
import { StudioService } from '@/models/studio/studio.service';

/**
 * Platform performance facts are extracted into `ShowPlatform` columns, so the
 * report sources them from there (the canonical operational fact), NOT from
 * `task.content` (the operator input). This map is the single routing table:
 * a selected field bound to one of these `system_fact_key`s projects the
 * show-level rollup of the matching column. Any other hydrated (creator- or
 * platform-scoped) fact has no per-show scalar projection and is rejected
 * rather than silently emitted as null — see `compileProjectionFields`.
 */
const PLATFORM_PERFORMANCE_METRIC = {
  show_platform_gmv: 'gmv',
  show_platform_view_count: 'views',
  show_platform_ctr: 'ctr',
  show_platform_cto: 'cto',
} as const satisfies Partial<Record<SystemFactKey, keyof ShowPerformanceAggregate>>;

type PlatformPerformanceMetric = (typeof PLATFORM_PERFORMANCE_METRIC)[keyof typeof PLATFORM_PERFORMANCE_METRIC];

type FieldType = z.infer<typeof FieldTypeEnum>;
type TaskReportColumn = z.infer<typeof taskReportColumnSchema>;
type SelectedReportColumn = TaskReportRunRequest['columns'][number];
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
  fieldKey: string;
  columnKey: string;
  extraColumnKey: string | null;
  // Set when the field binds a platform-performance fact — the value is read
  // from the show's extracted `ShowPlatform` rollup, not from `task.content`.
  performanceMetric?: PlatformPerformanceMetric;
  // Set when the field binds a hydrated fact that has no per-show projection.
  // Such a column is rejected at run time instead of emitting a silent null.
  unsupportedFactLabel?: string;
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
  [TASK_REPORT_SYSTEM_COLUMN.ACTUAL_START_TIME]: { type: 'datetime' },
  [TASK_REPORT_SYSTEM_COLUMN.ACTUAL_END_TIME]: { type: 'datetime' },
  [TASK_REPORT_SYSTEM_COLUMN.ACTUALS_STATUS]: { type: 'text' },
};

function deriveActualsStatus(actualStartTime: Date | null, actualEndTime: Date | null): 'complete' | 'incomplete' | 'missing' {
  if (actualStartTime && actualEndTime) {
    return 'complete';
  }
  if (actualStartTime || actualEndTime) {
    return 'incomplete';
  }
  return 'missing';
}

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
    const selectedColumnByKey = new Map(selectedColumns.map((column) => [column.key, column]));

    await this.enforcePreflightLimit(studioUid, payload.scope);

    const filters = this.taskReportScopeService.resolveScopeFilters(payload.scope);
    const [shows, tasks, sharedFieldByKey] = await this.loadRunInputs(studioUid, filters);

    const projection = this.buildRunProjection(tasks, shows, selectedColumnByKey, sharedFieldByKey);
    this.addSystemColumnMeta(selectedColumns, projection.selectedKeyMeta);
    this.assertKnownSelectedColumns(selectedColumns, projection.selectedKeyMeta, sharedFieldByKey);

    const warnings = this.buildWarnings(projection.duplicateSourceCount);
    const columns = this.buildColumns(selectedColumns, projection.selectedKeyMeta);
    const rows = this.buildRows(shows, projection, columns);
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
    selectedColumnByKey: Map<string, SelectedReportColumn>,
    sharedFieldByKey: Map<string, Awaited<ReturnType<StudioService['getSharedFields']>>[number]>,
  ): RunProjection {
    const selectedColumnKeys = new Set(selectedColumnByKey.keys());
    const hasSelectedTaskColumns = Array.from(selectedColumnKeys).some((columnKey) => !this.isSystemColumn(columnKey));
    const rowsByShowUid: RowsByShowUid = new Map(shows.map((show) => [show.uid, {}]));
    // Canonical per-show rollup of the extracted platform-performance facts.
    // Platform-performance report columns read from here, never `task.content`.
    const showPerformanceByUid = new Map<string, ShowPerformanceAggregate>(
      shows.map((show) => [show.uid, aggregateShowPlatformPerformance(show.showPlatforms)]),
    );
    // Hydrated facts that were selected but have no per-show projection. Holds
    // columnKey -> label so the run can reject them with a clear message.
    const unsupportedFactColumns = new Map<string, string>();
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
        ?? this.compileProjectionFields(task, selectedColumnByKey, sharedFieldByKey);
      if (!projectorCache.has(cacheKey)) {
        projectorCache.set(cacheKey, projectionFields);
      }
      if (projectionFields.length === 0) {
        continue;
      }
      for (const projectedField of projectionFields) {
        if (projectedField.unsupportedFactLabel) {
          unsupportedFactColumns.set(projectedField.columnKey, projectedField.unsupportedFactLabel);
        }
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
          // Hydrated facts with no per-show projection are rejected after the
          // pass; skip projecting a null cell for them in the meantime.
          if (projectedField.unsupportedFactLabel) {
            continue;
          }

          const { columnKey, extraColumnKey } = projectedField;
          let value: unknown;
          let extra: string | null = null;
          if (projectedField.performanceMetric) {
            // The operational fact, sourced from the extracted ShowPlatform
            // rollup — independent of which task surfaced the column.
            //
            // Intentional: fact extraction only runs when a task transitions to
            // COMPLETED (see TaskSubmissionService.submitTaskContent), so a
            // still-in-REVIEW submission has no extracted column yet and its
            // performance cell stays blank. Performance columns export approved
            // operational facts only; unapproved values are deliberately not
            // surfaced as finalized metrics. This is not a missing-data bug.
            value = this.readShowMetric(showPerformanceByUid.get(showUid), projectedField.performanceMetric);
          } else {
            const input = projectTaskReportContentInput(contentRecord, {
              key: projectedField.fieldKey,
              type: projectedField.meta.type,
            });
            value = input.value;
            extra = input.extra;
          }

          if (!(columnKey in row)) {
            row[columnKey] = value;
          }

          if (extraColumnKey && !(extraColumnKey in row)) {
            row[extraColumnKey] = extra;
          }

          if (!selectedKeyMeta.has(columnKey)) {
            selectedKeyMeta.set(columnKey, projectedField.meta);
          }
          if (extraColumnKey && !selectedKeyMeta.has(extraColumnKey)) {
            selectedKeyMeta.set(extraColumnKey, {
              ...projectedField.meta,
              type: 'textarea',
            });
          }
        }
      }
    }

    this.assertProjectableFactColumns(unsupportedFactColumns);

    return { rowsByShowUid, selectedKeyMeta, duplicateSourceCount, viewFilterMetaByShowUid };
  }

  /**
   * Convert a show's performance rollup into the report's numeric cell. GMV /
   * CTR / CTO aggregate in `Prisma.Decimal` and collapse to a JS number only at
   * the very end, so the export carries no intermediate float drift.
   */
  private readShowMetric(
    aggregate: ShowPerformanceAggregate | undefined,
    metric: PlatformPerformanceMetric,
  ): number | null {
    if (!aggregate) {
      return null;
    }
    const value = aggregate[metric];
    if (value === null) {
      return null;
    }
    return typeof value === 'number' ? value : value.toNumber();
  }

  /**
   * Reject report columns bound to hydrated facts that have no per-show
   * projection (e.g. per-platform violation, per-creator attendance times).
   * Emitting a silent null would read as "not reported" — the same class of bug
   * that left hydrated values invisible before. Fail loudly instead.
   */
  private assertProjectableFactColumns(unsupportedFactColumns: Map<string, string>): void {
    if (unsupportedFactColumns.size === 0) {
      return;
    }

    throw HttpError.badRequestWithDetails(
      'Selected columns reference per-target operational facts that cannot be projected into a one-row-per-show report',
      {
        incompatible_columns: [...unsupportedFactColumns.entries()].map(([key, label]) => ({
          key,
          label,
          reason: 'unsupported_system_fact_column',
        })),
      },
    );
  }

  private compileProjectionFields(
    task: ScopedTask,
    selectedColumnByKey: Map<string, SelectedReportColumn>,
    sharedFieldByKey: Map<string, Awaited<ReturnType<StudioService['getSharedFields']>>[number]>,
  ): CompiledProjectionField[] {
    const parsedSnapshot = safeParseTemplateSchema(task.snapshotSchema);
    if (!parsedSnapshot.success) {
      throw HttpError.internalServerError('Task template snapshot schema is invalid');
    }

    return parsedSnapshot.data.items.flatMap((field) => {
      const columnKey = getFieldReportDescriptor(parsedSnapshot.data, task.templateUid, field);
      const selectedColumn = selectedColumnByKey.get(columnKey);
      if (!selectedColumn) {
        return [];
      }

      const sharedFieldKey = getFieldSharedKey(parsedSnapshot.data, field) ?? undefined;
      const isStandard = 'standard' in field && !!field.standard;
      // Fall back to the canonical base when a v1 historical snapshot
      // references a suffixed key that's been removed from the registry.
      const sharedCategory = sharedFieldKey
        ? (sharedFieldByKey.get(sharedFieldKey)?.category
          ?? (() => {
            const match = sharedFieldKey.match(/^([a-z][a-z0-9_]*?)_l\d+$/);
            return match ? sharedFieldByKey.get(match[1])?.category : undefined;
          })())
        : undefined;

      const systemFactKey = 'system_fact_key' in field ? field.system_fact_key : undefined;
      const factProjection = this.classifyFactProjection(systemFactKey, selectedColumn.label ?? columnKey);

      return [{
        fieldKey: getFieldContentKey(parsedSnapshot.data, field),
        columnKey,
        extraColumnKey: selectedColumn.include_extra ? this.buildInputExtraColumnKey(columnKey) : null,
        performanceMetric: factProjection.performanceMetric,
        unsupportedFactLabel: factProjection.unsupportedFactLabel,
        meta: {
          type: field.type,
          standard: isStandard || undefined,
          category: sharedCategory,
          sourceTemplateId: sharedFieldKey ? undefined : task.templateUid,
          sourceTemplateName: sharedFieldKey ? undefined : task.templateName,
        },
      }];
    });
  }

  /**
   * Decide how a selected field's `system_fact_key` (if any) projects into a
   * per-show report cell:
   * - no fact key, or a show-scoped fact (value stored at the plain content
   *   key): ordinary content projection, no special handling here.
   * - a platform-performance fact: read the show's extracted `ShowPlatform`
   *   rollup via `performanceMetric`.
   * - any other hydrated (creator/platform) fact: no defined per-show scalar —
   *   flag it so the run rejects the column instead of silently nulling it.
   */
  private classifyFactProjection(
    systemFactKey: SystemFactKey | undefined,
    label: string,
  ): { performanceMetric?: PlatformPerformanceMetric; unsupportedFactLabel?: string } {
    if (!systemFactKey) {
      return {};
    }

    const performanceMetric = PLATFORM_PERFORMANCE_METRIC[systemFactKey as keyof typeof PLATFORM_PERFORMANCE_METRIC];
    if (performanceMetric) {
      return { performanceMetric };
    }

    // Show-scoped facts live at the plain content key and project like any
    // ordinary field; only hydrated (per-target) facts lack a per-show rollup.
    if (getSystemFactKeyDefinition(systemFactKey).target === 'show') {
      return {};
    }

    return { unsupportedFactLabel: label };
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
    resultColumns: Array<{ key: string }>,
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
      for (const column of resultColumns) {
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
    selectedColumns: SelectedReportColumn[],
    selectedKeyMeta: Map<string, SelectedKeyMeta>,
  ): TaskReportColumn[] {
    return selectedColumns.flatMap((column) => {
      const selectedMeta = selectedKeyMeta.get(column.key);
      const fallbackTemplateId = this.readTemplateUidFromColumnKey(column.key);
      const valueColumn: TaskReportColumn = {
        key: column.key,
        label: column.label,
        type: selectedMeta?.type ?? this.readSystemColumnMeta(column.key)?.type ?? column.type ?? 'text',
        source_template_id: selectedMeta?.sourceTemplateId ?? fallbackTemplateId ?? null,
        source_template_name: selectedMeta?.sourceTemplateName ?? null,
        standard: selectedMeta?.standard,
        category: selectedMeta?.category,
        role: 'value',
      };

      if (this.isSystemColumn(column.key) || !column.include_extra) {
        return [valueColumn];
      }

      const extraColumnKey = this.buildInputExtraColumnKey(column.key);
      const extraMeta = selectedKeyMeta.get(extraColumnKey);
      return [
        valueColumn,
        {
          key: extraColumnKey,
          label: `${column.label} Extra`,
          type: extraMeta?.type ?? 'textarea',
          source_template_id: extraMeta?.sourceTemplateId ?? selectedMeta?.sourceTemplateId ?? fallbackTemplateId ?? null,
          source_template_name: extraMeta?.sourceTemplateName ?? selectedMeta?.sourceTemplateName ?? null,
          standard: extraMeta?.standard ?? selectedMeta?.standard,
          category: extraMeta?.category ?? selectedMeta?.category,
          role: 'extra',
          value_column_key: column.key,
        },
      ];
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

  private buildInputExtraColumnKey(columnKey: string): string {
    return `${columnKey}__extra`;
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
      [TASK_REPORT_SYSTEM_COLUMN.ACTUAL_START_TIME]: show.actualStartTime?.toISOString() ?? null,
      [TASK_REPORT_SYSTEM_COLUMN.ACTUAL_END_TIME]: show.actualEndTime?.toISOString() ?? null,
      [TASK_REPORT_SYSTEM_COLUMN.ACTUALS_STATUS]: deriveActualsStatus(show.actualStartTime, show.actualEndTime),
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
