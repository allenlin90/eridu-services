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

/**
 * Formats a decimal string as a USD amount, keeping the minus sign ahead of the
 * currency symbol (e.g. `-$1.50` rather than `$-1.50`). Wraps
 * {@link toDecimalDisplayString}, so it inherits the string-only contract.
 */
export function toCurrencyDisplayString(value: string): string {
  const formatted = toDecimalDisplayString(value);
  return formatted.startsWith('-') ? `-$${formatted.slice(1)}` : `$${formatted}`;
}
