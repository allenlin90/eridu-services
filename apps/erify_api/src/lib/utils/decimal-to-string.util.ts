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
    // TODO(phase5/financial): native number loses precision beyond 15 significant digits.
    // If monetary values ever flow through as JS numbers rather than Prisma Decimal objects,
    // this toFixed(2) silently rounds. Audit and enforce Decimal-only inputs in phase 5.
    return value.toFixed(2);
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
