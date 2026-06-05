import { describe, expect, it } from 'vitest';

import { toCurrencyDisplayString, toDecimalDisplayString } from '../decimal-format';

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

describe('toCurrencyDisplayString', () => {
  it('prefixes the currency symbol for non-negative amounts', () => {
    expect(toCurrencyDisplayString('20')).toBe('$20.00');
    expect(toCurrencyDisplayString('0')).toBe('$0.00');
  });

  it('keeps the minus sign ahead of the currency symbol for negative amounts', () => {
    expect(toCurrencyDisplayString('-1.5')).toBe('-$1.50');
  });

  it('inherits the string-only contract', () => {
    expect(() => toCurrencyDisplayString(10 as never)).toThrow('Decimal display values must be strings');
  });
});
