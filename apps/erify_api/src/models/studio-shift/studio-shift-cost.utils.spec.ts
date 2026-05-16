import { Prisma } from '@prisma/client';

import {
  computeShiftCosts,
  summarizeShiftCosts,
} from './studio-shift-cost.utils';

function block(params: {
  startTime: string;
  endTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  lineItemAmounts?: ReadonlyArray<string | number>;
}) {
  return {
    startTime: new Date(params.startTime),
    endTime: new Date(params.endTime),
    actualStartTime: params.actualStartTime ? new Date(params.actualStartTime) : null,
    actualEndTime: params.actualEndTime ? new Date(params.actualEndTime) : null,
    lineItemAmounts: params.lineItemAmounts ?? [],
  };
}

describe('computeShiftCosts', () => {
  it('computes plannedCost from hourlyRate × planned block duration', () => {
    const { plannedCost, actualCost } = computeShiftCosts({
      hourlyRate: '20.00',
      blocks: [
        block({ startTime: '2026-05-16T09:00:00Z', endTime: '2026-05-16T13:00:00Z' }),
      ],
      shiftLineItemAmounts: [],
    });

    expect(plannedCost.toFixed(2)).toBe('80.00');
    expect(actualCost).toBeNull();
  });

  it('returns non-null actualCost when every block has a complete actual pair', () => {
    const { actualCost } = computeShiftCosts({
      hourlyRate: '20.00',
      blocks: [
        block({
          startTime: '2026-05-16T09:00:00Z',
          endTime: '2026-05-16T13:00:00Z',
          actualStartTime: '2026-05-16T09:05:00Z',
          actualEndTime: '2026-05-16T12:35:00Z',
        }),
      ],
      shiftLineItemAmounts: [],
    });

    // Actual duration = 3h 30m = 3.5h × 20 = 70.00
    expect(actualCost?.toFixed(2)).toBe('70.00');
  });

  it('returns null actualCost when ANY block has an incomplete actual pair', () => {
    const { actualCost } = computeShiftCosts({
      hourlyRate: '20.00',
      blocks: [
        block({
          startTime: '2026-05-16T09:00:00Z',
          endTime: '2026-05-16T13:00:00Z',
          actualStartTime: '2026-05-16T09:00:00Z',
          actualEndTime: '2026-05-16T13:00:00Z',
        }),
        block({
          startTime: '2026-05-16T14:00:00Z',
          endTime: '2026-05-16T16:00:00Z',
          actualStartTime: '2026-05-16T14:00:00Z',
          actualEndTime: null,
        }),
      ],
      shiftLineItemAmounts: [],
    });

    expect(actualCost).toBeNull();
  });

  it('includes shift-level line-item amounts in both planned and actual', () => {
    const { plannedCost, actualCost } = computeShiftCosts({
      hourlyRate: '20.00',
      blocks: [
        block({
          startTime: '2026-05-16T09:00:00Z',
          endTime: '2026-05-16T11:00:00Z',
          actualStartTime: '2026-05-16T09:00:00Z',
          actualEndTime: '2026-05-16T11:00:00Z',
        }),
      ],
      shiftLineItemAmounts: ['25.00', '-10.00'],
    });

    // 2h × 20 = 40, + 25 - 10 = 55.00 for both
    expect(plannedCost.toFixed(2)).toBe('55.00');
    expect(actualCost?.toFixed(2)).toBe('55.00');
  });

  it('includes block-level line-item amounts in both planned and actual', () => {
    const { plannedCost, actualCost } = computeShiftCosts({
      hourlyRate: '15.00',
      blocks: [
        block({
          startTime: '2026-05-16T09:00:00Z',
          endTime: '2026-05-16T11:00:00Z',
          actualStartTime: '2026-05-16T09:00:00Z',
          actualEndTime: '2026-05-16T11:00:00Z',
          lineItemAmounts: ['7.50'],
        }),
        block({
          startTime: '2026-05-16T12:00:00Z',
          endTime: '2026-05-16T13:00:00Z',
          actualStartTime: '2026-05-16T12:00:00Z',
          actualEndTime: '2026-05-16T13:00:00Z',
          lineItemAmounts: ['-2.50'],
        }),
      ],
      shiftLineItemAmounts: [],
    });

    // (2 + 1)h × 15 = 45, + 7.50 - 2.50 = 50.00
    expect(plannedCost.toFixed(2)).toBe('50.00');
    expect(actualCost?.toFixed(2)).toBe('50.00');
  });

  it('accepts Prisma.Decimal inputs for hourlyRate and line items', () => {
    const { plannedCost } = computeShiftCosts({
      hourlyRate: new Prisma.Decimal('33.33'),
      blocks: [
        block({ startTime: '2026-05-16T09:00:00Z', endTime: '2026-05-16T12:00:00Z' }),
      ],
      shiftLineItemAmounts: [new Prisma.Decimal('1.01')],
    });

    expect(plannedCost.toFixed(2)).toBe('101.00');
  });

  it('handles a planned-duration zero-block edge case', () => {
    const { plannedCost } = computeShiftCosts({
      hourlyRate: '20.00',
      blocks: [
        block({
          startTime: '2026-05-16T09:00:00Z',
          endTime: '2026-05-16T09:00:00Z',
          lineItemAmounts: ['5.00'],
        }),
      ],
      shiftLineItemAmounts: [],
    });

    expect(plannedCost.toFixed(2)).toBe('5.00');
  });
});

describe('summarizeShiftCosts', () => {
  it('returns zeros for an empty input', () => {
    const summary = summarizeShiftCosts([]);

    expect(summary.totalPlanned.toFixed(2)).toBe('0.00');
    expect(summary.totalActual.toFixed(2)).toBe('0.00');
    expect(summary.resolvedShiftCount).toBe(0);
    expect(summary.pendingShiftCount).toBe(0);
  });

  it('sums planned across all shifts and actual across resolved shifts only', () => {
    const summary = summarizeShiftCosts([
      { plannedCost: new Prisma.Decimal('80.00'), actualCost: new Prisma.Decimal('75.00') },
      { plannedCost: new Prisma.Decimal('40.00'), actualCost: null },
      { plannedCost: new Prisma.Decimal('100.00'), actualCost: new Prisma.Decimal('100.00') },
    ]);

    expect(summary.totalPlanned.toFixed(2)).toBe('220.00');
    // 75 + 100 = 175; the null-actual shift contributes 0 to total but +1 to pending
    expect(summary.totalActual.toFixed(2)).toBe('175.00');
    expect(summary.resolvedShiftCount).toBe(2);
    expect(summary.pendingShiftCount).toBe(1);
  });

  it('keeps totalActual non-null even when every shift is pending', () => {
    const summary = summarizeShiftCosts([
      { plannedCost: new Prisma.Decimal('40.00'), actualCost: null },
      { plannedCost: new Prisma.Decimal('60.00'), actualCost: null },
    ]);

    expect(summary.totalPlanned.toFixed(2)).toBe('100.00');
    expect(summary.totalActual.toFixed(2)).toBe('0.00');
    expect(summary.resolvedShiftCount).toBe(0);
    expect(summary.pendingShiftCount).toBe(2);
  });
});
