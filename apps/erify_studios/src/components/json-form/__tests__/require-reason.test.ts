import { describe, expect, it } from 'vitest';

import { type FieldItem, shouldShowReasonField } from '@eridu/api-types/task-management';

function buildField(overrides: Partial<FieldItem>): FieldItem {
  return {
    id: 'fld_reason001',
    key: 'reason_field',
    type: 'text',
    label: 'Reason field',
    required: true,
    ...overrides,
  } as FieldItem;
}

describe('shouldShowReasonField', () => {
  it.each([
    { op: 'lt' as const, value: 4, expected: true },
    { op: 'lt' as const, value: 5, expected: false },
    { op: 'lte' as const, value: 5, expected: true },
    { op: 'lte' as const, value: 6, expected: false },
    { op: 'gt' as const, value: 6, expected: true },
    { op: 'gt' as const, value: 5, expected: false },
    { op: 'gte' as const, value: 5, expected: true },
    { op: 'gte' as const, value: 4, expected: false },
    { op: 'eq' as const, value: 5, expected: true },
    { op: 'eq' as const, value: 6, expected: false },
    { op: 'neq' as const, value: 6, expected: true },
    { op: 'neq' as const, value: 5, expected: false },
  ])('evaluates number $op rule against value $value', ({ op, value, expected }) => {
    const field = buildField({
      type: 'number',
      validation: { require_reason: [{ op, value: 5 }] },
    });

    expect(shouldShowReasonField(field, value)).toBe(expected);
  });

  it.each([
    { op: 'lt' as const, value: '2026-04-30', expected: true },
    { op: 'lt' as const, value: '2026-05-01', expected: false },
    { op: 'lte' as const, value: '2026-05-01', expected: true },
    { op: 'lte' as const, value: '2026-05-02', expected: false },
    { op: 'gt' as const, value: '2026-05-02', expected: true },
    { op: 'gt' as const, value: '2026-05-01', expected: false },
    { op: 'gte' as const, value: '2026-05-01', expected: true },
    { op: 'gte' as const, value: '2026-04-30', expected: false },
    { op: 'eq' as const, value: '2026-05-01', expected: true },
    { op: 'eq' as const, value: '2026-05-02', expected: false },
    { op: 'neq' as const, value: '2026-05-02', expected: true },
    { op: 'neq' as const, value: '2026-05-01', expected: false },
    { op: 'in' as const, value: '2026-05-01', expected: true },
    { op: 'in' as const, value: '2026-05-03', expected: false },
    { op: 'not_in' as const, value: '2026-05-03', expected: true },
    { op: 'not_in' as const, value: '2026-05-01', expected: false },
  ])('evaluates date $op rule against value $value', ({ op, value, expected }) => {
    const target = op === 'in' || op === 'not_in'
      ? ['2026-05-01', '2026-05-02']
      : '2026-05-01';
    const field = buildField({
      type: 'date',
      validation: { require_reason: [{ op, value: target }] },
    });

    expect(shouldShowReasonField(field, value)).toBe(expected);
  });

  it.each([
    { type: 'select' as const, rule: [{ op: 'eq' as const, value: 'incorrect' }], value: 'incorrect', expected: true },
    { type: 'select' as const, rule: [{ op: 'eq' as const, value: 'incorrect' }], value: 'correct', expected: false },
    { type: 'select' as const, rule: [{ op: 'neq' as const, value: 'correct' }], value: 'incorrect', expected: true },
    { type: 'select' as const, rule: [{ op: 'neq' as const, value: 'correct' }], value: 'correct', expected: false },
    { type: 'multiselect' as const, rule: [{ op: 'in' as const, value: ['late', 'missing'] }], value: ['late'], expected: true },
    { type: 'multiselect' as const, rule: [{ op: 'in' as const, value: ['late', 'missing'] }], value: ['ok'], expected: false },
    { type: 'multiselect' as const, rule: [{ op: 'not_in' as const, value: ['approved'] }], value: ['late'], expected: true },
    { type: 'multiselect' as const, rule: [{ op: 'not_in' as const, value: ['approved'] }], value: ['approved'], expected: false },
  ])('evaluates $type rule against value $value', ({ type, rule, value, expected }) => {
    const field = buildField({
      type,
      validation: { require_reason: rule },
    });

    expect(shouldShowReasonField(field, value)).toBe(expected);
  });

  it.each([
    { rule: 'on-true' as const, value: true, expected: true },
    { rule: 'on-true' as const, value: false, expected: false },
    { rule: 'on-false' as const, value: false, expected: true },
    { rule: 'on-false' as const, value: true, expected: false },
    { rule: 'always' as const, value: false, expected: true },
    { rule: 'always' as const, value: true, expected: true },
  ])('evaluates checkbox $rule rule against value $value', ({ rule, value, expected }) => {
    const field = buildField({
      type: 'checkbox',
      validation: { require_reason: rule },
    });

    expect(shouldShowReasonField(field, value)).toBe(expected);
  });

  it('returns false when no require_reason rule is configured', () => {
    const field = buildField({ type: 'text' });
    expect(shouldShowReasonField(field, 'anything')).toBe(false);
  });

  it('returns false when value is empty for non-always rules', () => {
    const field = buildField({
      type: 'select',
      validation: { require_reason: [{ op: 'neq', value: 'correct' }] },
    });
    expect(shouldShowReasonField(field, '')).toBe(false);
    expect(shouldShowReasonField(field, null)).toBe(false);
    expect(shouldShowReasonField(field, undefined)).toBe(false);
  });
});
