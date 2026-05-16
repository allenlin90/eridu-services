import Big from 'big.js';

const MONEY_INPUT_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Normalizes a typed money string to two-decimal form with decimal arithmetic.
 * Rejects scientific notation and other Big-accepted forms that don't match
 * what a money input field should produce.
 */
export function toMoneyString(raw: string): string {
  const trimmed = raw.trim();
  if (!MONEY_INPUT_PATTERN.test(trimmed)) {
    throw new TypeError('Amount must be a number');
  }
  try {
    return new Big(trimmed).toFixed(2);
  } catch {
    throw new TypeError('Amount must be a number');
  }
}
