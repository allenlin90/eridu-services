import type { FieldItem, FieldItemV2 } from './template-definition.schema.js';

type ReasonField = Pick<FieldItem | FieldItemV2, 'type' | 'validation'>;

function compareScalarValue(op: string, value: unknown, target: unknown): boolean {
  switch (op) {
    case 'eq':
      return value === target;
    case 'neq':
      return value !== target;
    case 'in':
      return Array.isArray(target) && target.includes(String(value));
    case 'not_in':
      return Array.isArray(target) && !target.includes(String(value));
    default:
      return false;
  }
}

export function hasReasonEvaluableValue(item: ReasonField, value: unknown): boolean {
  if (item.type === 'checkbox') {
    return typeof value === 'boolean';
  }

  if (item.type === 'multiselect') {
    return Array.isArray(value) && value.length > 0;
  }

  return value !== null && value !== undefined && value !== '';
}

export function shouldShowReasonField(item: ReasonField, value: unknown): boolean {
  const reason = item.validation?.require_reason;
  if (!reason) {
    return false;
  }
  if (reason === 'always') {
    return true;
  }

  if (item.type === 'checkbox') {
    if (reason === 'on-true') {
      return value === true;
    }
    if (reason === 'on-false') {
      return value === false;
    }
    return false;
  }

  if (!hasReasonEvaluableValue(item, value)) {
    return false;
  }

  if (!Array.isArray(reason)) {
    return false;
  }

  return reason.some((condition) => {
    if (item.type === 'number' && typeof value === 'number') {
      const target = Number(condition.value);
      switch (condition.op) {
        case 'lt':
          return value < target;
        case 'lte':
          return value <= target;
        case 'gt':
          return value > target;
        case 'gte':
          return value >= target;
        case 'eq':
          return value === target;
        case 'neq':
          return value !== target;
        default:
          return false;
      }
    }

    if ((item.type === 'date' || item.type === 'datetime') && typeof value === 'string') {
      const valueTime = new Date(value).getTime();
      if (Number.isNaN(valueTime)) {
        return false;
      }

      if (condition.op === 'in' || condition.op === 'not_in') {
        const targets = Array.isArray(condition.value)
          ? condition.value
          : [String(condition.value)];
        const targetTimes = targets
          .map((entry) => new Date(String(entry)).getTime())
          .filter((time) => !Number.isNaN(time));
        const matches = targetTimes.includes(valueTime);
        return condition.op === 'in' ? matches : !matches;
      }

      const targetTime = new Date(String(condition.value)).getTime();
      if (Number.isNaN(targetTime)) {
        return false;
      }

      switch (condition.op) {
        case 'lt':
          return valueTime < targetTime;
        case 'lte':
          return valueTime <= targetTime;
        case 'gt':
          return valueTime > targetTime;
        case 'gte':
          return valueTime >= targetTime;
        case 'eq':
          return valueTime === targetTime;
        case 'neq':
          return valueTime !== targetTime;
        default:
          return false;
      }
    }

    if (item.type === 'multiselect' && Array.isArray(value)) {
      const targets = Array.isArray(condition.value) ? condition.value : [String(condition.value)];
      if (condition.op === 'in') {
        return value.some((entry) => targets.includes(String(entry)));
      }
      if (condition.op === 'not_in') {
        return !value.some((entry) => targets.includes(String(entry)));
      }
      const sortedValue = [...value.map(String)].sort();
      const sortedTarget = [...targets].sort();
      if (condition.op === 'eq') {
        return JSON.stringify(sortedValue) === JSON.stringify(sortedTarget);
      }
      return condition.op === 'neq' && JSON.stringify(sortedValue) !== JSON.stringify(sortedTarget);
    }

    return compareScalarValue(condition.op, value, condition.value);
  });
}
