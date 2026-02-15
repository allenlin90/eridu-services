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

/**
 * Determines if the "Require Explanation" field should be shown based on the current value and validation rules.
 */
export function shouldShowReason(field: FieldItem, value: any): boolean {
  const reason = field.validation?.require_reason;

  if (!reason)
    return false;

  if (reason === 'always')
    return true;

  // Boolean/Checkbox Logic
  if (field.type === 'checkbox') {
    if (reason === 'on-true' && value === true)
      return true;
    if (reason === 'on-false' && value === false)
      return true;
    // Checkbox doesn't support complex array rules currently, but if it did, we'd fall through
    if (typeof reason === 'string')
      return false;
  }

  // Complex Conditional Logic (Array of conditions)
  if (Array.isArray(reason)) {
    return reason.some((cond) => {
      // Number Logic
      if (field.type === 'number' && typeof value === 'number') {
        const condValue = Number(cond.value);
        switch (cond.op) {
          case 'lt': return value < condValue;
          case 'lte': return value <= condValue;
          case 'gt': return value > condValue;
          case 'gte': return value >= condValue;
          case 'eq': return value === condValue;
          case 'neq': return value !== condValue;
          default: return false;
        }
      }

      // Date/DateTime Logic
      if (['date', 'datetime'].includes(field.type) && value) {
        const valDate = new Date(value).getTime();
        const condDate = new Date(cond.value as string).getTime();

        if (Number.isNaN(valDate) || Number.isNaN(condDate))
          return false;

        switch (cond.op) {
          case 'lt': return valDate < condDate; // Before
          case 'gt': return valDate > condDate; // After
          case 'eq': return valDate === condDate; // On
          default: return false;
        }
      }

      // Select Logic (String Value)
      if (field.type === 'select' && typeof value === 'string') {
        switch (cond.op) {
          case 'eq': return value === cond.value;
          case 'neq': return value !== cond.value;
          case 'in': return Array.isArray(cond.value) && cond.value.includes(value);
          case 'not_in': return Array.isArray(cond.value) && !cond.value.includes(value);
          default: return false;
        }
      }

      // Multiselect Logic (Array Value)
      if (field.type === 'multiselect' && Array.isArray(value)) {
        const targets = Array.isArray(cond.value) ? cond.value : [cond.value];
        const valueArray = value as any[];

        switch (cond.op) {
          case 'in': // Intersection: True if ANY selected value is in targets
            return valueArray.some((v) => targets.includes(v));
          case 'not_in': // Disjoint: True if NO selected value is in targets
            return !valueArray.some((v) => targets.includes(v));
          case 'eq': // Exact match (order insensitive sort for comparison)
            return JSON.stringify([...valueArray].sort()) === JSON.stringify([...targets].sort());
          case 'neq': // Not Equal
            return JSON.stringify([...valueArray].sort()) !== JSON.stringify([...targets].sort());
          default: return false;
        }
      }

      return false;
    });
  }

  return false;
}
