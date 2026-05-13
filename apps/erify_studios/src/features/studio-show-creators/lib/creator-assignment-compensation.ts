import { CREATOR_COMPENSATION_TYPE, type CreatorCompensationType } from '@eridu/api-types/creators';
import type { StudioShowCreatorAssignmentItemInput } from '@eridu/api-types/studio-creators';

import {
  type StudioCreatorCompensationTypeOption,
  UNSET_COMPENSATION_TYPE,
} from '@/features/studio-creator-roster/lib/studio-creator-compensation';

export type CreatorAssignmentCompensationDraft = {
  creatorId: string;
  compensationType: StudioCreatorCompensationTypeOption;
  agreedRate: string;
  commissionRate: string;
  initialItemAmount: string;
  initialItemType: 'BONUS' | 'ALLOWANCE' | 'OVERTIME' | 'DEDUCTION' | 'OTHER';
  initialItemReason: string;
};

function parseOptionalNumber(value: string, fieldLabel: string, min = 0): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < min) {
    throw new Error(`${fieldLabel} must be ${min > 0 ? 'a positive' : 'a non-negative'} number`);
  }

  return parsed;
}

function normalizeCompensationType(
  value: StudioCreatorCompensationTypeOption,
): CreatorCompensationType | null {
  return value === UNSET_COMPENSATION_TYPE ? null : value;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function buildShowCreatorAssignmentInput(
  draft: CreatorAssignmentCompensationDraft,
): StudioShowCreatorAssignmentItemInput {
  const compensationType = normalizeCompensationType(draft.compensationType);
  const agreedRate = parseOptionalNumber(draft.agreedRate, 'Agreed rate', 0);
  const commissionRate = compensationType === CREATOR_COMPENSATION_TYPE.COMMISSION
    || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID
    ? parseOptionalNumber(draft.commissionRate, 'Commission rate', 0)
    : null;
  const initialAmount = parseOptionalNumber(draft.initialItemAmount, 'Initial item amount', 0);
  const initialReason = draft.initialItemReason.trim();

  const input: StudioShowCreatorAssignmentItemInput = {
    creator_id: draft.creatorId,
    compensation_type: compensationType,
    agreed_rate: agreedRate,
    commission_rate: commissionRate,
  };

  if (initialAmount !== null && initialReason.length > 0) {
    input.compensation_line_items = [
      {
        amount: formatMoney(initialAmount),
        item_type: draft.initialItemType,
        reason: initialReason,
      },
    ];
  }

  return input;
}
