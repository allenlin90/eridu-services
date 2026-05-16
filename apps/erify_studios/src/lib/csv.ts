const UTF8_BOM = '﻿';
const CSV_INJECTION_PREFIX = /^[=+\-@\t\r]/;

export type CsvColumn<TRow> = {
  key: keyof TRow & string;
  label: string;
};

function escapeCsvCell(value: string): string {
  const safe = CSV_INJECTION_PREFIX.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export type SerializeRowsToCsvParams<TRow extends Record<string, string>> = {
  rows: TRow[];
  columns: CsvColumn<TRow>[];
};

export function serializeRowsToCsv<TRow extends Record<string, string>>({
  rows,
  columns,
}: SerializeRowsToCsvParams<TRow>): string {
  if (columns.length === 0) {
    return '';
  }

  const header = columns.map((column) => escapeCsvCell(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column.key])).join(','));

  return `${UTF8_BOM}${[header, ...body].join('\r\n')}`;
}
