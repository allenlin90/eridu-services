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
    { op: 'lte' as const, value: 5, expected: true },
    { op: 'gt' as const, value: 6, expected: true },
    { op: 'gte' as const, value: 5, expected: true },
    { op: 'eq' as const, value: 5, expected: true },
    { op: 'neq' as const, value: 6, expected: true },
  ])('evaluates number $op rules', ({ op, value, expected }) => {
    const field = buildField({
      type: 'number',
      validation: { require_reason: [{ op, value: 5 }] },
    });

    expect(shouldShowReasonField(field, value)).toBe(expected);
  });

  it.each([
    { op: 'lt' as const, value: '2026-04-30', expected: true },
    { op: 'lte' as const, value: '2026-05-01', expected: true },
    { op: 'gt' as const, value: '2026-05-02', expected: true },
    { op: 'gte' as const, value: '2026-05-01', expected: true },
    { op: 'eq' as const, value: '2026-05-01', expected: true },
    { op: 'neq' as const, value: '2026-05-02', expected: true },
    { op: 'in' as const, value: '2026-05-01', expected: true },
    { op: 'not_in' as const, value: '2026-05-03', expected: true },
  ])('evaluates date $op rules', ({ op, value, expected }) => {
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
    { type: 'select' as const, rule: [{ op: 'eq' as const, value: 'incorrect' }], value: 'incorrect' },
    { type: 'select' as const, rule: [{ op: 'neq' as const, value: 'correct' }], value: 'incorrect' },
    { type: 'multiselect' as const, rule: [{ op: 'in' as const, value: ['late', 'missing'] }], value: ['late'] },
    { type: 'multiselect' as const, rule: [{ op: 'not_in' as const, value: ['approved'] }], value: ['late'] },
  ])('evaluates select and multiselect rules', ({ type, rule, value }) => {
    const field = buildField({
      type,
      validation: { require_reason: rule },
    });

    expect(shouldShowReasonField(field, value)).toBe(true);
  });

  it.each([
    { rule: 'on-true' as const, value: true },
    { rule: 'on-false' as const, value: false },
    { rule: 'always' as const, value: false },
  ])('evaluates checkbox $rule rules', ({ rule, value }) => {
    const field = buildField({
      type: 'checkbox',
      validation: { require_reason: rule },
    });

    expect(shouldShowReasonField(field, value)).toBe(true);
  });
});
