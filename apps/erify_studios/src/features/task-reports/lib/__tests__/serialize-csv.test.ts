import { describe, expect, it } from 'vitest';

import type { TaskReportColumn } from '@eridu/api-types/task-management';

import { serializeCsv } from '../serialize-csv';

const standardColumns: TaskReportColumn[] = [
  { key: 'show_name', label: 'Show', type: 'text', standard: true },
  { key: 'tags', label: 'Tags', type: 'multiselect', standard: true },
  { key: 'completed', label: 'Completed', type: 'checkbox', standard: true },
  { key: 'metadata', label: 'Metadata', type: 'text', standard: true },
];

describe('serializeCsv', () => {
  it('returns empty string when columns are empty', () => {
    expect(serializeCsv([{ show_name: 'x' }], [])).toBe('');
  });

  it('stringifies arrays, booleans, objects, and nulls and emits BOM + CRLF', () => {
    const csv = serializeCsv(
      [{
        show_name: 'Pilot',
        tags: ['a', 'b'],
        completed: true,
        metadata: null,
      }],
      standardColumns,
    );

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('\r\n');
    expect(csv).toContain('"Pilot"');
    expect(csv).toContain('"a; b"');
    expect(csv).toContain('"Yes"');
    expect(csv).toContain('","');
  });

  it('decorates non-standard column headers with the source template name', () => {
    const csv = serializeCsv(
      [{ custom_field: 'value' }],
      [{ key: 'custom_field', label: 'Notes', type: 'text', source_template_name: 'Shoot Brief', standard: false }],
    );

    expect(csv).toContain('"Notes (Shoot Brief)"');
  });

  it('neutralizes CSV-injection-prone cell values', () => {
    const csv = serializeCsv(
      [{ show_name: '=SUM(A1:A2)', tags: '+1', completed: '-1', metadata: '@formula' }],
      standardColumns,
    );

    expect(csv).toContain('"\'=SUM(A1:A2)"');
    expect(csv).toContain('"\'+1"');
    expect(csv).toContain('"\'-1"');
    expect(csv).toContain('"\'@formula"');
  });
});
