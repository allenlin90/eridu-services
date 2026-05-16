import { describe, expect, it } from 'vitest';

import { toDecimalDisplayString } from '../decimal-format';

describe('toDecimalDisplayString', () => {
  it('formats decimal strings to two-decimal precision without JS number precision loss', () => {
    expect(toDecimalDisplayString('9007199254740993.01')).toBe('9007199254740993.01');
    expect(toDecimalDisplayString('0.3')).toBe('0.30');
  });

  it('rejects JS numbers to enforce string-only inputs', () => {
    expect(() => toDecimalDisplayString(10 as never)).toThrow('Decimal display values must be strings');
  });

  it('throws on non-numeric strings', () => {
    expect(() => toDecimalDisplayString('abc')).toThrow();
  });
});
