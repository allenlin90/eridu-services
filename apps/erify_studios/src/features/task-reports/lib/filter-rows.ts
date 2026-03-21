import type { TaskReportColumn } from '@eridu/api-types/task-management';

/**
 * View filters for client-side slicing of the cached result set.
 *
 * `client_name` / `studio_room_name` match against system column values in the result rows.
 * `search` performs a full-text search across all visible columns.
 */
export type TaskReportViewFilters = {
  /** Stable client filter value when available (falls back to display name if no id exists). */
  client_id?: string;
  /** Exact match against the `client_name` system column value. */
  client_name?: string;
  /** Stable show-status filter value when available (falls back to display name if no id exists). */
  show_status_id?: string;
  /** Optional explicit show-status name filter. */
  show_status_name?: string;
  /** Stable assignee filter value when available (falls back to display name if no id exists). */
  assignee?: string;
  /** Stable room filter value when available (falls back to display name if no id exists). */
  studio_room_id?: string;
  /** Exact match against the `studio_room_name` system column value. */
  studio_room_name?: string;
  /** Free-text search across all visible column values. */
  search?: string;
};

export function readStringValues(...values: unknown[]): string[] {
  const result: string[] = [];

  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      result.push(value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.length > 0) {
          result.push(item);
        }
      }
    }
  }

  return result;
}

function matchesExactFilter(filter: string | undefined, ...values: unknown[]): boolean {
  if (!filter) {
    return true;
  }

  return readStringValues(...values).includes(filter);
}

export function filterRows(
  rows: Record<string, unknown>[],
  columns: TaskReportColumn[],
  filters: TaskReportViewFilters,
): Record<string, unknown>[] {
  if (!rows || rows.length === 0)
    return [];

  const clientFilter = filters.client_name ?? filters.client_id;
  const statusFilter = filters.show_status_name ?? filters.show_status_id;
  const roomFilter = filters.studio_room_name ?? filters.studio_room_id;
  const assigneeFilter = filters.assignee;

  if (!clientFilter && !statusFilter && !roomFilter && !assigneeFilter && !filters.search)
    return rows;

  return rows.filter((row) => {
    // Exact match against system-column values with id fallback for compatibility.
    if (!matchesExactFilter(clientFilter, row.client_name, row.client_id))
      return false;
    if (!matchesExactFilter(statusFilter, row.show_status_name, row.show_status_id))
      return false;
    if (!matchesExactFilter(roomFilter, row.studio_room_name, row.studio_room_id))
      return false;
    if (!matchesExactFilter(
      assigneeFilter,
      row.assignee_name,
      row.assignee,
      row.assignee_id,
      row.assignee_names,
      row.assignee_ids,
    )) {
      return false;
    }

    // Full-text search across all selected columns.
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = columns.some((col) => {
        const val = row[col.key];
        if (val === null || val === undefined)
          return false;
        if (typeof val === 'object')
          return JSON.stringify(val).toLowerCase().includes(q);
        return String(val).toLowerCase().includes(q);
      });
      if (!match)
        return false;
    }

    return true;
  });
}
