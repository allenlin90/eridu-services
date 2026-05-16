import { describe, expect, it } from 'vitest';

import { serializeRowsToCsv } from '../csv';

type Row = {
  name: string;
  amount: string;
};

const columns = [
  { key: 'name' as const, label: 'Name' },
  { key: 'amount' as const, label: 'Amount' },
];

describe('serializeRowsToCsv', () => {
  it('returns an empty string when no columns are provided', () => {
    expect(serializeRowsToCsv<Row>({ rows: [{ name: 'A', amount: '1' }], columns: [] })).toBe('');
  });

  it('emits a UTF-8 BOM, CRLF line endings, and quoted cells', () => {
    const csv = serializeRowsToCsv<Row>({
      rows: [
        { name: 'Ava', amount: '10' },
        { name: 'Bob', amount: '20' },
      ],
      columns,
    });

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('\r\n');
    expect(csv).not.toMatch(/[^\r]\n/);
    expect(csv).toContain('"Name","Amount"');
    expect(csv).toContain('"Ava","10"');
    expect(csv).toContain('"Bob","20"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    const csv = serializeRowsToCsv<Row>({
      rows: [{ name: 'Ava "Lead"', amount: '10' }],
      columns,
    });

    expect(csv).toContain('"Ava ""Lead"""');
  });

  it('neutralizes CSV-injection-prone leading characters', () => {
    const csv = serializeRowsToCsv<Row>({
      rows: [
        { name: '=SUM(A1:A2)', amount: '+1' },
        { name: '-1', amount: '@formula' },
        { name: '\tindented', amount: '\rcr' },
      ],
      columns,
    });

    expect(csv).toContain('"\'=SUM(A1:A2)"');
    expect(csv).toContain('"\'+1"');
    expect(csv).toContain('"\'-1"');
    expect(csv).toContain('"\'@formula"');
    expect(csv).toContain('"\'\tindented"');
    expect(csv).toContain('"\'\rcr"');
  });
});
