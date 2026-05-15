const MONEY_INPUT_PATTERN = /^(-?)(\d*)(?:\.(\d+))?$/;

/**
 * Normalizes a typed money string to two-decimal form without using binary floats.
 * Extra precision is rounded half-away-from-zero on the cent boundary.
 */
export function toMoneyString(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(MONEY_INPUT_PATTERN);
  if (!match) {
    throw new TypeError('Amount must be a number');
  }
  const sign = match[1] ?? '';
  const whole = match[2] || '0';
  const fraction = match[3] ?? '';
  if (!match[2] && !match[3]) {
    throw new TypeError('Amount must be a number');
  }

  if (fraction.length <= 2) {
    const padded = (`${fraction}00`).slice(0, 2);
    return `${sign}${whole}.${padded}`;
  }

  const firstTwo = fraction.slice(0, 2);
  const roundingDigit = fraction.charCodeAt(2) - 48;
  if (roundingDigit < 5) {
    return `${sign}${whole}.${firstTwo}`;
  }

  const combined = (BigInt(whole) * 100n) + BigInt(firstTwo) + 1n;
  const newWhole = (combined / 100n).toString();
  const newCents = (combined % 100n).toString().padStart(2, '0');
  return `${sign}${newWhole}.${newCents}`;
}
