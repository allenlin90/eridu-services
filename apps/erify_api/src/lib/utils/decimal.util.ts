/**
 * Converts a Prisma Decimal (or number/string) value to a fixed-precision string.
 * Used in DTO transforms to serialize monetary/decimal fields as strings.
 */
export function decimalToString(value: unknown): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object'
    && value !== null
    && 'toString' in value
    && typeof value.toString === 'function'
  ) {
    return value.toString();
  }

  return '0.00';
}

/**
 * Converts a Prisma Decimal to string, returning null if the value is null/undefined.
 */
export function decimalToStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return decimalToString(value);
}
