import type { TaskReportColumn } from '@eridu/api-types/task-management';

export function serializeCsv(
  rows: Record<string, unknown>[],
  columns: TaskReportColumn[],
): string {
  if (!columns.length)
    return '';

  // Append template origin to column headers for custom (non-standard) fields so
  // the exported CSV is self-explanatory when multiple templates are included.
  const header = columns.map((col) => {
    let title = col.label;
    if (col.source_template_name && !col.standard) {
      title = `${title} (${col.source_template_name})`;
    }
    return `"${title.replace(/"/g, '""')}"`;
  }).join(',');

  const csvRows = rows.map((row) => {
    return columns.map((col) => {
      let val = row[col.key];

      if (val === null || val === undefined) {
        val = '';
      } else if (Array.isArray(val)) {
        val = (val as unknown[]).join('; ');
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else if (typeof val === 'boolean') {
        val = val ? 'Yes' : 'No';
      } else {
        val = String(val);
      }

      return `"${(val as string).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [header, ...csvRows].join('\n');
}
