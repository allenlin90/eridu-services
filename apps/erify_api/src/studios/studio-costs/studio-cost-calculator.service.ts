import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  ShiftBlockCostDetail,
  ShowCreatorCostDetail,
} from '@eridu/api-types/costs';

import type {
  ShiftWithCostRelations,
  ShowWithCostRelations,
} from './studio-costs.repository';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';

export type ShowCostBreakdown = {
  base_subtotal: Prisma.Decimal;
  line_item_subtotal: Prisma.Decimal;
  total_cost: Prisma.Decimal | null;
  unresolved_reasons: string[];
  calculation_warnings: string[];
  actuals_source: string;
  creators: ShowCreatorCostDetail[];
};

export type ShiftCostBreakdown = {
  base_subtotal: Prisma.Decimal;
  line_item_subtotal: Prisma.Decimal;
  total_cost: Prisma.Decimal | null;
  unresolved_reasons: string[];
  calculation_warnings: string[];
  actuals_source: string;
  blocks: ShiftBlockCostDetail[];
};

/**
 * Pure cost-calculation domain logic for the studio-costs feature. Stateless
 * and dependency-free, but modelled as an injectable provider to stay
 * consistent with the codebase's DI-first service layering (so it can be
 * injected/mocked like any other collaborator).
 */
@Injectable()
export class StudioCostCalculatorService {
  calculateShowCost(show: ShowWithCostRelations): ShowCostBreakdown {
    const unresolved_reasons: string[] = [];
    const calculation_warnings: string[] = [];
    let actuals_source = 'PLANNED';

    // Time-based actual source check
    if (show.actualStartTime && show.actualEndTime) {
      const metadataObj = (show.metadata as Record<string, any> | null) ?? {};
      const sources = metadataObj.actuals_source ?? {};
      if (sources.actual_start_time === 'MANAGER' || sources.actual_end_time === 'MANAGER') {
        actuals_source = 'MANAGER_OVERRIDE';
      } else if (sources.actual_start_time === 'PLATFORM' || sources.actual_end_time === 'PLATFORM') {
        actuals_source = 'PLATFORM_DATA';
      } else {
        actuals_source = 'OPERATOR_INPUT';
      }
    } else {
      actuals_source = 'PLANNED';
      if (!show.actualStartTime && !show.actualEndTime) {
        calculation_warnings.push(`show:${show.uid}:actuals_missing_using_planned`);
      } else {
        calculation_warnings.push(`show:${show.uid}:actuals_incomplete_using_planned`);
      }
    }

    let baseSubtotal = new Prisma.Decimal(0);
    const creators: ShowCreatorCostDetail[] = [];

    for (const sc of show.showCreators) {
      let scBaseAmount: Prisma.Decimal | null = null;
      let unresolvedReason: string | null = null;

      if (sc.compensationType === 'FIXED') {
        if (sc.agreedRate === null) {
          unresolvedReason = 'agreement_snapshot_missing';
          unresolved_reasons.push(`creator:${sc.creator.uid}:agreement_snapshot_missing`);
        } else {
          scBaseAmount = sc.agreedRate;
          baseSubtotal = baseSubtotal.add(sc.agreedRate);
        }
      } else if (sc.compensationType === 'HYBRID') {
        if (sc.agreedRate === null) {
          unresolvedReason = 'agreement_snapshot_missing';
          unresolved_reasons.push(`creator:${sc.creator.uid}:agreement_snapshot_missing`);
        } else {
          scBaseAmount = sc.agreedRate;
          baseSubtotal = baseSubtotal.add(sc.agreedRate);
        }
        // HYBRID always has commission which is unresolved in Phase 4
        unresolvedReason = 'commission_pending_revenue';
        unresolved_reasons.push(`creator:${sc.creator.uid}:commission_pending_revenue`);
      } else if (sc.compensationType === 'COMMISSION') {
        unresolvedReason = 'commission_pending_revenue';
        unresolved_reasons.push(`creator:${sc.creator.uid}:commission_pending_revenue`);
      } else {
        // null or unset
        unresolvedReason = 'agreement_snapshot_missing';
        unresolved_reasons.push(`creator:${sc.creator.uid}:agreement_snapshot_missing`);
      }

      // Sum creator-level line items
      let scLineItemTotal = new Prisma.Decimal(0);
      for (const target of sc.compensationLineItemTargets) {
        if (target.lineItem) {
          scLineItemTotal = scLineItemTotal.add(target.lineItem.amount);
        }
      }

      const totalAmount = unresolvedReason !== null ? null : scBaseAmount!.add(scLineItemTotal);

      creators.push({
        show_creator_uid: sc.uid,
        creator_name: sc.creator.name,
        creator_alias_name: sc.creator.aliasName,
        compensation_type: sc.compensationType,
        agreed_rate: decimalToString(sc.agreedRate),
        commission_rate: decimalToString(sc.commissionRate),
        base_amount: scBaseAmount ? decimalToString(scBaseAmount) : null,
        adjustment_total: scLineItemTotal.toFixed(2),
        total_amount: totalAmount ? decimalToString(totalAmount) : null,
        unresolved_reason: unresolvedReason,
      });
    }

    // Direct show level line items
    let showLineItemTotal = new Prisma.Decimal(0);
    for (const target of show.compensationLineItemTargets) {
      if (target.lineItem) {
        showLineItemTotal = showLineItemTotal.add(target.lineItem.amount);
      }
    }

    // Sum of creator line items
    const creatorLineItemsTotal = creators.reduce(
      (sum, c) => sum.add(new Prisma.Decimal(c.adjustment_total)),
      new Prisma.Decimal(0),
    );
    const lineItemSubtotal = showLineItemTotal.add(creatorLineItemsTotal);

    const totalCost = unresolved_reasons.length > 0 ? null : baseSubtotal.add(lineItemSubtotal);

    return {
      base_subtotal: baseSubtotal,
      line_item_subtotal: lineItemSubtotal,
      total_cost: totalCost,
      unresolved_reasons,
      calculation_warnings,
      actuals_source,
      creators,
    };
  }

  calculateShiftCost(shift: ShiftWithCostRelations): ShiftCostBreakdown {
    const unresolved_reasons: string[] = [];
    const calculation_warnings: string[] = [];
    const blockSources: string[] = [];

    let baseSubtotal = new Prisma.Decimal(0);
    const blocks: ShiftBlockCostDetail[] = [];

    for (const block of shift.blocks) {
      let durationHours = 0;
      let blockActualsSource = 'PLANNED';
      const blockWarnings: string[] = [];

      if (block.actualStartTime && block.actualEndTime) {
        durationHours = (block.actualEndTime.getTime() - block.actualStartTime.getTime()) / (1000 * 60 * 60);
        const metadataObj = (block.metadata as Record<string, any> | null) ?? {};
        const sources = metadataObj.actuals_source ?? {};
        if (sources.actual_start_time === 'MANAGER' || sources.actual_end_time === 'MANAGER') {
          blockActualsSource = 'MANAGER_OVERRIDE';
        } else if (sources.actual_start_time === 'PLATFORM' || sources.actual_end_time === 'PLATFORM') {
          blockActualsSource = 'PLATFORM_DATA';
        } else {
          blockActualsSource = 'OPERATOR_INPUT';
        }
      } else {
        blockActualsSource = 'PLANNED';
        durationHours = (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60 * 60);
        if (!block.actualStartTime && !block.actualEndTime) {
          const w = `shift_block:${block.uid}:actuals_missing_using_planned`;
          blockWarnings.push(w);
          calculation_warnings.push(w);
        } else {
          const w = `shift_block:${block.uid}:actuals_incomplete_using_planned`;
          blockWarnings.push(w);
          calculation_warnings.push(w);
        }
      }

      blockSources.push(blockActualsSource);

      const blockBaseCost = shift.hourlyRate.mul(new Prisma.Decimal(durationHours));
      baseSubtotal = baseSubtotal.add(blockBaseCost);

      // Block line items
      let blockLineItemTotal = new Prisma.Decimal(0);
      for (const target of block.compensationLineItemTargets) {
        if (target.lineItem) {
          blockLineItemTotal = blockLineItemTotal.add(target.lineItem.amount);
        }
      }

      const totalCost = blockBaseCost.add(blockLineItemTotal);

      blocks.push({
        block_uid: block.uid,
        start_time: block.startTime.toISOString(),
        end_time: block.endTime.toISOString(),
        actual_start_time: block.actualStartTime?.toISOString() ?? null,
        actual_end_time: block.actualEndTime?.toISOString() ?? null,
        duration_hours: durationHours.toFixed(2),
        line_item_subtotal: blockLineItemTotal.toFixed(2),
        total_cost: totalCost.toFixed(2),
        calculation_warnings: blockWarnings,
      });
    }

    // Shift level line items
    let shiftLineItemTotal = new Prisma.Decimal(0);
    for (const target of shift.compensationLineItemTargets) {
      if (target.lineItem) {
        shiftLineItemTotal = shiftLineItemTotal.add(target.lineItem.amount);
      }
    }

    const blocksLineItemsTotal = blocks.reduce(
      (sum, b) => sum.add(new Prisma.Decimal(b.line_item_subtotal)),
      new Prisma.Decimal(0),
    );
    const lineItemSubtotal = shiftLineItemTotal.add(blocksLineItemsTotal);

    const totalCost = unresolved_reasons.length > 0 ? null : baseSubtotal.add(lineItemSubtotal);

    // Dominant source
    let actuals_source = 'PLANNED';
    if (blockSources.includes('MANAGER_OVERRIDE')) {
      actuals_source = 'MANAGER_OVERRIDE';
    } else if (blockSources.includes('PLATFORM_DATA')) {
      actuals_source = 'PLATFORM_DATA';
    } else if (blockSources.includes('OPERATOR_INPUT')) {
      actuals_source = 'OPERATOR_INPUT';
    }

    return {
      base_subtotal: baseSubtotal,
      line_item_subtotal: lineItemSubtotal,
      total_cost: totalCost,
      unresolved_reasons,
      calculation_warnings,
      actuals_source,
      blocks,
    };
  }
}
