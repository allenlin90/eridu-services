import type { TaskReportSelectedColumn } from '@eridu/api-types/task-management';

export function serializeCsv(
  rows: Record<string, any>[],
  columns: TaskReportSelectedColumn[],
): string {
  if (!columns.length)
    return '';

  // Get headers, optionally adding template context if it's a custom field
  const header = columns.map((col) => {
    let title = col.label;
    // We could append the template origin if it is available in columnMap
    // But since the API returns source_template_name on the column object itself,
    // let's rely on that if it exists.
    const colDetails = col as any;
    if (colDetails.source_template_name && !colDetails.standard) {
      title = `${title} (${colDetails.source_template_name})`;
    }
    return `"${title.replace(/"/g, '""')}"`;
  }).join(',');

  const csvRows = rows.map((row) => {
    return columns.map((col) => {
      let val = row[col.key];

      if (val === null || val === undefined) {
        val = '';
      } else if (Array.isArray(val)) {
        val = val.join('; ');
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else if (typeof val === 'boolean') {
        val = val ? 'Yes' : 'No';
      } else {
        val = String(val);
      }

      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [header, ...csvRows].join('\n');
}
