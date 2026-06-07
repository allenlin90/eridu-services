import Big from 'big.js';

/**
 * Formats a decimal string (money or percentage) for display at two-decimal precision.
 * Accepts only strings — JS numbers are rejected because precision is lost during
 * JSON parsing before the value reaches this function. See Finance Guardrail #2.
 */
export function toDecimalDisplayString(value: string): string {
  if (typeof value !== 'string') {
    throw new TypeError('Decimal display values must be strings');
  }
  return new Big(value).toFixed(2);
}

export function toCurrencyDisplayString(
  value: string,
  locale = 'en-US',
  currency = 'USD',
): string {
  if (typeof value !== 'string') {
    throw new TypeError('Decimal display values must be strings');
  }
  const bigVal = new Big(value);
  const num = bigVal.toNumber();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(num);
}
