/**
 * Converts a Prisma Decimal (or any unknown value) to a string representation.
 * Returns null for null/undefined inputs.
 *
 * Used in schema transform layers to serialize Prisma Decimal fields to API strings.
 */
export function decimalToString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    throw new TypeError('Decimal values must not be JS numbers');
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object'
    && 'toString' in value
    && typeof value.toString === 'function'
  ) {
    return value.toString();
  }

  return null;
}
