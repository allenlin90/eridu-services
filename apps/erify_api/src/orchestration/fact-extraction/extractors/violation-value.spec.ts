import { parseViolationValue } from './violation-value';

describe('parseViolationValue', () => {
  it('returns null for non-array input', () => {
    expect(parseViolationValue(null)).toBeNull();
    expect(parseViolationValue(undefined)).toBeNull();
    expect(parseViolationValue('COPYRIGHT')).toBeNull();
    expect(parseViolationValue({ violationType: 'COPYRIGHT' })).toBeNull();
  });

  it('returns [] for an empty array (operator clear)', () => {
    expect(parseViolationValue([])).toEqual([]);
  });

  it('returns null when every entry of a non-empty array is invalid', () => {
    expect(parseViolationValue([''])).toBeNull();
    expect(parseViolationValue(['   '])).toBeNull();
    expect(parseViolationValue([123, null, ''])).toBeNull();
  });

  it('parses and keeps valid entries, dropping invalid ones', () => {
    expect(parseViolationValue(['COPYRIGHT', 123, 'DEFAMATION:CRITICAL'])).toEqual([
      { violationType: 'COPYRIGHT', severity: 'WARNING' },
      { violationType: 'DEFAMATION', severity: 'CRITICAL' },
    ]);
  });

  it('uppercases and trims type and severity', () => {
    expect(parseViolationValue(['  copyright : critical  '])).toEqual([
      { violationType: 'COPYRIGHT', severity: 'CRITICAL' },
    ]);
  });
});
