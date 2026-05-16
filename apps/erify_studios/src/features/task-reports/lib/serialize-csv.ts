import type { TaskReportColumn } from '@eridu/api-types/task-management';

import { type CsvColumn, serializeRowsToCsv } from '@/lib/csv';

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).join('; ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function buildColumnLabel(column: TaskReportColumn): string {
  if (column.source_template_name && !column.standard) {
    return `${column.label} (${column.source_template_name})`;
  }
  return column.label;
}

export function serializeCsv(
  rows: Record<string, unknown>[],
  columns: TaskReportColumn[],
): string {
  if (columns.length === 0) {
    return '';
  }

  const csvColumns: CsvColumn<Record<string, string>>[] = columns.map((column) => ({
    key: column.key,
    label: buildColumnLabel(column),
  }));

  const csvRows: Record<string, string>[] = rows.map((row) => {
    const stringified: Record<string, string> = {};
    for (const column of columns) {
      stringified[column.key] = stringifyCell(row[column.key]);
    }
    return stringified;
  });

  return serializeRowsToCsv({ rows: csvRows, columns: csvColumns });
}
