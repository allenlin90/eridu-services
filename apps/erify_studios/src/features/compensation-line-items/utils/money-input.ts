import Big from 'big.js';

/**
 * Normalizes a typed money string to two-decimal form with decimal arithmetic.
 */
export function toMoneyString(raw: string): string {
  const trimmed = raw.trim();
  try {
    return new Big(trimmed).toFixed(2);
  } catch {
    throw new TypeError('Amount must be a number');
  }
}

export function toDisplayMoneyString(value: string | number): string {
  return new Big(value).toFixed(2);
}
