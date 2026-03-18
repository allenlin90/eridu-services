import type { TaskReportSelectedColumn } from '@eridu/api-types/task-management';

export type TaskReportViewFilters = {
  client_id?: string;
  show_status_id?: string;
  assignee?: string;
  studio_room_id?: string;
  search?: string;
};

export function filterRows(
  rows: Record<string, any>[],
  columns: TaskReportSelectedColumn[],
  filters: TaskReportViewFilters,
): Record<string, any>[] {
  if (!rows || rows.length === 0)
    return [];
  if (Object.keys(filters).length === 0)
    return rows;

  return rows.filter((row) => {
    // Exact match filters
    if (filters.client_id && row.client_id !== filters.client_id)
      return false;
    if (filters.show_status_id && row.show_status_id !== filters.show_status_id)
      return false;
    if (filters.studio_room_id && row.studio_room_id !== filters.studio_room_id)
      return false;
    if (filters.assignee && row.assignee_id !== filters.assignee && row.assignee !== filters.assignee)
      return false;

    // Text search against all visible columns
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
