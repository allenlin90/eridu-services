import { Injectable } from '@nestjs/common';

import type {
  GetTaskReportSourcesQuery,
  TaskReportPreflightRequest,
  TaskReportPreflightResponse,
  TaskReportScope,
  TaskReportSourcesResponse,
  UiSchema,
} from '@eridu/api-types/task-management';
import {
  getFieldReportDescriptor,
  getFieldSharedKey,
  safeParseTemplateSchema,
} from '@eridu/api-types/task-management';

import {
  type TaskReportScopeFilters,
  TaskReportScopeRepository,
} from './task-report-scope.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { OPERATIONAL_DAY_START_HOUR } from '@/lib/utils/operational-day.util';
import { StudioService } from '@/models/studio/studio.service';

const LEGACY_SHARED_KEY_PATTERN = /^([a-z][a-z0-9_]*?)_l\d+$/;

type ResolvedSharedField = {
  key: string;
  entry: Awaited<ReturnType<StudioService['getSharedFields']>>[number];
};

/**
 * Resolve a field's `shared_field_key` against the studio registry, falling
 * back to the canonical base (`<base>_l<N>` → `<base>`) when the suffixed
 * entry is no longer registered. v1 historical snapshots reference the
 * suffixed keys, but after the post-migration cleanup only the canonical
 * base is in the registry. Returning the resolved key keeps source-discovery
 * useful across both engines.
 */
function resolveSharedFieldEntry(
  rawSharedKey: string | undefined,
  sharedFieldByKey: Map<string, Awaited<ReturnType<StudioService['getSharedFields']>>[number]>,
): ResolvedSharedField | undefined {
  if (!rawSharedKey) {
    return undefined;
  }
  const direct = sharedFieldByKey.get(rawSharedKey);
  if (direct) {
    return { key: rawSharedKey, entry: direct };
  }
  const match = rawSharedKey.match(LEGACY_SHARED_KEY_PATTERN);
  if (!match) {
    return undefined;
  }
  const base = match[1];
  const baseEntry = sharedFieldByKey.get(base);
  if (!baseEntry) {
    return undefined;
  }
  return { key: base, entry: baseEntry };
}

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
   * Date range is required to keep source discovery bounded to a scoped show window.
   */
  async getSources(studioUid: string, query: GetTaskReportSourcesQuery): Promise<TaskReportSourcesResponse> {
    const filters = this.resolveScopeFilters(query);

    const [sourceSnapshots, studioSharedFields] = await Promise.all([
      this.taskReportScopeRepository.findSourceSnapshotsInScope(studioUid, filters),
      this.studioService.getSharedFields(studioUid),
    ]);
    const orderedSourceSnapshots = [...sourceSnapshots].sort((a, b) => (
      a.templateUid.localeCompare(b.templateUid)
      || b.snapshotVersion - a.snapshotVersion
      || b.taskCount - a.taskCount
    ));

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

    for (const sourceSnapshot of orderedSourceSnapshots) {
      const parsedSnapshot = safeParseTemplateSchema(sourceSnapshot.snapshotSchema);
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
        const columnKey = getFieldReportDescriptor(parsedSnapshot.data, sourceSnapshot.templateUid, item);

        // Keep the first encountered field definition per semantic descriptor. Snapshot input is
        // pre-sorted by template + version DESC, so "first" means latest schema.
        if (source.fieldsByKey.has(columnKey)) {
          continue;
        }

        const rawSharedFieldKey = getFieldSharedKey(parsedSnapshot.data, item) ?? undefined;
        // After the post-migration legacy cleanup, suffixed entries like
        // `gmv_l1` are removed from the registry — only the canonical `gmv`
        // remains. v1 historical snapshots still reference the suffixed keys,
        // so we fall back to the canonical base when the direct lookup misses.
        // The resolved key is the one that should appear in the response so
        // the FE picker maps the column to the canonical shared-field entry.
        const resolved = resolveSharedFieldEntry(rawSharedFieldKey, sharedFieldByKey);

        source.fieldsByKey.set(columnKey, {
          key: columnKey,
          field_key: item.key,
          label: item.label,
          type: item.type,
          standard: 'standard' in item ? item.standard : undefined,
          category: resolved?.entry.category,
          group: 'group' in item ? item.group : undefined,
          shared_field_key: resolved?.key ?? rawSharedFieldKey,
          source_template_id: sourceSnapshot.templateUid,
          source_template_name: sourceSnapshot.templateName,
        });

        if (resolved) {
          standardFieldKeys.add(resolved.key);
        }
      }

      sourceMap.set(sourceSnapshot.templateUid, source);
    }

    return {
      // FE is responsible for display ordering (e.g. by submitted_task_count DESC).
      // BE returns sources in deterministic insertion order (by template UID).
      sources: [...sourceMap.values()]
        .map((source) => ({
          template_id: source.template_id,
          template_name: source.template_name,
          task_type: source.task_type,
          submitted_task_count: source.submitted_task_count,
          fields: [...source.fieldsByKey.values()],
        })),
      shared_fields: studioSharedFields
        .filter((field) => standardFieldKeys.has(field.key))
        .sort((a, b) => a.key.localeCompare(b.key)),
    };
  }

  /**
   * Return show/task counts and limit check for preflight confirmation.
   */
  async preflight(
    studioUid: string,
    payload: TaskReportPreflightRequest,
  ): Promise<TaskReportPreflightResponse> {
    const filters = this.resolveScopeFilters(payload.scope);

    const [showCount, taskCount] = await Promise.all([
      this.taskReportScopeRepository.countShowsInScope(studioUid, filters),
      this.taskReportScopeRepository.countSubmittedTasksInScope(studioUid, filters),
    ]);

    const limit = TaskReportScopeService.DEFAULT_ROW_LIMIT;
    return {
      show_count: showCount,
      task_count: taskCount,
      within_limit: showCount <= limit && taskCount <= limit,
      limit,
    };
  }

  /**
   * Resolves scope input into typed DB filter params with date range enforcement.
   * Called by TaskReportRunService and source discovery to avoid duplicating scope parsing logic.
   * Dates are required.
   */
  resolveScopeFilters(
    scope: TaskReportScope,
  ): TaskReportScopeFilters {
    const { dateFrom, dateTo } = this.parseDatesRequired(scope);

    return {
      dateFrom,
      dateTo,
      clientIds: scope.client_id,
      showStandardIds: scope.show_standard_id,
      showTypeIds: scope.show_type_id,
      showIds: scope.show_ids,
      sourceTemplateIds: scope.source_templates,
      submittedStatuses: scope.submitted_statuses,
    };
  }

  /**
   * Parse and enforce a required date range. Throws 400 if either bound is missing.
   */
  private parseDatesRequired(
    scope: Pick<TaskReportScope, 'date_preset' | 'date_from' | 'date_to'>,
  ): { dateFrom: Date; dateTo: Date } {
    if (!scope.date_from || !scope.date_to) {
      throw HttpError.badRequest('date_from and date_to are required');
    }

    return {
      // Keep date boundaries in local timezone to match existing show/task filtering behavior.
      dateFrom: this.parseDateBoundary(scope.date_from, 'start'),
      dateTo: this.parseDateBoundary(scope.date_to, 'end'),
    };
  }

  /**
   * Convert an ISO date string to a Date at the start (06:00:00) or end (05:59:59.999 of next day)
   * of the operational day timezone window.
   */
  private parseDateBoundary(dateStr: string, boundary: 'start' | 'end'): Date {
    // Local-tz string (no trailing Z) to match existing show/task filtering behavior.
    const date = new Date(`${dateStr}T00:00:00`);
    if (boundary === 'start') {
      date.setHours(OPERATIONAL_DAY_START_HOUR, 0, 0, 0);
    } else {
      date.setDate(date.getDate() + 1);
      date.setHours(OPERATIONAL_DAY_START_HOUR - 1, 59, 59, 999);
    }

    return date;
  }

  private readTaskType(metadata: UiSchema['metadata'], fallback = 'OTHER'): string {
    const taskType = metadata?.task_type;
    return typeof taskType === 'string' && taskType.length > 0 ? taskType : fallback;
  }
}
