import type { TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';

function sortValues(values?: string[]) {
  return values ? [...values].sort() : undefined;
}

function normalizeScope(scope: TaskReportScope | null) {
  if (!scope) {
    return null;
  }

  return {
    ...scope,
    client_id: sortValues(scope.client_id),
    show_standard_id: sortValues(scope.show_standard_id),
    show_type_id: sortValues(scope.show_type_id),
    show_ids: sortValues(scope.show_ids),
    source_templates: sortValues(scope.source_templates),
    submitted_statuses: sortValues(scope.submitted_statuses),
  };
}

export function buildTaskReportResultCacheKey(input: {
  definitionId?: string | null;
  scope: TaskReportScope | null;
  columns: TaskReportSelectedColumn[];
}) {
  return JSON.stringify({
    definition_id: input.definitionId ?? null,
    scope: normalizeScope(input.scope),
    columns: input.columns.map((column) => ({
      key: column.key,
      label: column.label,
      type: column.type ?? null,
    })),
  });
}
