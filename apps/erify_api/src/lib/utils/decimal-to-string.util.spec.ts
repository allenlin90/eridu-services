import { decimalToString } from './decimal-to-string.util';

describe('decimalToString', () => {
  it('returns null for nullish inputs', () => {
    expect(decimalToString(null)).toBeNull();
    expect(decimalToString(undefined)).toBeNull();
  });

  it('serializes decimal-like objects through their string representation', () => {
    expect(decimalToString({ toString: () => '123.45' })).toBe('123.45');
  });

  it('rejects JS numbers instead of silently rounding money values', () => {
    expect(() => decimalToString(10)).toThrow('Decimal values must not be JS numbers');
  });
});
