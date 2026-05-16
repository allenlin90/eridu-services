import { describe, expect, it } from 'vitest';

import { toMoneyString } from '../money-input';

describe('toMoneyString', () => {
  it('accepts leading-decimal forms like .5 and -.5', () => {
    expect(toMoneyString('.5')).toBe('0.50');
    expect(toMoneyString('-.5')).toBe('-0.50');
  });

  it('pads whole numbers to two decimals', () => {
    expect(toMoneyString('5')).toBe('5.00');
    expect(toMoneyString('-5')).toBe('-5.00');
  });

  it('rounds half-away-from-zero on the cent boundary', () => {
    expect(toMoneyString('1.005')).toBe('1.01');
    expect(toMoneyString('1.004')).toBe('1.00');
  });

  it('rejects empty, whitespace, and non-numeric input', () => {
    expect(() => toMoneyString('')).toThrow();
    expect(() => toMoneyString('   ')).toThrow();
    expect(() => toMoneyString('-')).toThrow();
    expect(() => toMoneyString('.')).toThrow();
    expect(() => toMoneyString('abc')).toThrow();
  });

  it('rejects scientific notation that Big would otherwise accept', () => {
    expect(() => toMoneyString('1e3')).toThrow();
    expect(() => toMoneyString('-1.5e2')).toThrow();
  });
});
