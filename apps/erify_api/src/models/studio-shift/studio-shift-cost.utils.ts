import { Prisma } from '@prisma/client';

/**
 * Live-computed shift cost utilities.
 *
 * Phase 4 cost-model decision (docs/domain/economics-cost-model.md): `StudioShift`
 * holds no stored cost columns. `planned_cost` and `actual_cost` are derived at read
 * time from the shift's `hourly_rate`, its blocks' planned and actual block-durations,
 * and any compensation line items attached to the shift or any of its blocks.
 */

const MS_PER_HOUR = 1000 * 60 * 60;

export type BlockCostInput = {
  startTime: Date;
  endTime: Date;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  /** Amounts of line items targeting this specific block (STUDIO_SHIFT_BLOCK). Signed decimals. */
  lineItemAmounts: ReadonlyArray<Prisma.Decimal | string | number>;
};

export type ShiftCostInput = {
  hourlyRate: Prisma.Decimal | string | number;
  blocks: ReadonlyArray<BlockCostInput>;
  /** Amounts of line items targeting the shift itself (STUDIO_SHIFT). Signed decimals. */
  shiftLineItemAmounts: ReadonlyArray<Prisma.Decimal | string | number>;
};

export type ShiftCosts = {
  plannedCost: Prisma.Decimal;
  actualCost: Prisma.Decimal | null;
};

export type ShiftCostSummary = {
  totalPlanned: Prisma.Decimal;
  totalActual: Prisma.Decimal;
  resolvedShiftCount: number;
  pendingShiftCount: number;
};

function toDecimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function durationHours(start: Date, end: Date): Prisma.Decimal {
  const diffMs = end.getTime() - start.getTime();
  return new Prisma.Decimal(diffMs).dividedBy(MS_PER_HOUR);
}

function sumAmounts(
  amounts: ReadonlyArray<Prisma.Decimal | string | number>,
): Prisma.Decimal {
  return amounts.reduce<Prisma.Decimal>(
    (sum, amount) => sum.plus(toDecimal(amount)),
    new Prisma.Decimal(0),
  );
}

/**
 * Compute a shift's planned and actual cost.
 *
 * - `plannedCost` = `hourlyRate × Σ planned block-duration + Σ line-item amounts`.
 *   Always defined.
 * - `actualCost` = same formula using actual block-duration. **Null** if any block
 *   has an incomplete actual pair (one timestamp present, one missing). Mixing
 *   complete and incomplete blocks in one summed actual is misleading; "what
 *   actuals say" is either knowable or it isn't.
 *
 * Line-item amounts are flat per cost-model §1; they are summed into both totals
 * identically and never duration-scaled.
 */
export function computeShiftCosts(input: ShiftCostInput): ShiftCosts {
  const rate = toDecimal(input.hourlyRate);

  const plannedHours = input.blocks.reduce<Prisma.Decimal>(
    (sum, block) => sum.plus(durationHours(block.startTime, block.endTime)),
    new Prisma.Decimal(0),
  );

  let actualHours: Prisma.Decimal | null = new Prisma.Decimal(0);
  for (const block of input.blocks) {
    if (!block.actualStartTime || !block.actualEndTime) {
      actualHours = null;
      break;
    }
    actualHours = actualHours.plus(
      durationHours(block.actualStartTime, block.actualEndTime),
    );
  }

  const blockLineItemTotal = input.blocks.reduce<Prisma.Decimal>(
    (sum, block) => sum.plus(sumAmounts(block.lineItemAmounts)),
    new Prisma.Decimal(0),
  );
  const lineItemTotal = sumAmounts(input.shiftLineItemAmounts).plus(blockLineItemTotal);

  const plannedCost = plannedHours.times(rate).plus(lineItemTotal);
  const actualCost = actualHours === null
    ? null
    : actualHours.times(rate).plus(lineItemTotal);

  return { plannedCost, actualCost };
}

/**
 * Summarize a collection of shift costs using the partial-sum-with-counts pattern.
 *
 * Manager and self-view summary surfaces both use this shape: a non-null
 * `totalActual` (sum of resolved shifts only) plus explicit `resolvedShiftCount`
 * / `pendingShiftCount` so the UI can render `"$1,234.00 — 3 of 17 pending"`.
 *
 * This deliberately departs from cost-model §2's strict null-bubbling on
 * operational rollups in favor of cost-model §3's self-view rule
 * ("recipient totals include only countable complete-actuals rows … expose
 * pending event counts separately"), applied uniformly to both surfaces.
 */
export function summarizeShiftCosts(
  shiftCosts: ReadonlyArray<ShiftCosts>,
): ShiftCostSummary {
  let totalPlanned = new Prisma.Decimal(0);
  let totalActual = new Prisma.Decimal(0);
  let resolvedShiftCount = 0;
  let pendingShiftCount = 0;

  for (const { plannedCost, actualCost } of shiftCosts) {
    totalPlanned = totalPlanned.plus(plannedCost);
    if (actualCost === null) {
      pendingShiftCount += 1;
    } else {
      totalActual = totalActual.plus(actualCost);
      resolvedShiftCount += 1;
    }
  }

  return { totalPlanned, totalActual, resolvedShiftCount, pendingShiftCount };
}
