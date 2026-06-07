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
 * Formats a decimal string as a localized currency amount (e.g. `-$1.50`,
 * `฿12,345.67`). The string-only contract is preserved at the boundary, but the
 * value is then routed through a JS number for `Intl.NumberFormat`, so output is
 * rounded to the currency's default fraction digits — acceptable for display.
 * Sign placement (minus before the symbol) follows the locale's own rules.
 *
 * @throws if `locale`/`currency` are not valid BCP 47 / ISO 4217 values. Callers
 *   that read these from untrusted studio metadata should wrap in try/catch.
 */
export function toCurrencyDisplayString(
  value: string,
  locale = 'en-US',
  currency = 'USD',
): string {
  if (typeof value !== 'string') {
    throw new TypeError('Decimal display values must be strings');
  }
  const num = new Big(value).toNumber();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(num);
}

/**
 * Returns the localized currency symbol (e.g. `$`, `฿`) for a locale/currency
 * pair, for use as a prefix on values that are formatted separately (chart axis
 * ticks, abbreviated thousands). Falls back to a best-effort symbol rather than
 * throwing so callers can use it inline.
 */
export function currencySymbol(locale = 'en-US', currency = 'USD'): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency === 'THB' ? '฿' : '$';
  }
}
