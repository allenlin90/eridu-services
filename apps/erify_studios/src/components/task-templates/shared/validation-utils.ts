import type { FieldItem } from '../builder/schema';

/**
 * Validates a field value against its schema constraints.
 * Currently supports numeric min/max validation.
 */
export function validateField(field: FieldItem, value: any): string | null {
  if (field.type === 'number') {
    const numVal = Number(value);
    if (typeof field.validation?.min === 'number' && numVal < field.validation.min) {
      return `Value must be at least ${field.validation.min}`;
    }
    if (typeof field.validation?.max === 'number' && numVal > field.validation.max) {
      return `Value must be at most ${field.validation.max}`;
    }
    if (typeof field.validation?.max === 'number' && numVal > field.validation.max) {
      return `Value must be at most ${field.validation.max}`;
    }
  }

  if (field.type === 'url' && value && typeof value === 'string') {
    if (!URL.canParse(value)) {
      return 'Please enter a valid URL (e.g., https://example.com)';
    }
  }

  return null;
}
